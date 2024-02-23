import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "../setup"

class UserModel extends Model {
	static tableName = "user"

	id?: number
	name?: string
}

const schema = gql`
	type User {
		id: Int!
		name: String!
	}

	type Query {
		user(id: Int!): User
		users: [User!]!
	}
`

const graph = r.graph({
	User: r.model(UserModel),
})

const resolvers: Resolvers = {
	Query: {
		user(_parent, { id }, context, info) {
			return graph.resolve(UserModel.query().findById(id), { context, info })
		},
		users(_parent, _args, context, info) {
			return graph.resolve(UserModel.query(), { context, info })
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", function (table) {
	table.increments("id").notNullable().primary()
	table.string("name").notNullable()
})

test("access fields", async () => {
	await UserModel.query().insertGraph([
		{ name: "Alice" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	assert.deepEqual(
		await client.request(gql`
			{
				user(id: 1) {
					id
					name
				}
			}
		`),
		{
			user: { id: 1, name: "Alice" },
		},
		"fetch object",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				user(id: 2) {
					name
				}
			}
		`),
		{
			user: { name: "Bob" },
		},
		"fetch object",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				user(id: 9562876) {
					id
					name
				}
			}
		`),
		{ user: null },
		"fetch missing object",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				users {
					name
				}
			}
		`),
		{
			users: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }],
		},
		"fetch objects",
	)
})
