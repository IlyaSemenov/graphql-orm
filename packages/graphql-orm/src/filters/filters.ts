import { OrmAdapter } from "../orm/orm"
import { TableResolveContext } from "../resolvers/table"
import { is_plain_object } from "../utils/is-plain-object"

// TODO: per-field definitions
export type FiltersDef = boolean

export type FilterScalarValue = null | string | number | boolean
export type FilterValue = FilterScalarValue | Exclude<FilterScalarValue, null>[]
export type Filter = { [property: string]: FilterValue }

interface ApplyFiltersOptions<Orm extends OrmAdapter> {
	filters: FiltersDef
	modifiers?: Record<string, ApplyFiltersModifier<Orm>>
	context: TableResolveContext<Orm>
}

export type ApplyFiltersModifier<Orm extends OrmAdapter> = (
	query: Orm["Query"],
	value: any,
	context: TableResolveContext<Orm>
) => Orm["Query"]

export function apply_filters<Orm extends OrmAdapter>(
	query: Orm["Query"],
	{ filters, modifiers, context }: ApplyFiltersOptions<Orm>
): Orm["Query"] {
	if (!filters) {
		return query
	}
	const filter_obj = context.tree.args?.filter
	if (!filter_obj) {
		return query
	}
	if (!is_plain_object(filter_obj)) {
		throw new Error(`Invalid filter: ${filter_obj}, must be object.`)
	}
	for (const [field, value] of Object.entries(filter_obj)) {
		if (value === undefined) {
			// Support optional GraphQL arguments in filter
			continue
		}
		if (modifiers?.[field]) {
			query = modifiers[field](query, value, context)
		} else {
			const [table_field, op0] = field.split("__")
			const op = op0?.toLowerCase()
			// TODO: validate op
			query = context.graph.orm.where(query, table_field, op, value)
		}
	}
	return query
}
