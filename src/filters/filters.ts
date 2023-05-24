import { Query } from "pqb"

import { is_plain_object } from "../utils/is-plain-object"
import { Modifier } from "../utils/modifier"

// TODO: per-field definitions
export type FiltersDef = boolean

export type FilterScalarValue = null | string | number | boolean
export type FilterValue = FilterScalarValue | Exclude<FilterScalarValue, null>[]
export type Filter = { [property: string]: FilterValue }

function is_scalar(value: any) {
	return (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	)
}

export function apply_filters({
	query,
	filters,
	args,
	modifiers,
}: {
	query: Query
	filters: FiltersDef
	args?: Record<string, any>
	modifiers?: Record<string, Modifier>
}) {
	if (!filters) {
		return query
	}
	const filter_obj = args?.filter
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
			query = modifiers[field](query, value)
		} else {
			// Normal filter
			const [dbfield, op0] = field.split("__")
			const op = op0?.toLowerCase() || "exact"
			if (
				// TODO: add the rest of orchid ops (or allow all of them?)
				[
					"exact",
					"lt",
					"lte",
					"gt",
					"gte",
					"like",
					"ilike",
					"contains",
				].includes(op)
			) {
				if (!is_scalar(value)) {
					throw new Error(
						`Unsupported filter value for ${query.table}.${field}: must be scalar.`
					)
				}
				if (op === "exact") {
					query = query.where({ [dbfield]: value })
				} else {
					const query_op = { like: "contains" }[op] || op
					query = query.where({ [dbfield]: { [query_op]: value } })
				}
			} else if (op === "in") {
				if (!(Array.isArray(value) && value.every(is_scalar))) {
					throw new Error(
						`Invalid filter value for ${query.table}.${field}: must be an array of scalars.`
					)
				}
				query = query.whereIn(dbfield, value)
			} else {
				throw new Error(
					`Invalid filter ${query.table}.${field}: unsupported operator ${op}.`
				)
			}
		}
	}
	return query
}
