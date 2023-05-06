import { Model } from "objection"

import { create_field_resolver, FieldResolverFn } from "../resolvers/field"
import { ResolverContext } from "../resolvers/graph"

export interface FieldResolverOptions<M extends Model> {
	/** Model field (if different from GraphQL field) */
	modelField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	select?: FieldResolverFn<M>
	/** Post-process selected value. Return a new value or a promise. */
	clean?(value: any, instance: M, context: ResolverContext): any
}

/** @deprecated use `r.field()` */
export function FieldResolver<M extends Model>(
	options: FieldResolverOptions<M> = {}
): FieldResolverFn<M> {
	return create_field_resolver({
		modelField: options.modelField,
		modify: options.select,
		transform: options.clean,
	})
}
