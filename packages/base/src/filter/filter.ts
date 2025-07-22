import type { OrmAdapter } from "../orm/orm"
import { isPlainObject } from "../utils/is-plain-object"

// TODO: per-field definitions
export type FilterConfig = boolean

export type FieldFilterScalarValue = null | string | number | boolean
export type FieldFilterValue = FieldFilterScalarValue | Exclude<FieldFilterScalarValue, null>[]
export type FilterValue = { [property: string]: FieldFilterValue }

export type FilterQueryOptions<Orm extends OrmAdapter, Context = unknown> = {
	modifiers?: FilterModifiers<Orm, Context>
} & (Context extends undefined ? {
	context?: Context
} : {
	context: Context
})

export type FilterModifier<Orm extends OrmAdapter, Context> = (
	query: Orm["Query"],
	value: any,
	context: Context,
) => Orm["Query"]

export type FilterModifiers<Orm extends OrmAdapter, Context> = Record<string, FilterModifier<Orm, Context>>

export function filterQuery<Orm extends OrmAdapter, Context>(
	orm: Orm,
	query: Orm["Query"],
	filter: FilterValue,
	options?: FilterQueryOptions<Orm, Context>,
): Orm["Query"] {
	const { context, modifiers } = options ?? {}

	if (!filter) {
		return query
	}
	if (!isPlainObject(filter)) {
		throw new Error(`Invalid filter: ${filter}, must be plain object.`)
	}
	for (const [field, value] of Object.entries(filter)) {
		if (value === undefined) {
			// Support optional GraphQL arguments in filter
			continue
		}
		if (modifiers?.[field]) {
			query = modifiers[field](query, value, context!) // TODO improve types, get rid of !
		} else {
			const [tableField, op0] = field.split("__")
			const op = op0?.toLowerCase()
			// TODO: validate op
			query = orm.where(query, tableField, op, value)
		}
	}
	return query
}
