import { Query } from "pqb"

import { run_after_query } from "../utils/run-after"
import { TableResolveContext } from "./table"

export interface FieldResolveContext extends TableResolveContext {
	/** GraphQL field */
	field: string
}

/* A function that modifies the query to select a field. */
export type FieldResolverFn = (
	query: Query,
	context: FieldResolveContext
) => Query

export interface FieldResolverOptions {
	/** Table field (if different from GraphQL field) */
	tableField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	modify?: FieldResolverFn
	/** Post-process selected value. Return a new value or a promise. */
	transform?(value: any, instance: any, context: FieldResolveContext): any
}

export function defineFieldResolver(
	options: FieldResolverOptions = {}
): FieldResolverFn {
	const { tableField, modify, transform } = options

	return function resolve(query, context) {
		const { field } = context
		if (modify) {
			query = modify(query, context)
		} else {
			query = query.select({ [field]: tableField || field })
		}
		if (transform) {
			query = run_after_query(query, async (instance) => {
				instance[field] = await transform(instance[field], instance, context)
				return instance
			})
		}
		return query
	}
}
