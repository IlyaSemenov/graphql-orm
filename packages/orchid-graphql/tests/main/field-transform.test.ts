import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.text(),
		password: t.text(),
	}))
}

const db = await create_db({
	user: UserTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null,
		password varchar(32) not null
	);
`

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

const graph = r.graph<{ user_id: string }>({
	User: r.table(db.user, {
		fields: {
			id: true,
			name: true,
			password: r.field({
				transform(password, user, { context }) {
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
		async user(_parent, { id }, context, info) {
			return await graph.resolve(db.user.findOptional(id), { context, info })
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("field transform", async () => {
	await db.user.create({ name: "Alice", password: "secret" })

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
