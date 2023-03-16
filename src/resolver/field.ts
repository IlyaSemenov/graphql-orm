import { ResolveTree } from "graphql-parse-resolve-info"
import { Model, QueryBuilder } from "objection"

import { field_ref } from "../helpers/field_ref"
import { async_run_after } from "../helpers/run_after"
import { ResolverContext, ResolveTreeFn } from "./graph"

/* A function that modifies a query to return a field. */
export type FieldResolverFn<M extends Model> = (
	query: QueryBuilder<M, any>,
	options: {
		/** GraphQL field */
		field: string
		/** GraphQL resolve tree */
		tree: ResolveTree
		/** Current graph resolver */
		resolve_tree: ResolveTreeFn
	}
) => void

export interface FieldResolverOptions<M extends Model> {
	/** Model field (if different from GraphQL field) */
	modelField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	select?: FieldResolverFn<M>
	/** Post-process selected value. Return a new value or a promise. */
	clean?(value: any, instance: M, context: ResolverContext): any
}

export function FieldResolver<M extends Model>(
	options?: FieldResolverOptions<M>
): FieldResolverFn<M> {
	const select = options?.select
	const clean = options?.clean
	const model_field = options?.modelField

	return function resolve(query, resolve_opts) {
		const { field } = resolve_opts
		if (select) {
			select(query, resolve_opts)
		} else {
			query.select(field_ref(query, model_field || field).as(field))
		}
		if (clean) {
			const context = query.context()
			query.runAfter(
				async_run_after(async (instance: any) => {
					if (!instance) {
						// Supposedly, single query builder returning NULL
						return instance
					}
					instance[field] = await clean(instance[field], instance, context)
					return instance
				})
			)
		}
	}
}
