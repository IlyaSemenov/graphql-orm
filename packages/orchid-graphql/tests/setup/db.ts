import {
	createBaseTable,
	orchidORM,
	TableClasses,
	testTransaction,
} from "orchid-orm"
import { afterAll, afterEach, beforeEach } from "vitest"

export const BaseTable = createBaseTable({
	columnTypes: (t) => ({
		...t,
		text: () => t.text(0, Number.POSITIVE_INFINITY),
	}),
})

export async function create_db<T extends TableClasses>(tables: T) {
	const db = orchidORM(
		{
			databaseURL: process.env.DATABASE_URL,
			log: !process.env.CI,
		},
		tables,
	)
	await testTransaction.start(db)

	beforeEach(async () => {
		await testTransaction.start(db)
	})

	afterEach(async () => {
		await testTransaction.rollback(db)
	})

	afterAll(async () => {
		await testTransaction.close(db)
	})

	return db
}
