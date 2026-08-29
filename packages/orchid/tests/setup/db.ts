import { env } from "node:process"

import type { OrmTableThunks } from "orchid-orm"
import {
	createBaseTable,
	testTransaction,
} from "orchid-orm"
import { orchidORM } from "orchid-orm/postgres-js"
import { afterAll, afterEach, beforeEach } from "vitest"

export const BaseTable = createBaseTable()

export async function createDb<T extends OrmTableThunks>(tables: T) {
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
