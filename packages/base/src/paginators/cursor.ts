import { Buffer } from "node:buffer"

import type { OrmAdapter, SortOrder } from "../orm/orm"

import type { PaginateContext, Paginator } from "./base"

export function defineCursorPaginator(
	options: Partial<CursorPaginatorOptions> = {},
) {
	return new CursorPaginator(options)
}

export interface CursorPaginatorOptions {
	fields?: string[]
	take?: number
}

export interface CursorPaginatorArgs {
	cursor?: string
	take?: number
}

export interface CursorPaginatorPage<M> {
	nodes: M[]
	cursor?: string
}

class CursorPaginator<Orm extends OrmAdapter, Context>
implements Paginator<Orm, Context> {
	readonly path = ["nodes"]

	readonly pageSize: number

	readonly fields?: Array<{
		name: string
		desc: boolean
	}>

	constructor(options: CursorPaginatorOptions = {}) {
		this.pageSize = options.take ?? 10
		this.fields = options.fields?.map((field) => {
			if (field.startsWith("-")) {
				return { name: field.slice(1), desc: true }
			} else {
				return { name: field, desc: false }
			}
		})
	}

	paginate(query: Orm["Query"], context: PaginateContext<Orm, Context>) {
		const { orm } = context.graph
		const { args } = context.tree

		const pageSize = (args.take as number | undefined) ?? this.pageSize
		const cursor = args.cursor as string | undefined

		const table = orm.getQueryTable(query)

		const orderFields = (
			this.fields
				? this.fields.map<SortOrder>(f => ({
						field: f.name,
						dir: f.desc ? "DESC" : "ASC",
					}))
				: orm.getQueryOrder(query)
		).map(o => ({ ...o, alias: "_order_" + o.field }))

		if (this.fields) {
			query = orm.resetQueryOrder(query)
			for (const { alias, dir } of orderFields) {
				query = orm.addQueryOrder(query, { field: alias, dir })
			}
		}

		if (!orderFields.length) {
			throw new Error("Query must be ordered.")
		}

		for (const { field, alias } of orderFields) {
			query = orm.selectField(query, { field, as: alias })
		}

		if (cursor) {
			const parsedCursor = parseCursor(cursor)
			// Prepare raw SQL.
			// For example, for (amount asc, id asc) order, that would be:
			// (amount, $id) >= ($amount, id)
			const left: string[] = []
			const right: string[] = []
			for (let i = 0; i < orderFields.length; ++i) {
				const { field, alias, dir } = orderFields[i]
				const [expressions, placeholders]
					= dir === "ASC" ? [left, right] : [right, left]
				expressions.push(`"${table}"."${field}"`)
				placeholders.push("$" + alias)
			}
			const sqlExpr = `(${left.join(",")}) > (${right.join(",")})`
			const bindings = Object.fromEntries(
				orderFields.map(({ alias }, i) => [alias, parsedCursor[i]]),
			)
			query = orm.whereRaw(query, sqlExpr, bindings)
		}
		query = orm.setQueryLimit(query, pageSize + 1)

		// TODO add support for reverse cursor, borrow implementation from orchid-pagination.
		function createNodeCursor(node: any) {
			return createCursor(
				orderFields.map(({ field, alias }) => {
					const value = node[alias]
					// TODO add support for custom serializer(s).
					if (value === undefined) {
						throw new Error(
							`Unable to create cursor: undefined field ${field} (${alias})`,
						)
					}
					return String(value)
				}),
			)
		}

		return orm.setQueryPageResult(query, (nodes) => {
			let cursor: string | undefined
			if (nodes.length > pageSize) {
				cursor = createNodeCursor(nodes[pageSize - 1])
				nodes = nodes.slice(0, pageSize)
			}
			return { nodes, cursor }
		})
	}
}

function createCursor(parts: string[]) {
	return Buffer.from(parts.map(String).join(String.fromCharCode(0))).toString(
		"base64url",
	)
}

function parseCursor(cursor: string): string[] {
	return Buffer.from(cursor, "base64url")
		.toString()
		.split(String.fromCharCode(0))
}
