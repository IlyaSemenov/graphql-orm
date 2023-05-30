import { GraphResolver, GraphResolverOptions, TableResolver } from "graphql-orm"

import { OrchidOrm, orm } from "../orm/orm"

export function createGraphResolver(
	types: Record<string, TableResolver<OrchidOrm>>,
	options?: GraphResolverOptions<OrchidOrm>
) {
	return new GraphResolver<OrchidOrm>(orm, types, options)
}
