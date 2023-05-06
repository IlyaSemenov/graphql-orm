import { Model, ModelConstructor } from "objection"

import { ResolverContext } from "../resolvers/graph"
import {
	create_model_resolver,
	QueryTreeModifier,
	SimpleFieldResolver,
} from "../resolvers/model"

export interface ModelResolverOptions<M extends Model> {
	fields?: Record<string, SimpleFieldResolver<M>> | true
	modifier?: QueryTreeModifier<M>
	clean?(instance: M, context: ResolverContext): void | PromiseLike<void>
}

/** @deprecated use `r.model()` */
export function ModelResolver<M extends Model = Model>(
	model: ModelConstructor<M>,
	options: ModelResolverOptions<M> = {}
) {
	return create_model_resolver(model, {
		fields: options.fields === true ? undefined : options.fields,
		allowAllFields: options.fields === undefined || options.fields === true,
		modify: options.modifier,
		transform: options.clean,
	})
}
