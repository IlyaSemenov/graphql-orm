import { TableResolver, TableResolverOptions } from "graphql-orm-resolver"
import { DbTable, TableClass } from "orchid-orm"

import { orm } from "../orm/orm"

export function defineTableResolver<T extends TableClass>(
	table: DbTable<T>,
	options: TableResolverOptions = {}
) {
	return new TableResolver(orm, table, options)
}
