import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import { assert, beforeAll, expect, test } from "vitest"

import { Resolvers, setup } from "../setup"

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
		password: String!
	}

	type Query {
		user1(id: Int!): User
		user2(id: Int!): User
		secure_user(id: Int!): User
	}
`

const resolve_graph1 = GraphResolver({
	User: ModelResolver(UserModel),
})

const resolve_graph2 = GraphResolver({
	User: ModelResolver(UserModel, {
		fields: true,
	}),
})

const secure_resolve_graph = GraphResolver({
	User: ModelResolver(UserModel, {
		fields: {
			id: true,
			name: true,
		},
	}),
})

const resolvers: Resolvers = {
	Query: {
		user1(_parent, { id }, ctx, info) {
			return resolve_graph1(ctx, info, UserModel.query().findById(id))
		},
		user2(_parent, { id }, ctx, info) {
			return resolve_graph2(ctx, info, UserModel.query().findById(id))
		},
		secure_user(_parent, { id }, ctx, info) {
			return secure_resolve_graph(ctx, info, UserModel.query().findById(id))
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

beforeAll(async () => {
	await knex.schema.createTable("user", function (table) {
		table.increments("id").notNullable().primary()
		table.string("name").notNullable()
		table.string("password").notNullable()
	})

	await UserModel.query().insertGraph([{ name: "Alice", password: "secret" }])
})

test("model resolver fields access", async () => {
	assert.deepEqual(
		await client.request(
			gql`
				{
					user: user1(id: 1) {
						id
						name
						password
					}
				}
			`
		),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"fields: undefined"
	)

	assert.deepEqual(
		await client.request(
			gql`
				{
					user: user2(id: 1) {
						id
						name
						password
					}
				}
			`
		),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"fields: true"
	)

	assert.deepEqual(
		await client.request(
			gql`
				{
					user: secure_user(id: 1) {
						id
						name
					}
				}
			`
		),
		{
			user: { id: 1, name: "Alice" },
		},
		"secure user without password"
	)

	await expect(
		client.request(
			gql`
				{
					user: secure_user(id: 1) {
						id
						name
						password
					}
				}
			`
		)
	).rejects.toThrow("No field resolver defined for field User.password")
})
