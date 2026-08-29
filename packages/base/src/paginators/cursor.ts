import type { OrmAdapter, SortOrder } from "../orm/orm"

import type { PaginateContext, Paginator } from "./base"

export function defineCursorPaginator(
	options: Partial<CursorPaginatorOptions> = {},
) {
	return new CursorPaginator(options)
}

export interface CursorPaginatorOptions {
	fields?: string[]
	take?: number
}

export interface CursorPaginatorArgs {
	cursor?: string
	take?: number
}

export interface CursorPaginatorPage<M> {
	nodes: M[]
	cursor?: string
}

class CursorPaginator<Orm extends OrmAdapter, Context>
implements Paginator<Orm, Context> {
	readonly path = ["nodes"]

	readonly pageSize: number

	readonly fields?: SortOrder[]

	constructor(options: CursorPaginatorOptions = {}) {
		this.pageSize = options.take ?? 10
		this.fields = options.fields?.map((field) => {
			if (field.startsWith("-")) {
				return { field: field.slice(1), dir: "DESC" }
			} else {
				return { field, dir: "ASC" }
			}
		})
	}

	paginate(query: Orm["Query"], context: PaginateContext<Orm, Context>) {
		const { orm } = context.graph
		const { args } = context.tree

		const pageSize = (args.take as number | undefined) ?? this.pageSize
		const cursor = args.cursor as string | undefined

		const prepared = orm.prepareCursorPagination(query, {
			cursor,
			fields: this.fields,
			limit: pageSize,
		})
		return orm.setQueryPageResult(prepared.query, prepared.getPage)
	}
}
