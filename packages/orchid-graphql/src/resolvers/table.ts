import { TableResolver, TableResolverOptions } from "graphql-orm"
import { DbTable } from "orchid-orm"

import { OrchidOrm, orm } from "../orm/orm"

export function defineTableResolver<Context = unknown>(
  table: DbTable<any>,
  options: TableResolverOptions<OrchidOrm, Context> = {},
) {
  return new TableResolver(orm, table, options)
}
