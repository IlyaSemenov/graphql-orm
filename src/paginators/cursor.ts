import { Model, QueryBuilder, raw } from "objection"

import { PaginatorFn } from "."

export interface CursorPaginatorOptions {
	fields: string[]
	take: number
}

export interface CursorPaginatorArgs {
	cursor?: string
	take?: number
}

export interface CursorPaginatorPage<M> {
	nodes: M[]
	cursor?: string
}

export function CursorPaginator<M extends Model>(
	options?: Partial<CursorPaginatorOptions>,
): PaginatorFn<M, CursorPaginatorPage<M>> {
	const paginator_options: CursorPaginatorOptions = {
		fields: ["id"],
		take: 10,
		...options,
	}

	const fields: Array<{
		name: string
		desc: boolean
	}> = paginator_options.fields.map((field) => {
		if (field.startsWith("-")) {
			return { name: field.slice(1), desc: true }
		} else {
			return { name: field, desc: false }
		}
	})

	const create_cursor = (instance: any) => {
		return JSON.stringify(
			fields.map((field) => {
				const value = instance[field.name]
				if (value === undefined) {
					throw new Error(
						`Unable to create cursor: undefined field ${field.name}`,
					)
				}
				return String(value)
			}),
		)
	}

	const set_query_cursor = (query: QueryBuilder<M, M[]>, cursor: string) => {
		const values = JSON.parse(cursor)
		type P = [string, any]
		const left: P[] = []
		const right: P[] = []
		for (let i = 0; i < fields.length; ++i) {
			const field = fields[i]
			const field_part = field.desc ? right : left
			const value_part = field.desc ? left : right
			field_part.push(["??", field.name])
			value_part.push(["?", values[i]])
		}
		const get_placeholders = (pairs: P[]) => pairs.map(([p]) => p)
		const get_values = (pairs: P[]) => pairs.map(([, v]) => v)
		const cond = raw(
			`(${get_placeholders(left).join(",")}) > (${get_placeholders(right).join(
				",",
			)})`,
			...get_values(left),
			...get_values(right),
		)
		query.where(cond)
	}

	const paginate: PaginatorFn<M, CursorPaginatorPage<M>> = (
		query: QueryBuilder<M, M[]>,
		args?: CursorPaginatorArgs,
	): QueryBuilder<M, CursorPaginatorPage<M>> => {
		const take = Number(args?.take) || paginator_options.take
		const cursor = args?.cursor

		// Set query order
		query.clearOrder()
		fields.forEach((field) =>
			query.orderBy(field.name, field.desc ? "desc" : "asc"),
		)

		if (cursor) {
			set_query_cursor(query, cursor)
		}
		query.limit(take + 1)

		query.runAfter((nodes) => {
			if (!Array.isArray(nodes)) {
				throw new Error(`Paginator called for single result query.`)
			}
			let cursor: string | undefined
			if (nodes.length > take) {
				cursor = create_cursor(nodes[take - 1])
				nodes = nodes.slice(0, take)
			}
			return { nodes, cursor }
		})
		return (query as unknown) as QueryBuilder<M, CursorPaginatorPage<M>>
	}

	paginate.path = ["nodes"]
	return paginate
}
