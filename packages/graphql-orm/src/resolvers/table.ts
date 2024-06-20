import type { ApplyFiltersModifier } from "../filters/filters"
import { apply_filters } from "../filters/filters"
import type { OrmAdapter } from "../orm/orm"
import { run_after_query } from "../utils/run-after"

import type { FieldResolver } from "./field"
import { defineFieldResolver } from "./field"
import type { GraphResolveContext, GraphResolver } from "./graph"
import { defineRelationResolver } from "./relation"

export interface TableResolverOptions<Orm extends OrmAdapter, Context> {
  /** allow to resolve all table fields without explicitly listing them */
  allowAllFields?: boolean
  /** allow to filter all table fields without explicitly listing them */
  allowAllFilters?: boolean
  fields?: Record<string, SimpleFieldResolver<Orm, Context>>
  modifiers?: Record<string, ApplyFiltersModifier<Orm, Context>>
  modify?: TableResolveModifier<Orm, Context>
  transform?(instance: any, context: any): void | PromiseLike<void>
}

export type SimpleFieldResolver<Orm extends OrmAdapter, Context> =
  | true
  | string
  | FieldResolver<Orm, Context>

export type TableResolveModifier<Orm extends OrmAdapter, Context> = (
  query: Orm["Query"],
  context: TableResolveContext<Orm, Context>,
) => Orm["Query"]

export interface TableResolveContext<Orm extends OrmAdapter, Context>
  extends GraphResolveContext<Context> {
  graph: GraphResolver<Orm, Context>
  /** GraphQL type */
  type: string
}

export class TableResolver<Orm extends OrmAdapter, Context> {
  // Introspection results
  readonly relations: Set<string>
  readonly virtual_fields: Set<string>
  readonly modifiers?: Record<string, ApplyFiltersModifier<Orm, Context>>

  readonly table_field_resolvers?: Record<string, FieldResolver<Orm, Context>>

  constructor(
    readonly orm: Orm,
    readonly table: Orm["Table"],
    readonly options: TableResolverOptions<Orm, Context> = {},
  ) {
    this.relations = new Set(orm.get_table_relations(table))
    this.virtual_fields = new Set(orm.get_table_virtual_fields(table))
    this.modifiers = { ...orm.get_table_modifiers(table), ...options.modifiers }

    // Pre-create field resolvers
    const { fields } = options
    if (fields) {
      this.table_field_resolvers = Object.keys(fields).reduce<
        Record<string, FieldResolver<Orm, Context>>
      >((resolvers, field) => {
        const r0 = fields[field]
        const r: FieldResolver<Orm, Context> | undefined
          = typeof r0 === "function"
            ? r0
            : r0 === true
              ? this._get_default_field_resolver(field)
              : typeof r0 === "string"
                ? this._get_default_field_resolver(field, r0)
                : undefined
        if (r === undefined) {
          throw new Error(
            `Field resolver must be a function, string, or true; found ${typeof r0}.`,
          )
        }
        resolvers[field] = r
        return resolvers
      }, {})
    }
  }

  /** Modify query to select fields/relations and filter the result set. */
  resolve(query: Orm["Query"], context: TableResolveContext<Orm, Context>) {
    const { modify, transform } = this.options
    const { graph, tree, type, filters } = context

    const query_table = this.orm.get_query_table(query)
    const table_table = this.orm.get_table_table(this.table)

    if (query_table !== table_table) {
      throw new Error(
        `Mismatching query table for type ${type}: expected ${table_table}, received ${query_table}.`,
      )
    }

    const allow_all_fields
      = this.options.allowAllFields
      ?? graph.options.allowAllFields
      ?? !this.options.fields

    if (!allow_all_fields && !this.table_field_resolvers) {
      throw new Error(
        `Resolver for type ${type} must either allow all fields or specify options.fields.`,
      )
    }

    if (modify) {
      query = modify(query, context)
    }

    for (const subtree of Object.values(tree.fieldsByTypeName[type])) {
      const field = subtree.name
      const r: FieldResolver<Orm, Context> | undefined
        = this.table_field_resolvers?.[field]
        || (allow_all_fields ? this._get_default_field_resolver(field) : undefined)
      if (!r) {
        throw new Error(`No field resolver defined for field ${type}.${field}.`)
      }
      if (r) {
        query = r(query, { ...context, tree: subtree, field })
      }
    }

    const allow_all_filters
      = this.options.allowAllFilters ?? graph.options.allowAllFilters

    const effective_filters = allow_all_filters ? true : filters

    if (effective_filters) {
      query = apply_filters<Orm, Context>(query, {
        filters: effective_filters,
        modifiers: this.modifiers,
        context,
      })
    }

    if (transform) {
      query = run_after_query(this.orm, query, (instance) => {
        return transform(instance, context)
      })
    }

    query = this.orm.prevent_select_all(query)

    return query
  }

  /**
   * Create field resolver which will modify query to resolve GraphQL field.
   */
  _get_default_field_resolver(
    field: string,
    tableField?: string,
  ): FieldResolver<Orm, Context> {
    const table_field_lookup = tableField || field
    if (
      this.options.modifiers?.[table_field_lookup]
      || this.virtual_fields.has(table_field_lookup)
    ) {
      // Keep query as is.
      return query => query
    } else if (this.relations.has(table_field_lookup)) {
      // TODO: pre-create and cache
      return defineRelationResolver({ tableField })
    } else {
      // TODO: create simplified resolver?
      return defineFieldResolver({ tableField })
    }
  }
}
