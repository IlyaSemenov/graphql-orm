import { GraphResolver, GraphResolverOptions, TableResolver } from "graphql-orm"
import { Query } from "pqb"

import { orm } from "../orm/orm"

export function createGraphResolver(
	types: Record<string, TableResolver<Query>>,
	options?: GraphResolverOptions<Query>
) {
	return new GraphResolver<Query>(orm, types, options)
}
