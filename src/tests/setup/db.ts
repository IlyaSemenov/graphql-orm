import Knex from "knex"
import { Model } from "objection"
import tap from "tap"

type Test = typeof tap.Test.prototype

export async function use_db(tap: Test) {
	const knex = Knex({
		client: "sqlite3",
		connection: ":memory:",
		useNullAsDefault: true,
	})
	tap.teardown(async () => {
		await knex.destroy()
	})
	Model.knex(knex)
}
