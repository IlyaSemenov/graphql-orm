import assert from "assert"
import gql from "graphql-tag"
import { Model, ref } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

class UserModel extends Model {
	static tableName = "user"

	id?: number
	name?: string

	get url() {
		assert(this.id !== undefined)
		return `/user/${this.id}`
	}

	get upper_name() {
		assert(this.name !== undefined)
		return this.name.toUpperCase()
	}
}

const schema = gql`
	type User {
		id: Int!
		name: String!
		url: String!
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
			// Guarded
			url: (query) => query.select(ref("user.id")),
			// Naive
			upper_name: true,
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

tap.test("virtual fields", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

	await knex.schema.createTable("user", function (table) {
		table.increments("id").notNullable().primary()
		table.string("name").notNullable()
	})

	await UserModel.query().insert({ name: "Alice" })

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 1) {
						url
					}
				}
			`
		),
		{
			user: { url: "/user/1" },
		},
		"fetch guarded virtual field"
	)

	await tap.rejects(
		client.request(
			gql`
				{
					user(id: 1) {
						upper_name
					}
				}
			`
		),
		"break on fetching naive virtual field"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 1) {
						name
						upper_name
					}
				}
			`
		),
		{
			user: { name: "Alice", upper_name: "ALICE" },
		},
		"fetch naive virtual field with manual ref"
	)
})
