import { Model, QueryBuilder } from "objection"

export abstract class Paginator<M extends Model, P> {
	/** GraphQL path, for example: `["nodes"]` */
	abstract readonly path: string[]
	abstract paginate(
		query: QueryBuilder<M, M[]>,
		...args: any[]
	): QueryBuilder<M, P>
}
