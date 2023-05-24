import { Query } from "pqb"

export interface Paginator {
	/** GraphQL path, for example: `["nodes"]` */
	readonly path: string[]
	paginate(query: Query, ...args: any[]): Query
}

type GetPageFn<P> = (nodes: any[]) => P

const s = Symbol()

// FIXME use proper orchid methods, set result type
export function set_query_page_result<P>(query: Query, get_page: GetPageFn<P>) {
	function _get_page(data: any) {
		if (!Array.isArray(data)) {
			throw new Error(`Paginator called for single result query.`)
		}
		return get_page(data)
	}

	// For root query
	const { handleResult } = query.query as any
	;(query.query as any).handleResult = (...args: any[]) => {
		const data = handleResult(...args)
		return _get_page(data)
	}

	// For nested query
	;(query.query as any)[s] = _get_page

	return query
}

export function get_query_pagination_handler(query: Query) {
	return (query.query as any)[s]
}
