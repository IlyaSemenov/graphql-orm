import { GraphQLClient } from "graphql-request"
import Knex from "knex"
import { Model } from "objection"
import tap from "tap"

import { create_tables } from "./migrations"
import { create_server } from "./server"

type Test = typeof tap.Test.prototype

export async function use_db(tap: Test) {
	const knex = Knex({
		client: "sqlite3",
		connection: ":memory:",
		useNullAsDefault: true,
	})
	tap.tearDown(async () => {
		await knex.destroy()
	})
	Model.knex(knex)
	await create_tables(knex)
}

export async function use_client(tap: Test) {
	const server = create_server()
	tap.tearDown(async () => {
		await server.stop()
	})
	const { url } = await server.listen(0)
	return new GraphQLClient(url)
}
