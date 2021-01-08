import { Model, QueryBuilder } from "objection"

import { FiltersDef } from "../filter"
import { async_run_after } from "../helpers/run_after"
import { PaginatorFn } from "../paginators"
import { AnyContext } from "./graph"
import { ModelFieldResolverFn } from "./model"

export interface FieldResolverOptions<M extends Model> {
	modelField?: string
	select?: FieldResolverFn<M>
	filter?: FiltersDef
	paginate?: PaginatorFn<M>
	clean?(value: any, instance: M, context: AnyContext): any
}

export type FieldResolverFn<M extends Model> = (
	query: QueryBuilder<M, any>,
	field: string,
	resolve_model_field: ModelFieldResolverFn<M>,
) => void

export function FieldResolver<M extends Model>(
	options?: FieldResolverOptions<M>,
): FieldResolverFn<M> {
	const field_options: FieldResolverOptions<M> = { ...options }

	const clean_field = field_options.clean

	return function resolve(query, field, resolve_model_field) {
		if (field_options.select) {
			field_options.select(query, field, resolve_model_field)
		} else {
			resolve_model_field({
				model_field: field_options.modelField || field,
				filter: field_options.filter,
				paginate: field_options.paginate,
			})
		}
		if (clean_field) {
			const context = query.context()
			query.runAfter(
				async_run_after(async (instance: any) => {
					if (!instance) {
						// Supposedly, single query builder returning NULL
						return instance
					}
					instance[field] = await clean_field(
						instance[field],
						instance,
						context,
					)
					return instance
				}),
			)
		}
	}
}
