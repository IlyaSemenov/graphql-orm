import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.string(1, 100),
	}))
}

const db = await create_db({
	user: UserTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null
	);
`

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
	User: r.table(db.user),
})

const resolvers: Resolvers = {
	Query: {
		async user(_parent, { id }, context, info) {
			return await graph.resolve(db.user.findOptional(id), { context, info })
		},
		async users(_parent, _args, context, info) {
			return await graph.resolve(db.user, { context, info })
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("access fields", async () => {
	await db.user.createMany([
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
