import { AnyQueryBuilder, Model, ref } from "objection"

// Get rid of this once https://github.com/Vincit/objection.js/issues/2364 is fixed
export function field_ref(query: AnyQueryBuilder, field: string) {
	return ref(field).from(query.tableRefFor(query.modelClass() as typeof Model))
}
