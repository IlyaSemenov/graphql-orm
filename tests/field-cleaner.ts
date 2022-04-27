import gql from "graphql-tag"
import { Model } from "objection"
import {
	FieldResolver,
	GraphResolver,
	ModelResolver,
} from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

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

const resolve_graph = GraphResolver({
	User: ModelResolver(UserModel, {
		fields: {
			id: true,
			name: true,
			password: FieldResolver({
				clean(password, user, context) {
					if (context.user_id && context.user_id === user.id) {
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
		user(_parent, { id }, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query().findById(id))
		},
	},
}

tap.test("field cleaner", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

	await knex.schema.createTable("user", function (table) {
		table.increments("id").notNullable().primary()
		table.string("name").notNullable()
		table.string("password").notNullable()
	})

	await UserModel.query().insert({ name: "Alice", password: "secret" })

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 1) {
						id
						name
						password
					}
				}
			`
		),
		{
			user: { id: 1, name: "Alice", password: null },
		},
		"reject password to public"
	)

	tap.strictSame(
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
			{ user_id: "2" }
		),
		{
			user: { id: 1, name: "Alice", password: null },
		},
		"reject password to other users"
	)

	tap.strictSame(
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
			{ user_id: "1" }
		),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"return own password to user"
	)
})
