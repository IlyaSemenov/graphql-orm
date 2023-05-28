import { GraphResolveContext, GraphResolver } from "../resolvers/graph"

export interface Paginator {
	/** GraphQL path, for example: `["nodes"]` */
	readonly path: string[]
	paginate(query: unknown, context: PaginateContext): unknown
}

export interface PaginateContext extends GraphResolveContext {
	graph: GraphResolver
}

export type GetPageFn = (nodes: any[]) => any
