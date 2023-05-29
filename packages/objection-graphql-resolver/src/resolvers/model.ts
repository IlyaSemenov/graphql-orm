import { TableResolver, TableResolverOptions } from "graphql-orm-resolver"
import { Model, ModelConstructor, QueryBuilder } from "objection"

import { orm } from "../orm/orm"

export function defineModelResolver<M extends Model>(
	model: ModelConstructor<M>,
	options: TableResolverOptions<QueryBuilder<M, any>> = {}
) {
	return new TableResolver(orm, model, options)
}
