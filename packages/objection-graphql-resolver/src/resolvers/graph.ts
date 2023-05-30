import {
	GraphResolveOptions,
	GraphResolver,
	GraphResolverOptions,
	Paginator,
	TableResolver,
} from "graphql-orm"
import { AnyQueryBuilder, Model, QueryBuilder } from "objection"

import { ObjectionOrm, orm } from "../orm/orm"

export function createGraphResolver<Context = unknown>(
	types: Record<string, TableResolver<ObjectionOrm, Context>>,
	options?: GraphResolverOptions<ObjectionOrm, Context>
) {
	return new ObjectionGraphResolver<Context>(types, options)
}

class ObjectionGraphResolver<Context> extends GraphResolver<
	ObjectionOrm,
	Context
> {
	constructor(
		public readonly types: Record<string, TableResolver<ObjectionOrm, Context>>,
		public readonly options: GraphResolverOptions<ObjectionOrm, Context> = {}
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
		paginator: Paginator<ObjectionOrm, Context>,
		options: GraphResolveOptions
	) {
		return super.resolvePage(query, paginator, options) as QueryBuilder<M, any> // FIXME: infer paginator page type
	}
}
