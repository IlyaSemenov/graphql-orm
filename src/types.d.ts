// I had to move this to a separate .d.ts file
// When placed in a .ts file, extending QueryBuilder emits error:
// Type parameter 'M' of exported interface has or is using private name 'Model'. ts(4004)

import { GraphQLResolveInfo } from "graphql"

import { FetchOptions } from "."

// Export other types, so that it's possible to refer to this file in package.json types
export * from "."

declare module "objection" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export interface QueryBuilder<M extends Model, R = M[]> {
		fetchGraphQL(info: GraphQLResolveInfo, options?: FetchOptions): this
	}
}
