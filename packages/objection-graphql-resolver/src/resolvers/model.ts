import { TableResolver, TableResolverOptions } from "graphql-orm"
import { AnyModelConstructor } from "objection"

import { ObjectionOrm, orm } from "../orm/orm"

export function defineModelResolver<Context = unknown>(
	model: AnyModelConstructor,
	options: TableResolverOptions<ObjectionOrm, Context> = {}, // TODO: pass model shape
): TableResolver<ObjectionOrm, Context> {
	return new TableResolver(orm, model, options)
}
