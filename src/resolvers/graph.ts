import { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"
import { AnyQueryBuilder, ModelType, QueryContext } from "objection"

import { FiltersDef } from "../filters"
import type { Paginator } from "../paginators/base"
import type { ModelResolverFn, ModelResolverOptions } from "./model"

export interface ResolverContext extends QueryContext {
	// You are welcome to augment this
}

export interface GraphResolverOptions
	extends Pick<ModelResolverOptions, "allowAllFields" | "allowAllFilters"> {
	/** convert Apollo ResolverContext into QueryResolverContext */
	context?: (context: any) => ResolverContext
}

export function create_graph_resolver(
	models: Record<string, ModelResolverFn<any>>,
	options?: GraphResolverOptions
) {
	return new GraphResolver(models, options)
}

export interface ResolveGraphOptions {
	filters?: FiltersDef
}

export class GraphResolver {
	constructor(
		public readonly modelResolvers: Record<string, ModelResolverFn<any>>,
		public readonly options: GraphResolverOptions = {}
	) {}

	resolve<QB extends AnyQueryBuilder>(
		context: any,
		info: GraphQLResolveInfo,
		query: QB,
		options: ResolveGraphOptions = {}
	): QB {
		this._set_context(query, context)
		const tree = this._get_resolve_tree(info)
		return this._resolve_model({ query, tree, filters: options.filters })
	}

	resolvePage<
		QB extends AnyQueryBuilder,
		P extends Paginator<ModelType<QB>, any>
	>(
		context: any,
		info: GraphQLResolveInfo,
		query: QB,
		paginator: P,
		options: ResolveGraphOptions = {}
	) {
		this._set_context(query, context)
		const tree = this._get_resolve_tree(info)
		return this._resolve_page({
			query,
			tree,
			paginator,
			filters: options.filters,
		})
	}

	_set_context(query: AnyQueryBuilder, context: any) {
		if (context) {
			query.context(
				this.options.context ? this.options.context(context) : context
			)
		}
	}

	_get_resolve_tree(info: GraphQLResolveInfo) {
		return parseResolveInfo(info) as ResolveTree
	}

	_resolve_model<QB extends AnyQueryBuilder>({
		tree,
		query,
		filters,
	}: {
		query: QB
		tree: ResolveTree
		filters?: FiltersDef
	}) {
		const type = Object.keys(tree.fieldsByTypeName)[0]
		const model_resolver = this.modelResolvers[type]
		if (!model_resolver) {
			throw new Error(`Model resolver not found for type ${type}`)
		}
		model_resolver({ tree, type, query, filters, graph: this })
		return query
	}

	_resolve_page<
		QB extends AnyQueryBuilder,
		P extends Paginator<ModelType<QB>, any>
	>({
		tree,
		query,
		paginator,
		filters,
	}: {
		query: QB
		tree: ResolveTree
		paginator: P
		filters?: FiltersDef
	}) {
		const { args } = tree
		// Skip page subtree(s)
		for (const field of paginator.path) {
			const type = Object.keys(tree.fieldsByTypeName)[0]
			tree = tree.fieldsByTypeName[type][field]
			// TODO: raise exception if not found
		}
		this._resolve_model({ query, tree, filters })
		return paginator.paginate(query, args)
	}
}
