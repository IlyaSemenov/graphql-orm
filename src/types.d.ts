import { GraphQLResolveInfo } from "graphql"
import { QueryBuilder } from "objection"

export type FilterNonNullScalarValue = string | number | boolean
export type FilterScalarValue = null | FilterNonNullScalarValue
export type FilterValue =
	| FilterScalarValue
	| FilterNonNullScalarValue[]
	| Filter
export type Filter = { [property: string]: FilterValue }

export type QueryModifier<QB extends QueryBuilder<any> = QueryBuilder<any>> = (
	qb: QB,
) => QB | void

export type Modifiers = {
	[type_name: string]: QueryModifier
}

export interface FetchOptions {
	filter?: Filter
	modifiers?: Modifiers
}

declare module "objection" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export interface QueryBuilder<M extends Model, R = M[]> {
		fetchGraphQL(info: GraphQLResolveInfo, options?: FetchOptions): this
	}
}
