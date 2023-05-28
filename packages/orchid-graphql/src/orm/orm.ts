import { OrmAdapter } from "graphql-orm-resolver"
import { overrideParserInQuery } from "orchid-core"
import { DbTable } from "orchid-orm"
import { Query } from "pqb"

export const orm: OrmAdapter<DbTable<any>, Query> = {
	get_table_table(table) {
		return table.table
	},
	get_table_relations(table) {
		return Object.keys(table.relations)
	},
	get_query_table(query) {
		if (!query.table) {
			throw new Error("Query must have table.")
		}
		return query.table
	},
	run_after_query(query, fn) {
		return query.afterQuery(async (_, result) => fn(result))
	},
	select_field(query, { field, as }) {
		return query.select({ [as]: field })
	},
	select_relation(query, { relation, as, modify }) {
		return query.select({
			[as]: (q) => {
				return modify((q as any)[relation])
			},
		})
	},
	reset_query_order(query) {
		return query.clear("order")
	},
	add_query_order(query, field, desc) {
		return query.order({ [field]: desc ? "DESC" : "ASC" })
	},
	set_query_limit(query, limit) {
		return query.limit(limit)
	},
	where(query, field, op, value) {
		return query.where({ [field]: op ? { [op]: value } : value })
	},
	where_raw(query, expression, bindings) {
		return query.where(query.raw(expression, bindings))
	},
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
	get_subquery_pagination_handler(query) {
		return (query.query as any)[s]
	},
	finish_subquery_pagination(query, field, get_page) {
		overrideParserInQuery(query.query, field, get_page as any)
		return query
	},
}

const s = Symbol("subquery_pagination_handler")
