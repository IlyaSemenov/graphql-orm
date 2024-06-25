import { TableResolver, TableResolverOptions } from "graphql-orm"
import { Table } from "orchid-orm"

import { OrchidOrm, orm } from "../orm/orm"

export function defineTableResolver<Context = unknown>(
	table: Table,
	options: TableResolverOptions<OrchidOrm, Context> = {},
) {
	return new TableResolver(orm, table as any, options)
}
