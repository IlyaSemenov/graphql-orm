import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, expect, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.string(1, 100),
		password: t.string(1, 32),
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
		password: String!
	}

	type Query {
		default_user(id: Int!): User
		default_user1(id: Int!): User
		secure_user(id: Int!): User
		user1(id: Int!): User
		user2(id: Int!): User
	}
`

const default_graph = r.graph({
	User: r.table(db.user),
})

const default_graph1 = r.graph(
	{
		User: r.table(db.user),
	},
	{ allowAllFields: false },
)

const secure_graph = r.graph({
	User: r.table(db.user, {
		fields: {
			id: true,
			name: true,
		},
	}),
})

const graph1 = r.graph({
	User: r.table(db.user, {
		allowAllFields: true,
		fields: {
			id: true,
			name: true,
		},
	}),
})

const graph2 = r.graph(
	{
		User: r.table(db.user, {
			fields: {
				id: true,
				name: true,
			},
		}),
	},
	{ allowAllFields: true },
)

const resolvers: Resolvers = {
	Query: {
		async default_user(_parent, { id }, context, info) {
			return await default_graph.resolve(db.user.findOptional(id), {
				context,
				info,
			})
		},
		async default_user1(_parent, { id }, context, info) {
			return await default_graph1.resolve(db.user.findOptional(id), {
				context,
				info,
			})
		},
		async secure_user(_parent, { id }, context, info) {
			return await secure_graph.resolve(db.user.findOptional(id), {
				context,
				info,
			})
		},
		async user1(_parent, { id }, context, info) {
			return await graph1.resolve(db.user.findOptional(id), { context, info })
		},
		async user2(_parent, { id }, context, info) {
			return await graph2.resolve(db.user.findOptional(id), { context, info })
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("table resolver fields access", async () => {
	await db.user.create({ name: "Alice", password: "secret" })

	assert.deepEqual(
		await client.request(gql`
			{
				user: default_user(id: 1) {
					id
					name
					password
				}
			}
		`),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"default user",
	)

	await expect(
		client.request(gql`
			{
				user: default_user1(id: 1) {
					id
					name
					password
				}
			}
		`),
	).rejects.toThrow(
		"Resolver for type User must either allow all fields or specify options.fields.",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				user: secure_user(id: 1) {
					id
					name
				}
			}
		`),
		{
			user: { id: 1, name: "Alice" },
		},
		"secure user without password",
	)

	await expect(
		client.request(gql`
			{
				user: secure_user(id: 1) {
					id
					name
					password
				}
			}
		`),
	).rejects.toThrow("No field resolver defined for field User.password")

	assert.deepEqual(
		await client.request(gql`
			{
				user: user1(id: 1) {
					id
					name
					password
				}
			}
		`),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"table-level allowAllFields",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				user: user2(id: 1) {
					id
					name
					password
				}
			}
		`),
		{
			user: { id: 1, name: "Alice", password: "secret" },
		},
		"graph-level allowAllFields",
	)
})
