import gql from "graphql-tag"
import { Model, raw } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "./setup"

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

const resolve_graph = GraphResolver({
	User: ModelResolver(UserModel, {
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
		user(_parent, { id }, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query().findById(id))
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

test("raw sql", async () => {
	await knex.schema.createTable("user", function (table) {
		table.increments("id").notNullable().primary()
		table.string("name").notNullable()
	})

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
