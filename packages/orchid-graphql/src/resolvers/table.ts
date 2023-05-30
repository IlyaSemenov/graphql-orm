import { TableResolver, TableResolverOptions } from "graphql-orm"
import { DbTable, TableClass } from "orchid-orm"

import { OrchidOrm, orm } from "../orm/orm"

export function defineTableResolver<T extends TableClass>(
	table: DbTable<T>,
	options: TableResolverOptions<OrchidOrm> = {}
) {
	return new TableResolver(orm, table, options)
}
