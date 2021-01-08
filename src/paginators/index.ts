import { Model, QueryBuilder } from "objection"

export type PaginatorFn<M extends Model, P = any> = {
	(query: QueryBuilder<M, M[]>, args?: any): QueryBuilder<M, P>
	path: [string]
}
