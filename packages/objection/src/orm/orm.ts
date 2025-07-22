import type {
	OrmAdapter,
	OrmModifier,
	SortOrder,
} from "graphql-orm"
import { runAfterQuery } from "graphql-orm"
import type { AnyModelConstructor, AnyQueryBuilder, Model, ModelClass, RelationMappings } from "objection"
import { QueryBuilder, raw, ref } from "objection"

// Get rid of this once https://github.com/Vincit/objection.js/issues/2364 is fixed
export function fieldRef(query: AnyQueryBuilder, field: string) {
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

	getTableName(table) {
		return (table as ModelClass<Model>).tableName
	},

	getTableRelations(table) {
		// Static-cast the value to RelationMappings, because if it was a thunk, it would have been already resolved by now.
		const relations = (table as ModelClass<Model>)
			.relationMappings as RelationMappings
		return relations && Object.keys(relations)
	},

	getTableVirtualFields(table) {
		// Pull the list of getter names from Model
		// See https://stackoverflow.com/a/39310917/189806
		return Object.entries(Object.getOwnPropertyDescriptors(table.prototype))
			.filter(([, descriptor]) => typeof descriptor.get === "function")
			.map(([key]) => key)
	},

	getTableModifiers(table) {
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

	getQueryTable(query) {
		return query.modelClass().tableName
	},

	// Select

	selectField(query, { field, as }) {
		return query.select(fieldRef(query, field).as(as))
	},

	selectRelation(query, { relation, as, modify }) {
		return query
			.withGraphFetched(`${relation} as ${as}`)
			.modifyGraph(as, query => modify(query))
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

	whereRaw(query, expression, bindings) {
		return query.where(raw(expression.replace(/\$/g, ":"), bindings))
	},

	// Order & Limit

	resetQueryOrder(query) {
		return query.clearOrder()
	},

	addQueryOrder(query, { field, dir }) {
		return query.orderBy(field, dir)
	},

	getQueryOrder(query) {
		const sortOrders: SortOrder[] = []
		;(query as any).forEachOperation(/orderBy/, (op: any) => {
			if (op.name === "orderBy") {
				const [field, dir] = op.args
				sortOrders.push({ field, dir })
			}
		})
		return sortOrders
	},

	setQueryLimit(query, limit) {
		return query.limit(limit)
	},

	// Pagination helpers

	setQueryPageResult(query, getPage) {
		query.runAfter((nodes) => {
			if (!Array.isArray(nodes)) {
				throw new TypeError(`Paginator called for single result query.`)
			}
			return getPage(nodes)
		})
		return query
	},

	modifySubqueryPagination(subquery, context) {
		subquery.runAfter((results) => {
			// withGraphFetched will disregard paginator's runAfter callback (which converts object list into cursor and nodes).
			// Save the results to context and then re-inject in finishSubqueryPagination.
			context.results = results
		})
		return subquery
	},

	finishQueryPagination(query, field, context) {
		runAfterQuery(this, query, (instance) => {
			instance[field] = context.results
			return instance
		})
		return query
	},

	// Misc

	runAfterQuery(query, fn) {
		return query.runAfter(result => fn(result))
	},

	preventSelectAll(query) {
		const { idColumn } = query.modelClass()
		if (!query.has((QueryBuilder as any).SelectSelector)) {
			query.select(
				fieldRef(
					query,
					typeof idColumn === "string" ? idColumn : idColumn[0],
				),
			)
		}
		return query
	},
}
