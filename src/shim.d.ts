import "objection"

declare module "objection" {
	interface QueryBuilder<M extends Model, R = M[]> {
		// Not sure why it's missing in official typings
		tableRef(): string
	}
}
