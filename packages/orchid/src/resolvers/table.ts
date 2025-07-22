import type { TableResolverOptions } from "graphql-orm"
import { TableResolver } from "graphql-orm"
import type { Table } from "orchid-orm"

import type { OrchidOrm } from "../orm/orm"
import { orm } from "../orm/orm"

export function defineTableResolver<Context = unknown>(
	table: Table,
	options: TableResolverOptions<OrchidOrm, Context> = {},
) {
	return new TableResolver(orm, table as any, options)
}
