import { Query } from "pqb"

export function run_after_query(
	query: Query,
	transform: (instance: any) => any
) {
	return query.afterQuery(async (_, result) => {
		// FIXME: returning is ignored in orchid (unlike objection). Add some hacks instead.
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
