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
}

const schema = gql`
	type User {
		id: Int!
		name: String!
	}

	type UserPage {
		nodes: [User!]!
		cursor: ID
	}

	type Query {
		users(cursor: ID, take: Int): UserPage!
		reverse_users(cursor: ID, take: Int): UserPage!
	}
`

const graph = r.graph({
	User: r.model(UserModel),
})

const resolvers: Resolvers = {
	Query: {
		users(_parent, _args, context, info) {
			return graph.resolvePage(
				UserModel.query(),
				r.cursor({ fields: ["name", "-id"], take: 2 }),
				{ context, info },
			)
		},
		reverse_users(_parent, _args, context, info) {
			return graph.resolvePage(
				UserModel.query(),
				r.cursor({ fields: ["-name", "-id"], take: 2 }),
				{ context, info },
			)
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", (table) => {
	table.increments("id").notNullable().primary()
	table.string("name").notNullable()
})

test("root pagination", async () => {
	await UserModel.query().insertGraph([
		{ name: "Alice" },
		{ name: "Charlie" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	function testUsers(
		name: string,
		response: any,
		users: any[],
		must_have_cursor: boolean,
	) {
		const { cursor, nodes } = response.users
		if (must_have_cursor) {
			assert.ok(cursor, `${name}: has cursor`)
		} else {
			assert.notOk(cursor, `${name}: has no cursor`)
		}
		assert.deepEqual(nodes, users, name)
		return cursor
	}

	testUsers(
		"without args",
		await client.request(gql`
			{
				users {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[{ name: "Alice" }, { name: "Bob" }],
		true,
	)

	const take_1_cursor = testUsers(
		"take 1",
		await client.request(gql`
			{
				users(take: 1) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[{ name: "Alice" }],
		true,
	)

	const take_2_more_after_1_cursor = testUsers(
		"take 2 more after 1",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users(cursor: $cursor, take: 2) {
						nodes {
							id
							name
						}
						cursor
					}
				}
			`,
			{
				cursor: take_1_cursor,
			},
		),
		[
			{ name: "Bob", id: 3 },
			{ name: "Charlie", id: 4 },
		],
		true,
	)

	testUsers(
		"take the rest",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users(cursor: $cursor) {
						nodes {
							id
							name
						}
						cursor
					}
				}
			`,
			{
				cursor: take_2_more_after_1_cursor,
			},
		),
		[{ name: "Charlie", id: 2 }],
		false,
	)

	testUsers(
		"take 4",
		await client.request(gql`
			{
				users(take: 4) {
					nodes {
						id
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Alice", id: 1 },
			{ name: "Bob", id: 3 },
			{ name: "Charlie", id: 4 },
			{ name: "Charlie", id: 2 },
		],
		false,
	)

	testUsers(
		"take 100",
		await client.request(gql`
			{
				users(take: 100) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Alice" },
			{ name: "Bob" },
			{ name: "Charlie" },
			{ name: "Charlie" },
		],
		false,
	)
})
