import type { FiltersDef } from "../filters/filters"
import type { OrmAdapter } from "../orm/orm"

import type { FieldResolver, FieldResolverOptions } from "./field"
import { parse_field_options } from "./field"
import type { TableResolveModifier } from "./table"

export interface RelationResolverOptions<Orm extends OrmAdapter, Context>
  extends Omit<FieldResolverOptions<Orm, Context>, "modify"> {
  filters?: FiltersDef
  modify?: TableResolveModifier<Orm, Context>
}

export function defineRelationResolver<Orm extends OrmAdapter, Context>(
  options: RelationResolverOptions<Orm, Context> = {},
): FieldResolver<Orm, Context> {
  const { tableField, filters, modify } = parse_field_options(options)

  return function resolve(query, context) {
    const { graph, field } = context
    return graph.orm.select_relation(query, {
      relation: tableField || field,
      as: field,
      modify(subquery) {
        subquery = graph._resolve_type(subquery, { ...context, filters })
        return modify ? modify(subquery, context) : subquery
      },
    })
  }
}
