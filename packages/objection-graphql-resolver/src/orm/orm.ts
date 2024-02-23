import { OrmAdapter, OrmModifier, run_after_query } from "graphql-orm"
import { QueryBuilder, raw, ref, RelationMappings } from "objection"
import { Model } from "objection"
import { AnyModelConstructor, AnyQueryBuilder, ModelClass } from "objection"

// Get rid of this once https://github.com/Vincit/objection.js/issues/2364 is fixed
export function field_ref(query: AnyQueryBuilder, field: string) {
	return ref(field).from(query.tableRefFor(query.modelClass() as typeof Model))
}

export type ObjectionOrm = OrmAdapter<
	AnyModelConstructor,
	AnyQueryBuilder,
	AnyQueryBuilder
>

export const orm: ObjectionOrm = {
	Table: undefined as unknown as ObjectionOrm["Table"],
	Query: undefined as unknown as ObjectionOrm["Query"],
	QueryTransform: undefined as unknown as ObjectionOrm["QueryTransform"],

	// Reflection

	get_table_table(table) {
		return (table as ModelClass<Model>).tableName
	},

	get_table_relations(table) {
		// Static-cast the value to RelationMappings, because if it was a thunk, it would have been already resolved by now.
		const relations = (table as ModelClass<Model>)
			.relationMappings as RelationMappings
		return relations && Object.keys(relations)
	},

	get_table_virtual_fields(table) {
		// Pull the list of getter names from Model
		// See https://stackoverflow.com/a/39310917/189806
		return Object.entries(Object.getOwnPropertyDescriptors(table.prototype))
			.filter(([, descriptor]) => typeof descriptor.get === "function")
			.map(([key]) => key)
	},

	get_table_modifiers(table) {
		const modifiers = (table as ModelClass<Model>).modifiers
		return modifiers
			? Object.entries(modifiers).reduce<
					Record<string, OrmModifier<ObjectionOrm>>
				>((modifiers, [field, modifier]) => {
					// Objection modifiers return void, convert them to return query
					if (typeof modifier === "function") {
						modifiers[field] = (query, ...args) => {
							modifier(query, ...args)
							return query
						}
					}
					return modifiers
				}, {})
			: undefined
	},

	get_query_table(query) {
		return query.modelClass().tableName
	},

	// Select

	select_field(query, { field, as }) {
		return query.select(field_ref(query, field).as(as))
	},

	select_relation(query, { relation, as, modify }) {
		return query
			.withGraphFetched(`${relation} as ${as}`)
			.modifyGraph(as, (query) => modify(query))
	},

	// Find

	where(query, field, op, value) {
		op = op
			? { equals: "=", exact: "=", lt: "<", lte: "<=", gt: ">", gte: ">=" }[
					op
				] || op
			: "="
		if (op === "=" && value === null) {
			// TODO: test if this is actually needed
			return query.whereNull(field)
		} else {
			return query.where(field, op, value)
		}
	},

	where_raw(query, expression, bindings) {
		return query.where(raw(expression.replace(/\$/g, ":"), bindings))
	},

	// Order & Limit

	reset_query_order(query) {
		return query.clearOrder()
	},

	add_query_order(query, field, desc) {
		return query.orderBy(field, desc ? "desc" : "asc")
	},

	set_query_limit(query, limit) {
		return query.limit(limit)
	},

	// Pagination helpers

	set_query_page_result(query, get_page) {
		query.runAfter((nodes) => {
			if (!Array.isArray(nodes)) {
				throw new Error(`Paginator called for single result query.`)
			}
			return get_page(nodes)
		})
		return query
	},

	modify_subquery_pagination(subquery, context) {
		subquery.runAfter((results) => {
			// withGraphFetched will disregard paginator's runAfter callback (which converts object list into cursor and nodes).
			// Save the results to context and then re-inject in finish_subquery_pagination.
			context.results = results
		})
		return subquery
	},

	finish_query_pagination(query, field, context) {
		run_after_query(this, query, (instance) => {
			instance[field] = context.results
			return instance
		})
		return query
	},

	// Misc

	run_after_query(query, fn) {
		return query.runAfter((result) => fn(result))
	},

	prevent_select_all(query) {
		const id_column = query.modelClass().idColumn
		if (!query.has((QueryBuilder as any).SelectSelector)) {
			query.select(
				field_ref(
					query,
					typeof id_column === "string" ? id_column : id_column[0],
				),
			)
		}
		return query
	},
}
