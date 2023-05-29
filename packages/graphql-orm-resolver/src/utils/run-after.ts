import { OrmAdapter } from "../orm/orm"

export function run_after_query(
	orm: OrmAdapter<any, any>,
	query: unknown,
	transform: (instance: any) => any
) {
	return orm.run_after_query(query, async (result) => {
		// FIXME: returning result is ignored in orchid (unlike objection). Add some hacks instead.
		if (Array.isArray(result)) {
			const result1 = await Promise.all(result.map(transform))
			return result1.filter(Boolean) // Skip empty objects
		} else if (result) {
			return transform(result)
		} else {
			// Supposedly, single query returning NULL
			return result
		}
	})
}
