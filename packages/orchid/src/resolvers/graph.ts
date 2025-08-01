import type {
	GraphResolveOptions,
	GraphResolverOptions,
	TableResolver,
} from "graphql-orm"
import { GraphResolver } from "graphql-orm"
import type { Query } from "orchid-orm"

import type { OrchidOrm } from "../orm/orm"
import { orm } from "../orm/orm"

export function createGraphResolver<Context = unknown>(
	types: Record<string, TableResolver<OrchidOrm, Context>>,
	options?: GraphResolverOptions<OrchidOrm, Context>,
) {
	return new OrchidGraphResolver<Context>(types, options)
}

class OrchidGraphResolver<Context> extends GraphResolver<OrchidOrm, Context> {
	constructor(
		public readonly types: Record<string, TableResolver<OrchidOrm, Context>>,
		public readonly options: GraphResolverOptions<OrchidOrm, Context> = {},
	) {
		super(orm, types, options)
	}

	resolve<T>(
		query: Query & {
			returnType: unknown extends T
				? any
				: T extends unknown[]
					? undefined | "all"
					: T extends undefined
						? "one"
						: "oneOrThrow"
		},
		options: GraphResolveOptions<Context>,
	): Promise<T> {
		return super.resolve(query, options)
	}
}
