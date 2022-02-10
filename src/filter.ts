import { AnyQueryBuilder } from "objection"

import { is_plain_object } from "./helpers/is_plain_object"

// TODO: per-field definitions
export type FiltersDef = boolean

export type FilterScalarValue = null | string | number | boolean
export type FilterValue = FilterScalarValue | Exclude<FilterScalarValue, null>[]
export type Filter = { [property: string]: FilterValue }

export function apply_filter({
	query,
	filter,
	args,
}: {
	query: AnyQueryBuilder
	filter: FiltersDef
	args?: Record<string, any>
}) {
	if (!filter) {
		return
	}
	const filter_obj = args?.filter
	if (!filter_obj) {
		return
	}
	if (!is_plain_object(filter_obj)) {
		throw new Error(`Invalid filter: ${filter}, must be object.`)
	}
	const ThisModel = query.modelClass()
	const table_name = ThisModel.tableName
	for (const [field, value] of Object.entries(filter_obj)) {
		if (value === undefined) {
			// Support optional GraphQL arguments in filter
			continue
		}
		if (ThisModel.modifiers?.[field]) {
			// Call modifier
			query.modify(field, value)
		} else {
			// Normal filter
			const [dbfield, op] = field.split("__")
			if (!op || op === "exact") {
				if (
					!(
						value === null ||
						typeof value === "string" ||
						typeof value === "number"
					)
				) {
					throw new Error(`Unsupported filter value for ${table_name}.${field}`)
				}
				if (value !== null) {
					query.where(dbfield, value)
				} else {
					query.whereNull(dbfield)
				}
			} else if (op === "in") {
				if (!Array.isArray(value)) {
					throw new Error(
						`Invalid filter value for ${table_name}.${field}: must be an array.`
					)
				}
				query.whereIn(dbfield, value)
			} else {
				throw new Error(
					`Invalid filter ${table_name}.${field}: unsupported operator ${op}.`
				)
			}
		}
	}
}
