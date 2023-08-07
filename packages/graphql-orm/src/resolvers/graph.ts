import type { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"

import { FiltersDef } from "../filters/filters"
import { OrmAdapter } from "../orm/orm"
import { Paginator } from "../paginators/base"
import type { TableResolver, TableResolverOptions } from "./table"

export type GraphResolverOptions<Orm extends OrmAdapter, Context> = Pick<
	TableResolverOptions<Orm, Context>,
	"allowAllFields" | "allowAllFilters"
>

export interface GraphResolveOptions<Context> {
	info: GraphQLResolveInfo
	context: Context
	filters?: FiltersDef
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
		readonly options: GraphResolverOptions<Orm, Context> = {}
	) {}

	resolve(
		query: Orm["Query"],
		{ info, ...context }: GraphResolveOptions<Context>
	) {
		const tree = this._get_resolve_tree(info)
		return this._resolve_type(query, { ...context, tree })
	}

	resolvePage(
		query: Orm["Query"],
		paginator: Paginator<Orm, Context>,
		{ info, ...context }: GraphResolveOptions<Context>
	) {
		const tree = this._get_resolve_tree(info)
		return this._resolve_page(query, paginator, { ...context, tree })
	}

	_get_resolve_tree(info: GraphQLResolveInfo) {
		return parseResolveInfo(info) as ResolveTree
	}

	_resolve_type(query: Orm["Query"], context: GraphResolveContext<Context>) {
		const { tree } = context
		const type = Object.keys(tree.fieldsByTypeName)[0]
		const type_resolver = this.type_resolvers[type]
		if (!type_resolver) {
			throw new Error(`Resolver not found for type ${type}.`)
		}
		return type_resolver.resolve(query, {
			...context,
			graph: this as any,
			tree,
			type,
		})
	}

	_resolve_page(
		query: Orm["Query"],
		paginator: Paginator<Orm, Context>,
		context: GraphResolveContext<Context>
	) {
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
		})
	}
}
