import { GraphQLResolveInfo } from "graphql"
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info"
import { AnyQueryBuilder, QueryBuilder, RelationMappings } from "objection"

export type FilterNonNullScalarValue = string | number | boolean
export type FilterScalarValue = null | FilterNonNullScalarValue
export type FilterValue =
	| FilterScalarValue
	| FilterNonNullScalarValue[]
	| Filter
export type Filter = { [property: string]: FilterValue }

export type QueryModifier<QB extends QueryBuilder<any> = QueryBuilder<any>> = (
	qb: QB,
) => QB | void

export type Modifiers = {
	[type_name: string]: QueryModifier
}

export interface FetchOptions {
	filter?: Filter
	modifiers?: Modifiers
}

QueryBuilder.prototype.fetchGraphQL = function <QB extends AnyQueryBuilder>(
	this: QB,
	info: GraphQLResolveInfo,
	options?: FetchOptions,
) {
	const resolve_tree = parseResolveInfo(info) as ResolveTree
	return process_resolve_tree_node({
		query: this,
		resolve_tree,
		...options,
	})
}

function process_resolve_tree_node<QB extends AnyQueryBuilder>({
	query,
	resolve_tree,
	filter,
	modifiers,
}: {
	query: QB
	resolve_tree: ResolveTree
	filter?: Filter
	modifiers?: Modifiers
}) {
	const Model = query.modelClass()

	if (Model.modifiers?.graphQL) {
		query.modify("graphQL")
	}
	if (Model.modifiers?.graphQLMany && !query.has("first")) {
		query.modify("graphQLMany")
	}

	const type_name = Object.keys(resolve_tree.fieldsByTypeName)[0]

	const type_query_modifier = modifiers?.[type_name]
	if (type_query_modifier) {
		type_query_modifier(query)
	}

	if (filter !== undefined && !isFilterObject(filter)) {
		throw Model.createValidationError({
			type: "InvalidFilter",
			message: `Invalid filter ${type_name}: must be an object.`,
		})
	}

	// Pull the list of getters from Model
	// see https://stackoverflow.com/a/39310917/189806
	const getters = new Set(
		Object.entries(Object.getOwnPropertyDescriptors(Model.prototype))
			.filter(([, descriptor]) => typeof descriptor.get === "function")
			.map(([key]) => key),
	)

	// List of relation mappings
	// Static-cast them to RelationMappings, because thunk has already been resolved by now.
	const relations = Model.relationMappings as RelationMappings

	// Run select() and withGraphFetched() for fields requested in GraphQL query
	let has_selected_id = false
	for (const [field, resolve_subtree] of Object.entries(
		resolve_tree.fieldsByTypeName[type_name],
	)) {
		if (relations[field]) {
			// Nested relation
			query.withGraphFetched(`${field}(graphql)`).modifiers({
				graphql: (subquery) =>
					process_resolve_tree_node({
						query: subquery,
						resolve_tree: resolve_subtree,
						filter: filter?.[field] as Filter,
						modifiers,
					}),
			})
		} else if (getters.has(field)) {
			// Getter - do nothing, it will be pulled by the external graphql resolver runner
		} else {
			// Normal field - select() it
			query.select(field)
			if (field === Model.idColumn) {
				has_selected_id = true
			}
		}
	}

	if (!has_selected_id) {
		// Always select ID:
		// 1. This is useful for potential $query()
		// 2. This avoid automatic "select *" when not a single normal field is selected
		query.select(Model.idColumn)
	}

	// Add where() clauses based on the provided filter object
	if (filter) {
		for (const [field, value] of Object.entries(filter)) {
			if (value === undefined) {
				throw Model.createValidationError({
					type: "InvalidFilter",
					message: `Invalid filter ${type_name}.${field}: undefined.`,
				})
			}
			if (relations[field]) {
				// Nested field filter
				// Ignore - processed above
			} else if (Model.modifiers?.[field]) {
				// Call modifier
				query.modify(field, value)
			} else {
				// Normal filter
				if (isFilterObject(value)) {
					throw Model.createValidationError({
						type: "InvalidFilter",
						message: `Invalid filter ${type_name}.${field}: must not be an object.`,
					})
				}
				const [dbfield, op] = field.split("__")
				if (!op || op === "exact") {
					if (Array.isArray(value)) {
						throw Model.createValidationError({
							type: "InvalidFilter",
							message: `Invalid filter ${type_name}.${field}: must not be an array.`,
						})
					}
					if (value !== null) {
						query.where(dbfield, value)
					} else {
						query.whereNull(dbfield)
					}
				} else if (op === "in") {
					if (!Array.isArray(value)) {
						throw Model.createValidationError({
							type: "InvalidFilter",
							message: `Invalid filter ${type_name}.${field}: must be an array.`,
						})
					}
					query.whereIn(dbfield, value)
				} else {
					throw Model.createValidationError({
						type: "InvalidFilter",
						message: `Invalid filter ${type_name}.${field}: unsupported operator ${op}.`,
					})
				}
			}
		}
	}

	return query
}

function isFilterObject(obj: any): obj is Filter {
	return typeof obj === "object" && !Array.isArray(obj)
}
