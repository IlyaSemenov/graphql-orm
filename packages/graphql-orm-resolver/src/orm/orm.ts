import { GetPageFn } from "../paginators/base"

export interface OrmAdapter<Table = unknown, Query = unknown> {
	/** ORM table -> db table */
	get_table_table(table: Table): string

	/** ORM table -> relation names */
	get_table_relations(table: Table): string[]

	/** ORM query -> db table */
	get_query_table(query: Query): string

	/** Set ORM query to run callback afterwards */
	run_after_query(query: Query, fn: (result: any) => any): Query

	/** ORM query -> with selected field */
	select_field(query: Query, opts: { field: string; as: string }): Query

	/** ORM query -> with selected relation and subquery modifier attached */
	select_relation(
		query: Query,
		opts: {
			relation: string
			as: string
			modify: (subquery: Query) => Query
		}
	): Query

	// Pagination
	reset_query_order(query: Query): Query
	add_query_order(query: Query, field: string, desc: boolean): Query
	set_query_limit(query: Query, limit: number): Query
	where(query: Query, field: string, op: string | undefined, value: any): Query
	where_raw(
		query: Query,
		expression: string,
		bindings: Record<string, any>
	): Query
	set_query_page_result(query: Query, get_page: GetPageFn): Query

	// Workrounds for Orchid, see implementation
	get_subquery_pagination_handler(query: Query): GetPageFn
	finish_subquery_pagination(
		query: Query,
		field: string,
		get_page: GetPageFn
	): Query
}
