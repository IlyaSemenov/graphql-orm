import { OrmAdapter } from "../orm/orm"
import { run_after_query } from "../utils/run-after"
import { TableResolveContext } from "./table"

export interface FieldResolverOptions<Orm extends OrmAdapter> {
	/** Table field (if different from GraphQL field) */
	tableField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	modify?: FieldResolveModifier<Orm>
	/** Post-process selected value. Return a new value or a promise. */
	transform?(value: any, instance: any, context: FieldResolveContext<Orm>): any
}

export type FieldResolveModifier<Orm extends OrmAdapter> = (
	query: Orm["Query"],
	context: FieldResolveContext<Orm>
) => Orm["Query"]

export interface FieldResolveContext<Orm extends OrmAdapter>
	extends TableResolveContext<Orm> {
	/** GraphQL field */
	field: string
}

// That is a coincidence for now.
export type FieldResolver<Orm extends OrmAdapter> = FieldResolveModifier<Orm>

export function defineFieldResolver<Orm extends OrmAdapter>(
	options: FieldResolverOptions<Orm> = {}
): FieldResolver<Orm> {
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
