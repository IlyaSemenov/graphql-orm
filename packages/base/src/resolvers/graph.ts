import type { GraphQLResolveInfo } from "graphql"
import type { ResolveTree } from "graphql-parse-resolve-info"
import { parseResolveInfo } from "graphql-parse-resolve-info"

import type { FiltersDef } from "../filters/filters"
import type { OrmAdapter } from "../orm/orm"
import type { Paginator } from "../paginators/base"

import type { TableResolver, TableResolverOptions } from "./table"

export type GraphResolverOptions<Orm extends OrmAdapter, Context> = Pick<
	TableResolverOptions<Orm, Context>,
	"allowAllFields" | "allowAllFilters"
>

export interface GraphResolveOptions<Context> {
	info: GraphQLResolveInfo
	context: Context
	filters?: FiltersDef
	/** Subfield path if not resolving root query, e.g.: ['user'] */
	path?: string[]
}

export type GraphResolveContext<Context> = Omit<
	GraphResolveOptions<Context>,
	"info"
> & {
	tree: ResolveTree
}

export class GraphResolver<Orm extends OrmAdapter, Context> {
	constructor(
		readonly orm: Orm,
		readonly type_resolvers: Record<string, TableResolver<Orm, Context>>,
		readonly options: GraphResolverOptions<Orm, Context> = {},
	) {}

	resolve<T>(
		query: Orm["Query"],
		{ info, ...context }: GraphResolveOptions<Context>,
	): Promise<T> {
		const tree = this._get_resolve_tree(info)
		return this._resolve_type(query, { ...context, tree })
	}

	resolvePage(
		query: Orm["Query"],
		paginator: Paginator<Orm, Context>,
		{ info, ...context }: GraphResolveOptions<Context>,
	) {
		const tree = this._get_resolve_tree(info)
		return this._resolve_page(query, paginator, { ...context, tree })
	}

	_get_resolve_tree(info: GraphQLResolveInfo) {
		return parseResolveInfo(info) as ResolveTree
	}

	_resolve_type(
		query: Orm["Query"],
		context: GraphResolveContext<Context>,
	): Orm["Query"] {
		let { tree } = context
		// Dive into subtree if requested.
		if (context.path) {
			for (const field of context.path) {
				const type = Object.keys(tree.fieldsByTypeName)[0]
				tree = tree.fieldsByTypeName[type][field]
				if (!tree) {
					// This graphql field was never requested, ignore.
					// This happens when a user resolves a graph for a root subfield which was not requested by the client (and is thus not present in the tree).
					//
					// FIXME: this break typings contract. We are supposed to return a query.
					return Promise.resolve()
				}
			}
		}
		const type = Object.keys(tree.fieldsByTypeName)[0]
		const type_resolver = this.type_resolvers[type]
		if (!type_resolver) {
			throw new Error(`Resolver not found for type ${type}.`)
		}
		return type_resolver.resolve(query, {
			...context,
			graph: this,
			tree,
			type,
			path: undefined,
		})
	}

	_resolve_page(
		query: Orm["Query"],
		paginator: Paginator<Orm, Context>,
		context: GraphResolveContext<Context>,
	) {
		if (context.path) {
			// TODO: handle non-empty context.path
			throw new Error("Paginating under non-root path not yet supported.")
		}
		query = this._resolve_type(query, { ...context, path: paginator.path })
		return paginator.paginate(query, {
			...context,
			graph: this,
		})
	}
}
