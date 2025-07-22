import type {
	FilterModifier as _FilterModifier,
	FilterModifiers as _FilterModifiers,
	FilterQueryOptions as _FilterQueryOptions,
	FilterValue,
} from "graphql-orm"
import { filterQuery as _filterQuery } from "graphql-orm"
import type { AnyQueryBuilder } from "objection"

import { orm } from "./orm/orm"
import type { ObjectionOrm } from "./orm/orm"

export { FilterValue }

export type FilterQueryOptions<Context = undefined> = _FilterQueryOptions<ObjectionOrm, Context>

export type FilterModifier<Context = undefined> = _FilterModifier<ObjectionOrm, Context>
export type FilterModifiers<Context = undefined> = _FilterModifiers<ObjectionOrm, Context>

export function filterQuery<Q extends AnyQueryBuilder, Context = undefined>(
	qb: Q,
	filter: FilterValue,
	options?: FilterQueryOptions<Context>,
): Q {
	const modifiers = orm.getTableModifiers(qb.modelClass())
	return _filterQuery(orm, qb, filter, {
		...options,
		modifiers: {
			...modifiers,
			...options?.modifiers,
		},
	} as FilterQueryOptions<Context>) as Q
}
