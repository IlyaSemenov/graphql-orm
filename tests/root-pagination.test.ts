import gql from "graphql-tag"
import { Model } from "objection"
import {
	CursorPaginator,
	GraphResolver,
	ModelResolver,
} from "objection-graphql-resolver"
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

const resolve_graph = GraphResolver({
	User: ModelResolver(UserModel),
})

const resolvers: Resolvers = {
	Query: {
		users(_parent, _args, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query(), {
				paginate: CursorPaginator({
					take: 2,
					fields: ["name", "-id"],
				}),
			})
		},
		reverse_users(_parent, _args, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query(), {
				paginate: CursorPaginator({
					take: 2,
					fields: ["-name", "-id"],
				}),
			})
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

test("root pagination", async () => {
	await knex.schema.createTable("user", function (table) {
		table.increments("id").notNullable().primary()
		table.string("name").notNullable()
	})

	await UserModel.query().insertGraph([
		{ name: "Alice" },
		{ name: "Charlie" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	function test_users(
		name: string,
		response: any,
		users: any[],
		must_have_cursor: boolean
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

	test_users(
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
		true
	)

	const take_1_cursor = test_users(
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
		true
	)

	const take_2_more_after_1_cursor = test_users(
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
			}
		),
		[
			{ name: "Bob", id: 3 },
			{ name: "Charlie", id: 4 },
		],
		true
	)

	test_users(
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
			}
		),
		[{ name: "Charlie", id: 2 }],
		false
	)

	test_users(
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
		false
	)

	test_users(
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
		false
	)
})
