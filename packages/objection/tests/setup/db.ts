import Knex from "knex"
import { Model } from "objection"
import { afterAll } from "vitest"

export async function setupDb() {
	const knex = Knex({
		client: "sqlite3",
		connection: ":memory:",
		useNullAsDefault: true,
	})
	afterAll(() => knex.destroy())
	Model.knex(knex)
	return knex
}
