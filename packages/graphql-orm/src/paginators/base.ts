import { OrmAdapter } from "../orm/orm"
import { GraphResolveContext, GraphResolver } from "../resolvers/graph"

export interface Paginator<Orm extends OrmAdapter> {
	/** GraphQL path, for example: `["nodes"]` */
	readonly path: string[]
	paginate(query: Orm["Query"], context: PaginateContext<Orm>): Orm["Query"]
}

export interface PaginateContext<Orm extends OrmAdapter>
	extends GraphResolveContext {
	graph: GraphResolver<Orm>
}

export type GetPageFn = (nodes: any[]) => any
