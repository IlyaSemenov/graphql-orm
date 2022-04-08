import { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"
import { Model, ModelType, QueryBuilder, QueryContext } from "objection"

import { apply_filter, FiltersDef } from "../filter"
import { PaginatorFn } from "../paginators"
import { ModelResolverFn } from "./model"

export interface ResolverContext extends QueryContext {
	// You are welcome to augment this
}

export interface GraphResolverOptions {
	context?: (context: any) => ResolverContext
}

export interface QueryOptions<M extends Model> {
	filter?: FiltersDef
	paginate?: PaginatorFn<M>
}

export type ResolveTreeFn = <M extends Model>(args: {
	tree: ResolveTree
	query: QueryBuilder<M, any>
	filter?: FiltersDef
	paginate?: PaginatorFn<M>
}) => void

export function GraphResolver(
	model_resolvers: Record<string, ModelResolverFn<any>>,
	options?: GraphResolverOptions
) {
	const graph_options: GraphResolverOptions = { ...options }

	return function resolve<
		QB extends QueryBuilder<Model, any>,
		O extends QueryOptions<ModelType<QB>>
	>(
		context: any,
		info: GraphQLResolveInfo,
		query: QB,
		options?: O
	): O extends {
		paginate: PaginatorFn<any>
	}
		? ReturnType<O["paginate"]>
		: QB {
		const query_options: QueryOptions<ModelType<QB>> = { ...options }
		if (context) {
			query.context(
				graph_options.context ? graph_options.context(context) : context
			)
		}

		const resolve_tree: ResolveTreeFn = ({ tree, query, filter, paginate }) => {
			const { args } = tree
			let type = Object.keys(tree.fieldsByTypeName)[0]
			if (paginate) {
				// Skip page subtree(s)
				for (const field of paginate.path) {
					tree = tree.fieldsByTypeName[type][field]
					type = Object.keys(tree.fieldsByTypeName)[0]
				}
			}
			const resolve_model = model_resolvers[type]
			if (!resolve_model) {
				throw new Error(`Model resolver not found for type ${type}`)
			}
			resolve_model({ tree, type, query, resolve_tree })
			if (filter) {
				apply_filter({ query, filter, args })
			}
			if (paginate) {
				paginate(query, args)
			}
		}

		resolve_tree({
			tree: parseResolveInfo(info) as ResolveTree,
			query,
			filter: query_options.filter,
			paginate: query_options.paginate,
		})

		return query as any // I have no idea how to cast this properly.
	}
}
