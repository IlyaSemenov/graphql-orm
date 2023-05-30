import { OrmAdapter } from "graphql-orm"
import { overrideParserInQuery } from "orchid-core"
import { DbTable } from "orchid-orm"
import { Query } from "pqb"

export type OrchidOrm = OrmAdapter<DbTable<any>, Query>

export const orm: OrchidOrm = {
	Table: undefined as unknown as OrchidOrm["Table"],
	Query: undefined as unknown as OrchidOrm["Query"],

	// Reflection

	get_table_table(table) {
		return table.table
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
		return query.select({
			[as]: (q) => modify((q as any)[relation]),
		})
	},

	// Find

	where(query, field, op, value) {
		return query.where({ [field]: op ? { [op]: value } : value })
	},

	where_raw(query, expression, bindings) {
		return query.where(query.raw(expression, bindings))
	},

	// Order & Limit

	reset_query_order(query) {
		return query.clear("order")
	},

	add_query_order(query, field, desc) {
		return query.order({ [field]: desc ? "DESC" : "ASC" })
	},

	set_query_limit(query, limit) {
		return query.limit(limit)
	},

	// Pagination helpers

	set_query_page_result(query, get_page) {
		// For root query
		const _query = query.query
		const { handleResult } = _query
		_query.handleResult = (q, result, s) => {
			const data = handleResult(q, result, s)
			// Sometimes this is called for subqueries, sometimes not.
			// TODO: investigate and use always.
			return s ? data : get_page(data as any[])
		}
		// For subqueries
		;(_query as any)[s] = get_page
		return query
	},

	modify_subquery_pagination(subquery, context) {
		context.get_page = (subquery.query as any)[s]
		return subquery
	},

	finish_query_pagination(query, field, context) {
		const { get_page } = context
		if (!get_page) {
			throw new Error(`Internal error: paginator didn't provide page callback.`)
		}
		overrideParserInQuery(query.query, field, get_page)
		return query
	},

	// Misc

	run_after_query(query, fn) {
		return query.afterQuery(async (_, result) => fn(result))
	},

	prevent_select_all(query) {
		// Not needed in Orchid
		return query
	},
}

const s = Symbol("subquery_pagination_handler")
