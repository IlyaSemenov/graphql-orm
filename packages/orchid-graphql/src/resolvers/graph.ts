import {
	GraphResolver,
	GraphResolverOptions,
	TableResolver,
} from "graphql-orm-resolver"
import { Query } from "pqb"

import { orm } from "../orm/orm"

export function createGraphResolver(
	types: Record<string, TableResolver>,
	options?: GraphResolverOptions
) {
	return new GraphResolver<Query>(orm, types, options)
}
