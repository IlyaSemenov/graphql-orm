import { AnyQueryBuilder } from "objection"

import { is_plain_object } from "./helpers/is-plain-object"

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
			const [dbfield, op0] = field.split("__")
			const op = op0?.toLowerCase() || "exact"
			if (["exact", "lt", "lte", "gt", "gte", "like", "ilike"].includes(op)) {
				if (!is_scalar(value)) {
					throw new Error(
						`Unsupported filter value for ${table_name}.${field}: must be scalar.`
					)
				}
				if (op === "exact" && value === null) {
					query.whereNull(dbfield)
				} else {
					const objection_op =
						{ exact: "=", lt: "<", lte: "<=", gt: ">", gte: ">=" }[op] || op
					query.where(dbfield, objection_op, value)
				}
			} else if (op === "in") {
				if (!(Array.isArray(value) && value.every(is_scalar))) {
					throw new Error(
						`Invalid filter value for ${table_name}.${field}: must be an array of scalars.`
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
