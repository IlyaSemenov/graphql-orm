import type { GetPageFn } from "../paginators/base"

export type OrmModifier<Orm extends OrmAdapter> = (
  query: Orm["Query"],
  ...args: any[]
) => Orm["Query"]

export interface OrmAdapter<Table = any, Query = any, QueryTransform = any> {
  // Types

  Table: Table
  Query: Query
  QueryTransform: QueryTransform

  // Reflection

  /** ORM table -> db table */
  get_table_table(table: Table): string

  /** ORM table -> relation names */
  get_table_relations(table: Table): string[]

  /** ORM table -> virtual fields */
  get_table_virtual_fields(table: Table): string[]

  get_table_modifiers(
    table: Table,
  ): Record<string, OrmModifier<this>> | undefined

  /** ORM query -> db table */
  get_query_table(query: Query): string

  // Select

  select_field(query: Query, opts: { field: string, as: string }): Query

  select_relation(
    query: Query,
    opts: {
      relation: string
      as: string
      modify: (subquery: Query) => Query
    },
  ): Query

  // Find

  where(query: Query, field: string, op: string | undefined, value: any): Query

  where_raw(
    query: Query,
    expression: string,
    bindings: Record<string, any>,
  ): Query

  // Order & Limit

  reset_query_order(query: Query): Query

  add_query_order(query: Query, field: string, desc: boolean): Query

  set_query_limit(query: Query, limit: number): Query

  // Pagination helpers

  set_query_page_result(query: Query, get_page: GetPageFn): QueryTransform

  modify_subquery_pagination(
    subquery: Query,
    context: Record<string, any>,
  ): Query

  finish_query_pagination(
    query: Query,
    field: string,
    context: Record<string, any>,
  ): Query

  // Misc

  /** Set ORM query to run callback afterwards */
  run_after_query(query: Query, fn: (result: any) => any): Query

  /** Prevent `SELECT *` by explicitly selecting ID */
  prevent_select_all(query: Query): Query
}
