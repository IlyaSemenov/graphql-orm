import type { OrmAdapter } from "../orm/orm"
import type { Paginator } from "../paginators/base"

import type { FieldResolver } from "./field"
import { parse_field_options } from "./field"
import type { RelationResolverOptions } from "./relation"

export function definePageResolver<Orm extends OrmAdapter, Context>(
  paginator: Paginator<Orm, Context>,
  options: RelationResolverOptions<Orm, Context> = {},
): FieldResolver<Orm, Context> {
  const { tableField, modify } = parse_field_options(options)

  return function resolve(query, context) {
    const { graph, field } = context
    // Objection.js requires a workaround to handle paginated content,
    // it must be saved into context and re-injected later.
    // The modify + finish is a no-op in Orchid.
    const pagination_context = {}
    query = graph.orm.select_relation(query, {
      relation: tableField || field,
      as: field,
      modify(subquery) {
        subquery = graph._resolve_page(subquery, paginator, context)
        subquery = graph.orm.modify_subquery_pagination(
          subquery,
          pagination_context,
        )
        return modify ? modify(subquery, context) : subquery
      },
    })
    query = graph.orm.finish_query_pagination(query, field, pagination_context)
    return query
  }
}
