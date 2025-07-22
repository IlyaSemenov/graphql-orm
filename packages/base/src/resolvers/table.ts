import type { FilterModifier, FilterValue } from "../filter"
import { filterQuery } from "../filter"
import type { OrmAdapter } from "../orm/orm"
import { runAfterQuery } from "../utils/run-after"

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
	modifiers?: Record<string, TableFilterModifier<Orm, Context>>
	modify?: TableResolveModifier<Orm, Context>
	transform?(instance: any, context: any): void | PromiseLike<void>
}

export type SimpleFieldResolver<Orm extends OrmAdapter, Context>
	= | true
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

export type TableFilterModifier<Orm extends OrmAdapter, Context> = FilterModifier<Orm, TableResolveContext<Orm, Context>>

export class TableResolver<Orm extends OrmAdapter, Context> {
	// Introspection results
	readonly relations: Set<string>
	readonly virtualFields: Set<string>
	readonly modifiers?: Record<string, TableFilterModifier<Orm, Context>>

	readonly tableFieldResolvers?: Record<string, FieldResolver<Orm, Context>>

	constructor(
		readonly orm: Orm,
		readonly table: Orm["Table"],
		readonly options: TableResolverOptions<Orm, Context> = {},
	) {
		this.relations = new Set(orm.getTableRelations(table))
		this.virtualFields = new Set(orm.getTableVirtualFields(table))
		this.modifiers = { ...orm.getTableModifiers(table), ...options.modifiers }

		// Pre-create field resolvers
		const { fields } = options
		if (fields) {
			this.tableFieldResolvers = Object.keys(fields).reduce<
				Record<string, FieldResolver<Orm, Context>>
			>((resolvers, field) => {
				const r0 = fields[field]
				const r: FieldResolver<Orm, Context> | undefined
					= typeof r0 === "function"
						? r0
						: r0 === true
							? this._getDefaultFieldResolver(field)
							: typeof r0 === "string"
								? this._getDefaultFieldResolver(field, r0)
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

		const queryTable = this.orm.getQueryTable(query)
		const tableName = this.orm.getTableName(this.table)

		if (queryTable !== tableName) {
			throw new Error(
				`Mismatching query table for type ${type}: expected ${tableName}, received ${queryTable}.`,
			)
		}

		const allowAllFields
			= this.options.allowAllFields
				?? graph.options.allowAllFields
				?? !this.options.fields

		if (!allowAllFields && !this.tableFieldResolvers) {
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
				= this.tableFieldResolvers?.[field]
					|| (allowAllFields ? this._getDefaultFieldResolver(field) : undefined)
			if (!r) {
				throw new Error(`No field resolver defined for field ${type}.${field}.`)
			}
			if (r) {
				query = r(query, { ...context, tree: subtree, field })
			}
		}

		const filter = context.tree.args?.filter
		if (filter) {
			const allowAllFilters = this.options.allowAllFilters ?? graph.options.allowAllFilters
			const filterConfig = allowAllFilters ? true : filters

			if (filterConfig) {
				query = filterQuery<Orm, TableResolveContext<Orm, Context>>(context.graph.orm, query, filter as FilterValue, {
					modifiers: this.modifiers,
					context,
				})
			}
		}

		if (transform) {
			query = runAfterQuery(this.orm, query, (instance: any) => {
				return transform(instance, context)
			})
		}

		query = this.orm.preventSelectAll(query)

		return query
	}

	/**
	 * Create field resolver which will modify query to resolve GraphQL field.
	 */
	_getDefaultFieldResolver(
		field: string,
		tableField?: string,
	): FieldResolver<Orm, Context> {
		const tableFieldLookup = tableField || field
		if (
			this.options.modifiers?.[tableFieldLookup]
			|| this.virtualFields.has(tableFieldLookup)
		) {
			// Keep query as is.
			return query => query
		} else if (this.relations.has(tableFieldLookup)) {
			// TODO: pre-create and cache
			return defineRelationResolver({ tableField })
		} else {
			// TODO: create simplified resolver?
			return defineFieldResolver({ tableField })
		}
	}
}
