import { ResolveTree } from "graphql-parse-resolve-info"
import {
	Model,
	ModelClass,
	ModelConstructor,
	QueryBuilder,
	ref,
	RelationMappings,
} from "objection"

import { FiltersDef } from "../filter"
import { run_after } from "../helpers/run_after"
import { PaginatorFn } from "../paginators"
import { FieldResolver, FieldResolverFn } from "./field"
import { ResolveTreeFn } from "./graph"

export interface ModelResolverOptions<M extends Model> {
	modifier?: Modifier<M>
	fields?: Record<string, SimpleFieldResolver<M>> | true
}

export type Modifier<M extends Model> = (qb: QueryBuilder<M, any>) => void

export type SimpleFieldResolver<M extends Model> =
	| true
	| string
	| FieldResolverFn<M>

export type ModelResolverFn<M extends Model = Model> = (args: {
	tree: ResolveTree
	type: string
	query: QueryBuilder<M, any>
	resolve_tree: ResolveTreeFn
}) => void

export type ModelFieldResolverFn<M extends Model> = (args: {
	model_field: string
	filter?: FiltersDef
	paginate?: PaginatorFn<M>
}) => void

export function ModelResolver<M extends Model = Model>(
	model_class: ModelConstructor<M>,
	options?: ModelResolverOptions<M>,
): ModelResolverFn<M> {
	const model_options: ModelResolverOptions<M> = {
		// inject defaults here
		fields: true,
		...options,
	}

	const ThisModel = model_class as ModelClass<M>

	// Pull the list of getter names from Model
	// see https://stackoverflow.com/a/39310917/189806
	const getter_names = new Set(
		Object.entries(Object.getOwnPropertyDescriptors(ThisModel.prototype))
			.filter(([, descriptor]) => typeof descriptor.get === "function")
			.map(([key]) => key),
	)

	// List of model relations
	// Static-cast the value to RelationMappings, because if it was a thunk, it has been already resolved by now.
	const relations = ThisModel.relationMappings as RelationMappings

	// Default field resolver
	const resolve_field: FieldResolverFn<M> = FieldResolver()

	// Per-field resolvers
	const field_resolvers: Record<string, FieldResolverFn<M>> | null =
		model_options.fields === true ? null : {}
	if (field_resolvers) {
		const fields = model_options.fields as Record<string, FieldResolverFn<M>>
		for (const field of Object.keys(fields)) {
			const r0 = fields[field]
			let r: FieldResolverFn<M>
			if (typeof r0 === "function") {
				r = r0
			} else if (r0 === true) {
				r = resolve_field
			} else if (typeof r0 === "string") {
				r = FieldResolver({ modelField: r0 })
			} else {
				throw new Error(
					`Field resolver must be a function, string, or true; found ${r0}`,
				)
			}
			field_resolvers[field] = r
		}
	}

	return function resolve({ tree, type, query, resolve_tree }) {
		const ThisModel = query.modelClass()
		if (model_class !== (ThisModel as ModelConstructor<Model>)) {
			throw new Error(
				`Mismatching query model for ${type} model resolver (expected ${model_class}, found ${ThisModel})`,
			)
		}

		if (model_options.modifier) {
			model_options.modifier(query)
		}

		for (const subtree of Object.values(tree.fieldsByTypeName[type])) {
			const field = subtree.name
			const r = field_resolvers ? field_resolvers[field] : resolve_field
			if (!r) {
				throw new Error(`No field resolver defined for field ${type}.${field}`)
			}

			// Base model field resolver
			const resolve_model_field: ModelFieldResolverFn<M> = ({
				model_field,
				filter,
				paginate,
			}) => {
				if (getter_names.has(field)) {
					// Do nothing
				} else if (relations[model_field]) {
					// Nested relation
					if (paginate) {
						// withGraphFetched will disregard paginator's runAfter callback (which converts object list into cursor and nodes)
						// Save it locally and then re-inject
						let paginated_results: any
						query
							.withGraphFetched(`${model_field}(${field}) as ${field}`, {
								joinOperation: "leftJoin", // Remove after https://github.com/Vincit/objection.js/issues/1954 is fixed
								maxBatchSize: 1,
							})
							.modifiers({
								[field]: (subquery) => {
									resolve_tree({
										tree: subtree,
										query: subquery,
										filter,
										paginate,
									})
									subquery.runAfter((results) => {
										// Save paginated results
										paginated_results = results
									})
								},
							})
						query.runAfter(
							// Re-inject paginated results
							// They have been overwritten by objection.js by now
							run_after((instance) => {
								instance[field] = paginated_results
								return instance
							}),
						)
					} else {
						query
							.withGraphFetched(`${model_field}(${field}) as ${field}`)
							.modifiers({
								[field]: (subquery) =>
									resolve_tree({ tree: subtree, query: subquery, filter }),
							})
					}
				} else {
					// Normal field - select() it
					query.select(
						field === model_field ? field : ref(model_field).as(field),
					)
				}
			}

			r(query, field, resolve_model_field)
		}

		if (
			!query.has(
				((op: any) =>
					op.name === "select" && op.args[0] === ThisModel.idColumn) as any,
			)
		) {
			// Always select ID:
			// 1. This is useful for potential $query()
			// 2. This avoid automatic "select *" when not a single normal field was selected
			query.select(ThisModel.idColumn)
		}
	}
}
