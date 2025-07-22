import type { OrmAdapter, SortOrder } from "graphql-orm"
import type { Query, SelectQueryData, Table } from "orchid-orm"
import { raw } from "orchid-orm"

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

	whereRaw(query, expression, bindings) {
		return query.where(raw({ raw: expression, values: bindings }))
	},

	// Order & Limit

	resetQueryOrder(query) {
		return query.clear("order")
	},

	addQueryOrder(query, { field, dir }) {
		return query.order({ [field]: dir })
	},

	getQueryOrder(query) {
		return (
			(query.q as SelectQueryData).order?.flatMap<SortOrder>((orderItem) => {
				if (typeof orderItem === "string") {
					return { field: "orderItem", dir: "ASC" }
				} else if (typeof orderItem === "object") {
					return Object.entries(orderItem).map<SortOrder>(([field, order]) => {
						const [dir] = order.split(" ", 1)
						if (dir === "ASC" || dir === "DESC") {
							return { field, dir }
						} else {
							throw new Error("Unsupported order: " + order)
						}
					})
				} else {
					throw new TypeError("Unsupported order type: " + orderItem)
				}
			}) || []
		)
	},

	setQueryLimit(query, limit) {
		return query.limit(limit)
	},

	// Pagination helpers

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
