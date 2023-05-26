import { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"
import { Query } from "pqb"

import { FiltersDef } from "../filters/filters"
import { Paginator } from "../paginators/base"
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

export interface GraphResolveContext {
	tree: ResolveTree
	filters?: FiltersDef
	context: any
}

export class GraphResolver {
	constructor(
		public readonly tables: Record<string, TableResolverFn>,
		public readonly options: GraphResolverOptions = {}
	) {}

	resolve(query: Query, { info, context, filters }: GraphResolveOptions) {
		const tree = this._get_resolve_tree(info)
		return this._resolve_type(query, { tree, filters, context })
	}

	resolvePage(
		query: Query,
		paginator: Paginator,
		{ info, context, filters }: GraphResolveOptions
	) {
		const tree = this._get_resolve_tree(info)
		return this._resolve_page(query, paginator, { tree, filters, context })
	}

	_get_resolve_tree(info: GraphQLResolveInfo) {
		return parseResolveInfo(info) as ResolveTree
	}

	_resolve_type(query: Query, context: GraphResolveContext) {
		const { tree } = context
		const type = Object.keys(tree.fieldsByTypeName)[0]
		const table_resolver = this.tables[type]
		if (!table_resolver) {
			throw new Error(`Table resolver not found for type ${type}.`)
		}
		return table_resolver(query, { ...context, graph: this, tree, type })
	}

	_resolve_page(
		query: Query,
		paginator: Paginator,
		context: GraphResolveContext
	) {
		let { tree } = context
		// Save pagination args
		const { args } = tree
		// Skip page subtree(s)
		for (const field of paginator.path) {
			const type = Object.keys(tree.fieldsByTypeName)[0]
			tree = tree.fieldsByTypeName[type][field]
			// TODO: raise exception if not found
		}
		query = this._resolve_type(query, { ...context, tree })
		return paginator.paginate(query, args)
	}
}
