import type {
	FilterModifier as _FilterModifier,
	FilterModifiers as _FilterModifiers,
	FilterQueryOptions as _FilterQueryOptions,
	FilterValue,
} from "graphql-orm"
import { filterQuery as _filterQuery } from "graphql-orm"
import type { Query } from "orchid-orm"

import { orm } from "./orm/orm"
import type { OrchidOrm } from "./orm/orm"

export { FilterValue }

export type FilterQueryOptions<Context = undefined> = _FilterQueryOptions<OrchidOrm, Context>

export type FilterModifier<Context = undefined> = _FilterModifier<OrchidOrm, Context>
export type FilterModifiers<Context = undefined> = _FilterModifiers<OrchidOrm, Context>

export function filterQuery<Q extends Query, Context = undefined>(
	query: Q,
	filter: FilterValue,
	options?: FilterQueryOptions<Context>,
): Q {
	return _filterQuery(orm, query, filter, options) as Q
}
