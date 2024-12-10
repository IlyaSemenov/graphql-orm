import { OrmAdapter, SortOrder } from "graphql-orm"
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

	get_table_table(table) {
		return table.table!
	},

	get_table_relations(table) {
		return Object.keys(table.relations)
	},

	get_table_virtual_fields() {
		// Not supported by Orchid.
		return []
	},

	get_table_modifiers() {
		return undefined
	},

	get_query_table(query) {
		if (!query.table) {
			throw new Error("Query must have table.")
		}
		return query.table
	},

	// Select

	select_field(query, { field, as }) {
		return query.select({ [as]: field })
	},

	select_relation(query, { relation, as, modify }) {
		// as any casts needed in orchid-orm 1.31+
		return query.select({
			[as]: (q: any) => modify(q[relation]),
		} as any)
	},

	// Find

	where(query, field, op, value) {
		return query.where({ [field]: op ? { [op]: value } : value })
	},

	where_raw(query, expression, bindings) {
		return query.where(raw({ raw: expression, values: bindings }))
	},

	// Order & Limit

	reset_query_order(query) {
		return query.clear("order")
	},

	add_query_order(query, { field, dir }) {
		return query.order({ [field]: dir })
	},

	get_query_order(query) {
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

	set_query_limit(query, limit) {
		return query.limit(limit)
	},

	// Pagination helpers

	set_query_page_result(query, get_page) {
		return query.transform((nodes) => get_page(nodes as any))
	},

	modify_subquery_pagination(subquery) {
		return subquery
	},

	finish_query_pagination(query) {
		return query
	},

	// Misc

	run_after_query(query, fn) {
		return query.afterQuery((data) => fn(data))
	},

	prevent_select_all(query) {
		// Not needed in Orchid
		return query
	},
}
