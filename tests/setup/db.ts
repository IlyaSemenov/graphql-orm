import { createBaseTable, orchidORM, TableClasses } from "orchid-orm"
import pg from "pg"
import { afterAll } from "vitest"

export const BaseTable = createBaseTable()

export async function create_db<T extends TableClasses>(tables: T) {
	if (!process.env.DATABASE_URL) {
		throw new Error("Please define DATABASE_URL.")
	}
	const url = new URL(process.env.DATABASE_URL)
	const client = new pg.Client(process.env.DATABASE_URL)
	await client.connect()
	const test_db = client.database + "_" + Math.random().toString(36).slice(2, 8)
	await client.query(`create database ${test_db}`)
	url.pathname = test_db

	const db = orchidORM(
		{
			databaseURL: url.toString(),
			log: true,
		},
		tables
	)
	afterAll(async () => {
		await db.$close()
		await client.query(`drop database ${test_db}`)
		await client.end()
	})
	return db
}
