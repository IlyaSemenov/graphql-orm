import { Model } from "objection"

import { create_cursor_paginator } from "../paginators/cursor"

export interface CursorPaginatorOptions {
	fields: string[]
	take: number
}

/** @deprecated use `r.cursor()` */
export function CursorPaginator<M extends Model>(
	options?: Partial<CursorPaginatorOptions>
) {
	return create_cursor_paginator<M>(options)
}
