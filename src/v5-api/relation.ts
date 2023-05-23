import { Model } from "objection"

import { FiltersDef } from "../filters/filters"
import { Paginator } from "../paginators/base"
import { QueryTreeModifier } from "../resolvers/model"
import { create_page_resolver } from "../resolvers/page"
import { create_relation_resolver } from "../resolvers/relation"
import { FieldResolverOptions } from "./field"

interface RelationResolverOptions<M extends Model, R extends Model>
	extends Exclude<FieldResolverOptions<M>, "select"> {
	filter?: FiltersDef
	paginate?: Paginator<R, any>
	modifier?: QueryTreeModifier<R>
}

/** @deprecated use `r.relation()` or `r.page()` */
export function RelationResolver<M extends Model, R extends Model>(
	options: RelationResolverOptions<M, R> = {}
) {
	if (options.paginate) {
		return create_page_resolver(options.paginate, {
			modelField: options.modelField,
			filters: options.filter,
			modify: options.modifier,
			transform: options.clean,
		})
	} else {
		return create_relation_resolver({
			modelField: options.modelField,
			filters: options.filter,
			modify: options.modifier,
			transform: options.clean,
		})
	}
}
