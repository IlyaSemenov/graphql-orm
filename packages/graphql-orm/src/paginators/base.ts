import { OrmAdapter } from "../orm/orm"
import { GraphResolveContext, GraphResolver } from "../resolvers/graph"

export interface Paginator<Orm extends OrmAdapter, Context> {
	/** GraphQL path, for example: `["nodes"]` */
	readonly path: string[]
	paginate(
		query: Orm["Query"],
		context: PaginateContext<Orm, Context>,
	): Orm["QueryTransform"]
}

export interface PaginateContext<Orm extends OrmAdapter, Context>
	extends GraphResolveContext<Context> {
	graph: GraphResolver<Orm, Context>
}

export type GetPageFn = (nodes: any[]) => any
