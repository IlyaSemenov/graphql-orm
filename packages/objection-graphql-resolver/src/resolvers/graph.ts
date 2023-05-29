import {
	GraphResolveOptions,
	GraphResolver,
	GraphResolverOptions,
	Paginator,
	TableResolver,
} from "graphql-orm"
import { AnyQueryBuilder, Model, QueryBuilder } from "objection"

import { orm } from "../orm/orm"

export function createGraphResolver(
	types: Record<string, TableResolver<AnyQueryBuilder>>,
	options?: GraphResolverOptions<AnyQueryBuilder>
) {
	return new ObjectionGraphResolver(types, options)
}

class ObjectionGraphResolver extends GraphResolver<AnyQueryBuilder> {
	constructor(
		public readonly types: Record<string, TableResolver<AnyQueryBuilder>>,
		public readonly options: GraphResolverOptions<AnyQueryBuilder> = {}
	) {
		super(orm, types, options)
	}

	resolve<Query extends AnyQueryBuilder>(
		query: Query,
		options: GraphResolveOptions
	): Query {
		return super.resolve(query, options) as Query
	}

	resolvePage<M extends Model, Query extends QueryBuilder<M, M[]>>(
		query: Query,
		paginator: Paginator,
		options: GraphResolveOptions
	) {
		return super.resolvePage(query, paginator, options) as QueryBuilder<M, any> // FIXME: infer paginator page type
	}
}
