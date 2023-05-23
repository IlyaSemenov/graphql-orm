import { GraphQLResolveInfo } from "graphql"
import { Model, ModelType, QueryBuilder } from "objection"

import { FiltersDef } from "../filters/filters"
import { Paginator } from "../paginators/base"
import { create_graph_resolver, ResolverContext } from "../resolvers/graph"
import { ModelResolverFn } from "../resolvers/model"

export interface GraphResolverOptions {
	context?: (context: any) => ResolverContext
}

export interface QueryOptions<M extends Model> {
	filter?: FiltersDef
	paginate?: Paginator<M, any>
}

/** @deprecated use `r.graph()` */
export function GraphResolver(
	model_resolvers: Record<string, ModelResolverFn<any>>,
	options?: GraphResolverOptions
) {
	const graph = create_graph_resolver(model_resolvers, options)
	return function resolve<
		QB extends QueryBuilder<Model, any>,
		O extends QueryOptions<ModelType<QB>>
	>(
		ctx: any,
		info: GraphQLResolveInfo,
		query: QB,
		options?: O
	): O extends {
		paginate: Paginator<ModelType<QB>, any>
	}
		? ReturnType<O["paginate"]["paginate"]>
		: QB {
		if (options?.paginate) {
			return graph.resolvePage(ctx, info, query, options.paginate, {
				filters: options.filter,
			}) as any
		} else {
			return graph.resolve(ctx, info, query, {
				filters: options?.filter,
			}) as any
		}
	}
}
