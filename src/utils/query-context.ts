import { Query } from "pqb"

const graphql = Symbol("graphql")

export function set_query_context(query: Query, context: any) {
	;(query.query as any)[graphql] = context
}

export function get_query_context(query: Query) {
	return (query.query as any)[graphql]
}
