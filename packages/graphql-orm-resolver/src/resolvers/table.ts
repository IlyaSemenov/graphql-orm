import { apply_filters, ApplyFiltersModifier } from "../filters/filters"
import { OrmAdapter } from "../orm/orm"
import { run_after_query } from "../utils/run-after"
import { defineFieldResolver, FieldResolver } from "./field"
import type { GraphResolveContext, GraphResolver } from "./graph"
import { defineRelationResolver } from "./relation"

export interface TableResolverOptions {
	/** allow to resolve all table fields without explicitly listing them */
	allowAllFields?: boolean
	/** allow to filter all table fields without explicitly listing them */
	allowAllFilters?: boolean
	fields?: Record<string, SimpleFieldResolver>
	modifiers?: Record<string, ApplyFiltersModifier>
	modify?: TableResolveModifier
	transform?(instance: any, context: any): void | PromiseLike<void>
}

export type SimpleFieldResolver = true | string | FieldResolver

export type TableResolveModifier = (
	query: unknown,
	context: TableResolveContext
) => unknown

export interface TableResolveContext extends GraphResolveContext {
	graph: GraphResolver
	/** GraphQL type */
	type: string
}

export class TableResolver {
	readonly relations: Set<string>
	readonly table_field_resolvers?: Record<string, FieldResolver>

	constructor(
		readonly orm: OrmAdapter<any, any>,
		readonly table: unknown,
		readonly options: TableResolverOptions = {}
	) {
		this.relations = new Set(orm.get_table_relations(table))

		// Pre-create field resolvers
		const { fields } = options
		if (fields) {
			this.table_field_resolvers = Object.keys(fields).reduce<
				Record<string, FieldResolver>
			>((resolvers, field) => {
				const r0 = fields[field]
				const r: FieldResolver | undefined =
					typeof r0 === "function"
						? r0
						: r0 === true
						? this._get_default_field_resolver(field)
						: typeof r0 === "string"
						? this._get_default_field_resolver(field, r0)
						: undefined
				if (r === undefined) {
					throw new Error(
						`Field resolver must be a function, string, or true; found ${typeof r0}.`
					)
				}
				resolvers[field] = r
				return resolvers
			}, {})
		}
	}

	/** Modify query to select fields/relations and filter the result set. */
	resolve(query: unknown, context: TableResolveContext) {
		const { modify, transform } = this.options
		const { graph, tree, type, filters } = context

		const query_table = context.graph.orm.get_query_table(query)
		const table_table = context.graph.orm.get_table_table(this.table)

		if (query_table !== table_table) {
			throw new Error(
				`Mismatching query table for type ${type}: expected ${table_table}, received ${query_table}.`
			)
		}

		const allow_all_fields =
			this.options.allowAllFields ??
			graph.options.allowAllFields ??
			!this.options.fields

		if (!allow_all_fields && !this.table_field_resolvers) {
			throw new Error(
				`Table resolver for ${type} must either allow all fields or specify options.fields.`
			)
		}

		if (modify) {
			query = modify(query, context)
		}

		for (const subtree of Object.values(tree.fieldsByTypeName[type])) {
			const field = subtree.name
			const r: FieldResolver | undefined =
				this.table_field_resolvers?.[field] ||
				(allow_all_fields ? this._get_default_field_resolver(field) : undefined)
			if (!r) {
				throw new Error(`No field resolver defined for field ${type}.${field}.`)
			}
			if (r) {
				query = r(query, { ...context, tree: subtree, field })
			}
		}

		const allow_all_filters =
			this.options.allowAllFilters ?? graph.options.allowAllFilters

		const effective_filters = allow_all_filters ? true : filters

		if (effective_filters) {
			query = apply_filters(query, {
				filters: effective_filters,
				modifiers: this.options.modifiers,
				context,
			})
		}

		if (transform) {
			query = run_after_query(graph.orm, query, (instance) => {
				return transform(instance, context)
			})
		}

		return query
	}

	/**
	 * Create field resolver which will modify query to resolve GraphQL field.
	 */
	_get_default_field_resolver(
		field: string,
		tableField?: string
	): FieldResolver {
		const table_field_lookup = tableField || field
		if (this.options.modifiers?.[table_field_lookup]) {
			// Keep query as is.
			return (query) => query
		} else if (this.relations.has(table_field_lookup)) {
			// TODO: pre-create and cache
			return defineRelationResolver({ tableField })
		} else {
			// TODO: create simplified resolver?
			return defineFieldResolver({ tableField })
		}
	}
}
