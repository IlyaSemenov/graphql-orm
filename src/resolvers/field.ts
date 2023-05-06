import { ResolveTree } from "graphql-parse-resolve-info"
import { Model, QueryBuilder } from "objection"

import { field_ref } from "../helpers/field-ref"
import { run_after_query } from "../helpers/run-after"
import type { GraphResolver, ResolverContext } from "./graph"

/* A function that modifies the query to select a field. */
export type FieldResolverFn<M extends Model> = (
	query: QueryBuilder<M, any>,
	options: {
		/** GraphQL field */
		field: string
		/** GraphQL resolve tree */
		tree: ResolveTree
		/** Current graph resolver */
		graph: GraphResolver
	}
) => void

export interface FieldResolverOptions<M extends Model> {
	/** Model field (if different from GraphQL field) */
	modelField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	modify?: FieldResolverFn<M>
	/** Post-process selected value. Return a new value or a promise. */
	transform?(value: any, instance: M, context: ResolverContext): any
}

export function create_field_resolver<M extends Model = Model>(
	options: FieldResolverOptions<M> = {}
): FieldResolverFn<M> {
	const { modelField, modify, transform } = options

	return function resolve(query, options) {
		const { field } = options
		if (modify) {
			modify(query, options)
		} else {
			query.select(field_ref(query, modelField || field).as(field))
		}
		if (transform) {
			const context = query.context()
			run_after_query(query, async (instance) => {
				instance[field] = await transform(instance[field], instance, context)
				return instance
			})
		}
	}
}
