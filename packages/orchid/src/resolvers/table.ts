import { TableResolver, TableResolverOptions } from "graphql-orm"
import { DbTable, Table } from "orchid-orm"

import { OrchidOrm, orm } from "../orm/orm"

export function defineTableResolver<TableT extends Table, Context = unknown>(
	table: DbTable<TableT>,
	options: TableResolverOptions<OrchidOrm, Context> = {},
) {
	return new TableResolver(orm, table as unknown as DbTable<any>, options)
}
