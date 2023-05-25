import { Query } from "pqb"

import { Paginator, set_query_page_result } from "./base"

export function defineCursorPaginator(
	options: Partial<CursorPaginatorOptions> = {}
) {
	return new CursorPaginator(options)
}

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

class CursorPaginator implements Paginator {
	readonly path = ["nodes"]
	readonly options: CursorPaginatorOptions

	readonly fields: Array<{
		name: string
		desc: boolean
	}>

	constructor(options: Partial<CursorPaginatorOptions> = {}) {
		this.options = {
			fields: ["id"],
			take: 10,
			...options,
		}
		this.fields = this.options.fields.map((field) => {
			if (field.startsWith("-")) {
				return { name: field.slice(1), desc: true }
			} else {
				return { name: field, desc: false }
			}
		})
	}

	paginate(query: Query, args: CursorPaginatorArgs = {}) {
		const take = args.take ?? this.options.take
		const { cursor } = args

		// Set query order
		query = query.clear("order")
		for (const field of this.fields) {
			// TODO: prevent potential name clash with aliases like .as(`_${table_ref}_order_key_0`)
			query = query
				.select(field.name)
				.order({ [field.name]: field.desc ? "DESC" : "ASC" })
		}

		if (cursor) {
			query = this._set_query_cursor(query, cursor)
		}
		query = query.limit(take + 1)

		query = set_query_page_result(query, (nodes) => {
			let cursor: string | undefined
			if (nodes.length > take) {
				cursor = this._create_cursor(nodes[take - 1])
				nodes = nodes.slice(0, take)
			}
			return { nodes, cursor }
		})

		return query
	}

	_create_cursor(instance: any) {
		return JSON.stringify(
			this.fields.map((field) => {
				const value = instance[field.name]
				if (value === undefined) {
					throw new Error(
						`Unable to create cursor: undefined field ${field.name}`
					)
				}
				return String(value)
			})
		)
	}

	_set_query_cursor(query: Query, cursor: string) {
		const values = JSON.parse(cursor)
		const left: string[] = []
		const right: string[] = []
		const expr_values: Record<string, any> = {}
		// TODO: refactor
		for (let i = 0; i < this.fields.length; ++i) {
			const field = this.fields[i]
			const expressions = field.desc ? right : left
			const placeholders = field.desc ? left : right
			expressions.push(`"${field.name}"`)
			const placeholder = `value${i}`
			placeholders.push("$" + placeholder)
			expr_values[placeholder] = values[i]
		}
		return query.where(
			query.raw(`(${left.join(",")}) > (${right.join(",")})`, expr_values)
		)
	}
}
