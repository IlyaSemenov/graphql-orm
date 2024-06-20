import type { TableResolverOptions } from "graphql-orm"
import { TableResolver } from "graphql-orm"
import type { AnyModelConstructor } from "objection"

import type { ObjectionOrm } from "../orm/orm"
import { orm } from "../orm/orm"

export function defineModelResolver<Context = unknown>(
  model: AnyModelConstructor,
  options: TableResolverOptions<ObjectionOrm, Context> = {}, // TODO: pass model shape
): TableResolver<ObjectionOrm, Context> {
  return new TableResolver(orm, model, options)
}
