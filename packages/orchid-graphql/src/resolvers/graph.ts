import { GraphResolver, GraphResolverOptions, TableResolver } from "graphql-orm"

import { OrchidOrm, orm } from "../orm/orm"

export function createGraphResolver<Context = unknown>(
  types: Record<string, TableResolver<OrchidOrm, Context>>,
  options?: GraphResolverOptions<OrchidOrm, Context>,
) {
  return new GraphResolver<OrchidOrm, Context>(orm, types, options)
}
