import type { GetPageFn } from "../paginators/base"

export type OrmModifier<Orm extends OrmAdapter> = (
	query: Orm["Query"],
	...args: any[]
) => Orm["Query"]

export interface SortOrder {
	field: string
	dir: "ASC" | "DESC"
	// TODO: add nulls first/last
}

export interface OrmAdapter<Table = any, Query = any, QueryTransform = any> {
	// Types

	Table: Table
	Query: Query
	QueryTransform: QueryTransform

	// Reflection

	/** ORM table -> db table */
	getTableName(table: Table): string

	/** ORM table -> relation names */
	getTableRelations(table: Table): string[]

	/** ORM table -> virtual fields */
	getTableVirtualFields(table: Table): string[]

	getTableModifiers(
		table: Table,
	): Record<string, OrmModifier<this>> | undefined

	/** ORM query -> db table */
	getQueryTable(query: Query): string

	// Select

	selectField(query: Query, opts: { field: string, as: string }): Query

	selectRelation(
		query: Query,
		opts: {
			relation: string
			as: string
			modify: (subquery: Query) => Query
		},
	): Query

	// Find

	where(query: Query, field: string, op: string | undefined, value: any): Query

	// Pagination helpers

	prepareCursorPagination(
		query: Query,
		options: { cursor?: string, fields?: SortOrder[], limit: number },
	): { query: Query, getPage: GetPageFn }

	setQueryPageResult(query: Query, getPage: GetPageFn): QueryTransform

	modifySubqueryPagination(
		subquery: Query,
		context: Record<string, any>,
	): Query

	finishQueryPagination(
		query: Query,
		field: string,
		context: Record<string, any>,
	): Query

	// Misc

	/** Set ORM query to run callback afterwards */
	runAfterQuery(query: Query, fn: (result: any) => any): Query

	/** Prevent `SELECT *` by explicitly selecting ID */
	preventSelectAll(query: Query): Query
}
