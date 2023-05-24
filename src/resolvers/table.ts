import { ResolveTree } from "graphql-parse-resolve-info"
import { DbTable, TableClass } from "orchid-orm"
import { Query } from "pqb"

import { apply_filters, FiltersDef } from "../filters/filters"
import { Modifier } from "../utils/modifier"
import { get_query_context } from "../utils/query-context"
import { run_after_query } from "../utils/run-after"
import { defineFieldResolver, FieldResolverFn } from "./field"
import type { GraphResolver } from "./graph"
import { defineRelationResolver } from "./relation"

/** A function that modifies the query to select fields/relations and filter the result set. */
export type TableResolverFn = (args: {
	tree: ResolveTree
	/** GraphQL type */
	type: string
	query: Query
	filters?: FiltersDef
	graph: GraphResolver
}) => Query

export interface TableResolverOptions {
	/** allow to resolve all table fields without explicitly listing them */
	allowAllFields?: boolean
	/** allow to filter all table fields without explicitly listing them */
	allowAllFilters?: boolean
	fields?: Record<string, SimpleFieldResolver>
	modifiers?: Record<string, Modifier>
	modify?: QueryTreeModifier
	transform?(instance: any, context: any): void | PromiseLike<void>
}

export type SimpleFieldResolver = true | string | FieldResolverFn

export type QueryTreeModifier = (query: Query, tree: ResolveTree) => Query

export function defineTableResolver<T extends TableClass>(
	table: DbTable<T>,
	options: TableResolverOptions = {}
): TableResolverFn {
	/**
	 * Create a field resolver which will modify the query to resolve a GraphQL field.
	 */
	const get_default_field_resolver = (
		field: string,
		tableField?: string
	): FieldResolverFn | undefined => {
		const table_field_lookup = tableField || field
		if (options.modifiers?.[table_field_lookup]) {
			// Keep query as is.
			return (query) => query
		} else if ((table.relations as any)?.[table_field_lookup]) {
			return defineRelationResolver({ tableField })
		} else {
			return defineFieldResolver({ tableField })
		}
	}

	// Pre-create field resolvers
	const { fields } = options
	const table_field_resolvers = fields
		? Object.keys(fields).reduce<Record<string, FieldResolverFn>>(
				(resolvers, field) => {
					const r0 = fields[field]
					const r: FieldResolverFn | undefined =
						typeof r0 === "function"
							? r0
							: r0 === true
							? get_default_field_resolver(field)
							: typeof r0 === "string"
							? get_default_field_resolver(field, r0)
							: undefined
					if (r === undefined) {
						throw new Error(
							`Field resolver must be a function, string, or true; found ${r0}`
						)
					}
					resolvers[field] = r
					return resolvers
				},
				{}
		  )
		: undefined

	const { modify, transform } = options

	return function resolve({ tree, type, query, filters, graph }) {
		if (query.table !== table.table) {
			throw new Error(
				`Mismatching query type (expected ${table.table}, found ${query.table}).`
			)
		}

		const allow_all_fields =
			options.allowAllFields ??
			graph.options.allowAllFields ??
			table_field_resolvers === undefined

		if (!allow_all_fields && !table_field_resolvers) {
			throw new Error(
				`Table resolver for ${type} must either allow all fields or specify options.fields`
			)
		}

		if (modify) {
			query = modify(query, tree)
		}

		for (const subtree of Object.values(tree.fieldsByTypeName[type])) {
			const field = subtree.name
			const r =
				table_field_resolvers?.[field] ||
				(allow_all_fields ? get_default_field_resolver(field) : undefined)
			if (!r) {
				throw new Error(`No field resolver defined for field ${type}.${field}`)
			}
			if (r) {
				query = r(query, { field, tree: subtree, graph })
			}
		}

		const allow_all_filters =
			options.allowAllFilters ?? graph.options.allowAllFilters

		const effective_filters = allow_all_filters ? true : filters

		if (effective_filters) {
			query = apply_filters({
				query,
				filters: effective_filters,
				args: tree.args,
				modifiers: options.modifiers,
			})
		}

		if (transform) {
			const context = get_query_context(query)
			query = run_after_query(query, (instance) => {
				return transform(instance, context)
			})
		}

		return query
	}
}
