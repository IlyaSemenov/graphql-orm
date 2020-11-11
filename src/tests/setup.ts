import "objection-fetch-graphql"

import { ApolloServer } from "apollo-server"
import { GraphQLClient } from "graphql-request"
import Knex from "knex"
import { Model } from "objection"
import tap from "tap"

import { create_tables } from "./models"
import { resolvers } from "./resolvers"
import { schema } from "./schema"

type Test = typeof tap.Test.prototype

export async function use_db(tap: Test) {
	const knex = Knex({ client: "sqlite3", connection: ":memory:" })
	tap.tearDown(async () => {
		await knex.destroy()
	})
	Model.knex(knex)
	await create_tables(knex)
}

export async function use_client(tap: Test) {
	const server = new ApolloServer({ typeDefs: schema, resolvers })
	tap.tearDown(async () => {
		await server.stop()
	})
	const { url } = await server.listen(0)
	return new GraphQLClient(url)
}
