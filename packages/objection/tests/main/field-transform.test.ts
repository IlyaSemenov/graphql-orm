import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class UserModel extends Model {
	static tableName = "user"

	id?: number
	name?: string
	password?: string
}

const schema = gql`
	type User {
		id: Int!
		name: String!
		# empty if not allowed
		password: String
	}

	type Query {
		user(id: Int!): User
	}
`

const graph = r.graph<{ userId: string }>({
	User: r.model(UserModel, {
		fields: {
			id: true,
			name: true,
			password: r.field({
				transform(password, user, { context }) {
					if (context.userId && context.userId === user.id) {
						return password
					} else {
						return undefined
					}
				},
			}),
		},
	}),
})

const resolvers: Resolvers = {
	Query: {
		user(_parent, { id }, context, info) {
			return graph.resolve(UserModel.query().findById(id), { context, info })
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", (table) => {
	table.increments("id").notNullable().primary()
	table.string("name").notNullable()
	table.string("password").notNullable()
})

test("field transform", async () => {
	await UserModel.query().insert({ name: "Alice", password: "secret" })

	assert.deepEqual(
		await client.request(gql`
			{
				user(id: 1) {
					id
					name
					password
				}
			}
		`),
		{
			user: { id: 1, name: "Alice", password: null },
		},
		"reject password to public",
	)

	assert.deepEqual(
		await client.request(
			gql`
				{
					user(id: 1) {
						id
						name
						password
					}
				}
			`,
			undefined,
			{ user_id: "2" },
		),
		{
			user: { id: 1, name: "Alice", password: null },
		},
		"reject password to other users",
	)

	assert.deepEqual(
		await client.request(
			gql`
				{
					user(id: 1) {
						id
						name
						password
					}
				}
			`,
			undefined,
			{ user_id: "1" },
		),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"return own password to user",
	)
})
