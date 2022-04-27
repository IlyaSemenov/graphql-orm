import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

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
	}

	type Query {
		user(id: Int!): User
		users: [User!]!
	}
`

const resolve_graph = GraphResolver({
	User: ModelResolver(UserModel),
})

const resolvers: Resolvers = {
	Query: {
		user(_parent, { id }, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query().findById(id))
		},
		users(_parent, _args, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query())
		},
	},
}

tap.test("access fields", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

	await knex.schema.createTable("user", function (table) {
		table.increments("id").notNullable().primary()
		table.string("name").notNullable()
	})

	await UserModel.query().insertGraph([
		{ name: "Alice" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 1) {
						id
						name
					}
				}
			`
		),
		{
			user: { id: 1, name: "Alice" },
		},
		"fetch object"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 2) {
						name
					}
				}
			`
		),
		{
			user: { name: "Bob" },
		},
		"fetch object"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 9562876) {
						id
						name
					}
				}
			`
		),
		{ user: null },
		"fetch missing object"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					users {
						name
					}
				}
			`
		),
		{
			users: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }],
		},
		"fetch objects"
	)
})
