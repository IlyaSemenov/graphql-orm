import gql from "graphql-tag"
import { Model, raw } from "objection"
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
		upper_name: String!
	}

	type Query {
		user(id: Int!): User
	}
`

const graph = r.graph({
	User: r.model(UserModel, {
		fields: {
			id: true,
			name: true,
			upper_name: (query) =>
				query.select(raw(`upper(user.name) as upper_name`)),
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

await knex.schema.createTable("user", function (table) {
	table.increments("id").notNullable().primary()
	table.string("name").notNullable()
})

test("raw sql", async () => {
	await UserModel.query().insert({ name: "Alice" })

	assert.deepEqual(
		await client.request(
			gql`
				{
					user(id: 1) {
						upper_name
					}
				}
			`
		),
		{
			user: { upper_name: "ALICE" },
		}
	)
})
