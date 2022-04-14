import Knex from "knex"
import { Model } from "objection"

export async function setup_db(tap: Tap.Test) {
	const knex = Knex({
		client: "sqlite3",
		connection: ":memory:",
		useNullAsDefault: true,
	})
	tap.teardown(() => knex.destroy())
	Model.knex(knex)
	return knex
}
