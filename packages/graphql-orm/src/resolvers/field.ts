import { run_after_query } from "../utils/run-after"
import { TableResolveContext } from "./table"

export interface FieldResolverOptions<Query = unknown> {
	/** Table field (if different from GraphQL field) */
	tableField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	modify?: FieldResolveModifier<Query>
	/** Post-process selected value. Return a new value or a promise. */
	transform?(
		value: any,
		instance: any,
		context: FieldResolveContext<Query>
	): any
}

export type FieldResolveModifier<Query = unknown> = (
	query: Query,
	context: FieldResolveContext<Query>
) => Query

export interface FieldResolveContext<Query = unknown>
	extends TableResolveContext<Query> {
	/** GraphQL field */
	field: string
}

// That is a coincidence for now.
export type FieldResolver<Query = unknown> = FieldResolveModifier<Query>

export function defineFieldResolver<Query = unknown>(
	options: FieldResolverOptions<Query> = {}
): FieldResolver<Query> {
	const { tableField, modify, transform } = options

	return function resolve(query, context) {
		const { field } = context
		if (modify) {
			query = modify(query, context)
		} else {
			query = context.graph.orm.select_field(query, {
				field: tableField || field,
				as: field,
			})
		}
		if (transform) {
			query = run_after_query(context.graph.orm, query, async (instance) => {
				instance[field] = await transform(instance[field], instance, context)
				return instance
			})
		}
		return query
	}
}
