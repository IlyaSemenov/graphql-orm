import { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"
import { Query } from "pqb"

import { FiltersDef } from "../filters/filters"
import { Paginator } from "../paginators/base"
import { set_query_context } from "../utils/query-context"
import type { TableResolverFn, TableResolverOptions } from "./table"

export type GraphResolverOptions = Pick<
	TableResolverOptions,
	"allowAllFields" | "allowAllFilters"
>

export function createGraphResolver(
	types: Record<string, TableResolverFn>,
	options?: GraphResolverOptions
) {
	return new GraphResolver(types, options)
}

export interface GraphResolveOptions {
	info: GraphQLResolveInfo
	context: any
	filters?: FiltersDef
}

export class GraphResolver {
	constructor(
		public readonly tables: Record<string, TableResolverFn>,
		public readonly options: GraphResolverOptions = {}
	) {}

	resolve(query: Query, { info, context, filters }: GraphResolveOptions) {
		set_query_context(query, context)
		const tree = this._get_resolve_tree(info)
		return this._resolve_type({ query, tree, filters })
	}

	resolvePage(
		query: Query,
		paginator: Paginator,
		{ info, context, filters }: GraphResolveOptions
	) {
		set_query_context(query, context)
		const tree = this._get_resolve_tree(info)
		return this._resolve_page({ query, tree, paginator, filters })
	}

	_get_resolve_tree(info: GraphQLResolveInfo) {
		return parseResolveInfo(info) as ResolveTree
	}

	_resolve_type({
		tree,
		query,
		filters,
	}: {
		query: Query
		tree: ResolveTree
		filters?: FiltersDef
	}) {
		const type = Object.keys(tree.fieldsByTypeName)[0]
		const table_resolver = this.tables[type]
		if (!table_resolver) {
			throw new Error(`Table resolver not found for type ${type}.`)
		}
		return table_resolver({ tree, type, query, filters, graph: this })
	}

	_resolve_page({
		tree,
		query,
		paginator,
		filters,
	}: {
		query: Query
		tree: ResolveTree
		paginator: Paginator
		filters?: FiltersDef
	}) {
		const { args } = tree
		// Skip page subtree(s)
		for (const field of paginator.path) {
			const type = Object.keys(tree.fieldsByTypeName)[0]
			tree = tree.fieldsByTypeName[type][field]
			// TODO: raise exception if not found
		}
		query = this._resolve_type({ query, tree, filters })
		return paginator.paginate(query, args)
	}
}
