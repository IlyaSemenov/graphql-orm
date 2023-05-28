import type { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"

import { FiltersDef } from "../filters/filters"
import { OrmAdapter } from "../orm/orm"
import { Paginator } from "../paginators/base"
import type { TableResolver, TableResolverOptions } from "./table"

export type GraphResolverOptions = Pick<
	TableResolverOptions,
	"allowAllFields" | "allowAllFilters"
>

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

export class GraphResolver<Query = unknown> {
	constructor(
		readonly orm: OrmAdapter<any, Query>,
		readonly tables: Record<string, TableResolver>,
		readonly options: GraphResolverOptions = {}
	) {}

	resolve(
		query: Query,
		{ info, context, filters }: GraphResolveOptions
	): Query {
		const tree = this._get_resolve_tree(info)
		return this._resolve_type(query, { tree, filters, context })
	}

	resolvePage(
		query: Query,
		paginator: Paginator,
		{ info, context, filters }: GraphResolveOptions
	): Query {
		const tree = this._get_resolve_tree(info)
		return this._resolve_page(query, paginator, { tree, filters, context })
	}

	_get_resolve_tree(info: GraphQLResolveInfo) {
		return parseResolveInfo(info) as ResolveTree
	}

	_resolve_type(query: Query, context: GraphResolveContext): Query {
		const { tree } = context
		const type = Object.keys(tree.fieldsByTypeName)[0]
		const table_resolver = this.tables[type]
		if (!table_resolver) {
			throw new Error(`Resolver not found for type ${type}.`)
		}
		return table_resolver.resolve(query, {
			...context,
			graph: this as any,
			tree,
			type,
		}) as Query
	}

	_resolve_page(
		query: Query,
		paginator: Paginator,
		context: GraphResolveContext
	): Query {
		let { tree } = context
		// Skip page subtree(s)
		for (const field of paginator.path) {
			const type = Object.keys(tree.fieldsByTypeName)[0]
			tree = tree.fieldsByTypeName[type][field]
			// TODO: raise exception if not found
		}
		query = this._resolve_type(query, { ...context, tree })
		return paginator.paginate(query, {
			...context,
			graph: this as any,
		}) as Query
	}
}
