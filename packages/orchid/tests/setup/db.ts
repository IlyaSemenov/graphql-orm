import { env } from "node:process"

import type { TableClasses } from "orchid-orm"
import {
	createBaseTable,
	orchidORM,
	testTransaction,
} from "orchid-orm"
import { afterAll, afterEach, beforeEach } from "vitest"

export const BaseTable = createBaseTable()

export async function create_db<T extends TableClasses>(tables: T) {
	const db = orchidORM(
		{
			databaseURL: env.DATABASE_URL,
			log: !env.CI,
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
