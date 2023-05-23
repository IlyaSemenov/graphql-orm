import { AnyQueryBuilder } from "objection"

export function run_after_query(
	query: AnyQueryBuilder,
	transform: (instance: any) => any
) {
	query.runAfter(async (result) => {
		if (Array.isArray(result)) {
			const result1 = await Promise.all(result.map(transform))
			return result1.filter(Boolean) // Skip empty objects
		} else if (result) {
			return transform(result)
		} else {
			// Supposedly, single query builder returning NULL
			return result
		}
	})
}
