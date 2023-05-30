import { TableResolver, TableResolverOptions } from "graphql-orm"
import { Model, ModelConstructor } from "objection"

import { ObjectionOrm, orm } from "../orm/orm"

export function defineModelResolver<M extends Model>(
	model: ModelConstructor<M>,
	options: TableResolverOptions<ObjectionOrm> = {} // TODO: pass M
) {
	return new TableResolver(orm, model, options)
}
