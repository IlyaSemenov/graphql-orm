import type { OrmAdapter } from "graphql-orm"
import type { Query, Table } from "orchid-orm"
import { prepareCursorPagination as prepareOrchidCursorPagination } from "orchid-pagination"

export type OrchidOrm = OrmAdapter<
	Table,
	Query,
	// TODO: Type as QueryTransform once it's published.
	Pick<Promise<any>, "then" | "catch">
>

export const orm: OrchidOrm = {
	Table: undefined as unknown as OrchidOrm["Table"],
	Query: undefined as unknown as OrchidOrm["Query"],
	QueryTransform: undefined as unknown as OrchidOrm["QueryTransform"],

	// Reflection

	getTableName(table) {
		return table.table!
	},

	getTableRelations(table) {
		return Object.keys(table.relations)
	},

	getTableVirtualFields() {
		// Not supported by Orchid.
		return []
	},

	getTableModifiers() {
		return undefined
	},

	getQueryTable(query) {
		if (!query.table) {
			throw new Error("Query must have table.")
		}
		return query.table
	},

	// Select

	selectField(query, { field, as }) {
		return query.select({ [as]: field })
	},

	selectRelation(query, { relation, as, modify }) {
		// as any casts needed in orchid-orm 1.31+
		return query.select({
			[as]: (q: any) => modify(q[relation]),
		} as any)
	},

	// Find

	where(query, field, op, value) {
		return query.where({ [field]: op ? { [op]: value } : value })
	},

	// Pagination helpers

	prepareCursorPagination(query, { cursor, fields, limit }) {
		if (fields) {
			query = query.clear("order")
			for (const { field, dir } of fields) {
				query = query.order({ [field]: dir })
			}
		}
		const prepared = prepareOrchidCursorPagination(
			query as never,
			{ limit },
			{ cursor },
		)
		return {
			query: prepared.query,
			getPage(nodes) {
				const page = prepared.finalize(nodes as never)
				return { nodes: page.items, cursor: page.nextCursor }
			},
		}
	},

	setQueryPageResult(query, get_page) {
		return query.transform(nodes => get_page(nodes as any))
	},

	modifySubqueryPagination(subquery) {
		return subquery
	},

	finishQueryPagination(query) {
		return query
	},

	// Misc

	runAfterQuery(query, fn) {
		return query.afterQuery(data => fn(data))
	},

	preventSelectAll(query) {
		// Not needed in Orchid
		return query
	},
}
