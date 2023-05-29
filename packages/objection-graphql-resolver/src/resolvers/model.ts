import { TableResolver, TableResolverOptions } from "graphql-orm-resolver"
import { Model, ModelConstructor } from "objection"

import { orm } from "../orm/orm"

export function defineModelResolver<M extends Model>(
	model: ModelConstructor<M>,
	options: TableResolverOptions = {} // TODO: type resolver options based on M
) {
	return new TableResolver(orm, model, options)
}
