import { Model, ref } from "objection"

import { async_run_after } from "../helpers/run_after"
import { AnyContext } from "./graph"
import { FieldResolverFn } from "./model"

export interface FieldResolverOptions<M extends Model> {
	modelField?: string
	select?: FieldResolverFn<M>
	clean?(value: any, instance: M, context: AnyContext): any
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
			query.select(model_field ? ref(model_field).as(field) : field)
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
