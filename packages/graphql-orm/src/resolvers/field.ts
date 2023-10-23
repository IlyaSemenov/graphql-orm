import { OrmAdapter } from "../orm/orm"
import { run_after_query } from "../utils/run-after"
import { TableResolveContext } from "./table"

export interface FieldResolverOptions<Orm extends OrmAdapter, Context> {
	/** Table field (if different from GraphQL field) */
	tableField?: string
	/** Legacy alias for `tableField`. */
	modelField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	modify?: FieldResolveModifier<Orm, Context>
	/** Post-process selected value. Return a new value or a promise. */
	transform?(
		value: any,
		instance: any,
		context: FieldResolveContext<Orm, Context>
	): any
}

export type FieldResolveModifier<Orm extends OrmAdapter, Context> = (
	query: Orm["Query"],
	context: FieldResolveContext<Orm, Context>
) => Orm["Query"]

export interface FieldResolveContext<Orm extends OrmAdapter, Context>
	extends TableResolveContext<Orm, Context> {
	/** GraphQL field */
	field: string
}

// That is a coincidence for now.
export type FieldResolver<
	Orm extends OrmAdapter,
	Context
> = FieldResolveModifier<Orm, Context>

export function parse_field_options<
	O extends Pick<FieldResolverOptions<any, any>, "modelField" | "tableField">
>(options: O): Omit<O, "modelField"> {
	const { tableField, modelField } = options
	if (tableField && modelField) {
		throw new Error(
			`Both tableField and modelField are defined. Use only one of them.`
		)
	}
	return { ...options, tableField: tableField || modelField }
}

export function defineFieldResolver<Orm extends OrmAdapter, Context>(
	options: FieldResolverOptions<Orm, Context> = {}
): FieldResolver<Orm, Context> {
	const { tableField, modify, transform } = parse_field_options(options)

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
