import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import type { Resolvers } from "../setup"
import { BaseTable, create_client, create_db } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		name: t.text(),
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

	type UserPage {
		nodes: [User!]!
		cursor: ID
	}

	input SortOrder {
		field: String!
		reverse: Boolean
	}

	type Query {
		users(sort: SortOrder!, cursor: ID, take: Int): UserPage!
		users_by_name(cursor: ID, take: Int): UserPage!
		users_by_name_reverse(cursor: ID, take: Int): UserPage!
	}
`

const graph = r.graph({
	User: r.table(db.user),
})

const resolvers: Resolvers = {
	Query: {
		async users(_parent, args, context, info) {
			const order = args.sort
				? { [args.sort.field]: args.sort.reverse ? "DESC" : "ASC" }
				: undefined
			return await graph.resolvePage(
				db.user
					.modify((q: typeof db.user) => (order ? q.order(order) : q))
					.order({ id: "DESC" }),
				r.cursor({ take: 2 }),
				{
					context,
					info,
				},
			)
		},
		async users_by_name(_parent, _args, context, info) {
			return await graph.resolvePage(
				db.user,
				r.cursor({ fields: ["name", "-id"], take: 2 }),
				{
					context,
					info,
				},
			)
		},
		async users_by_name_reverse(_parent, _args, context, info) {
			return await graph.resolvePage(
				db.user,
				r.cursor({ fields: ["-name", "-id"], take: 2 }),
				{ context, info },
			)
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

await db.user.createMany([
	{ id: 1, name: "Alice" },
	{ id: 2, name: "Charlie" },
	{ id: 3, name: "Bob" },
	{ id: 4, name: "Charlie" },
])

function test_users(
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

test("users (by ID)", async () => {
	test_users(
		"without args",
		await client.request(gql`
			{
				users(sort: { field: "id" }) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[{ name: "Alice" }, { name: "Charlie" }],
		true,
	)
})

test("users (by name)", async () => {
	test_users(
		"without args",
		await client.request(gql`
			{
				users(sort: { field: "name" }) {
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

	const take_1_cursor = test_users(
		"take 1 by name",
		await client.request(gql`
			{
				users(sort: { field: "name" }, take: 1) {
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

	const take_2_more_after_1_cursor = test_users(
		"take 2 more after 1",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users(sort: { field: "name" }, cursor: $cursor, take: 2) {
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

	test_users(
		"take the rest",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users(sort: { field: "name" }, cursor: $cursor) {
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

	test_users(
		"take 4",
		await client.request(gql`
			{
				users(sort: { field: "name" }, take: 4) {
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

	test_users(
		"take 100",
		await client.request(gql`
			{
				users(sort: { field: "name" }, take: 100) {
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

test("users (by name reverse)", async () => {
	test_users(
		"without args",
		await client.request(gql`
			{
				users: users_by_name_reverse {
					nodes {
						id
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Charlie", id: 4 },
			{ name: "Charlie", id: 2 },
		],
		true,
	)

	const take_1_cursor = test_users(
		"take 1",
		await client.request(gql`
			{
				users: users_by_name_reverse(take: 1) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[{ name: "Charlie" }],
		true,
	)

	const take_2_more_after_1_cursor = test_users(
		"take 2 more after 1",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users: users_by_name_reverse(cursor: $cursor, take: 2) {
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
			{ name: "Charlie", id: 2 },
			{ name: "Bob", id: 3 },
		],
		true,
	)

	test_users(
		"take the rest",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users: users_by_name_reverse(cursor: $cursor) {
						nodes {
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
		[{ name: "Alice" }],
		false,
	)

	test_users(
		"take 4",
		await client.request(gql`
			{
				users: users_by_name_reverse(take: 4) {
					nodes {
						id
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Charlie", id: 4 },
			{ name: "Charlie", id: 2 },
			{ name: "Bob", id: 3 },
			{ name: "Alice", id: 1 },
		],
		false,
	)

	test_users(
		"take 100",
		await client.request(gql`
			{
				users: users_by_name_reverse(take: 100) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Charlie" },
			{ name: "Charlie" },
			{ name: "Bob" },
			{ name: "Alice" },
		],
		false,
	)
})

test("users_by_name", async () => {
	test_users(
		"without args",
		await client.request(gql`
			{
				users: users_by_name {
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

	const take_1_cursor = test_users(
		"take 1",
		await client.request(gql`
			{
				users: users_by_name(take: 1) {
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

	const take_2_more_after_1_cursor = test_users(
		"take 2 more after 1",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users: users_by_name(cursor: $cursor, take: 2) {
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

	test_users(
		"take the rest",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users: users_by_name(cursor: $cursor) {
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

	test_users(
		"take 4",
		await client.request(gql`
			{
				users: users_by_name(take: 4) {
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

	test_users(
		"take 100",
		await client.request(gql`
			{
				users: users_by_name(take: 100) {
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

test("users_by_name_reverse", async () => {
	test_users(
		"without args",
		await client.request(gql`
			{
				users: users_by_name_reverse {
					nodes {
						id
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Charlie", id: 4 },
			{ name: "Charlie", id: 2 },
		],
		true,
	)

	const take_1_cursor = test_users(
		"take 1",
		await client.request(gql`
			{
				users: users_by_name_reverse(take: 1) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[{ name: "Charlie" }],
		true,
	)

	const take_2_more_after_1_cursor = test_users(
		"take 2 more after 1",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users: users_by_name_reverse(cursor: $cursor, take: 2) {
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
			{ name: "Charlie", id: 2 },
			{ name: "Bob", id: 3 },
		],
		true,
	)

	test_users(
		"take the rest",
		await client.request(
			gql`
				query more_sections($cursor: ID) {
					users: users_by_name_reverse(cursor: $cursor) {
						nodes {
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
		[{ name: "Alice" }],
		false,
	)

	test_users(
		"take 4",
		await client.request(gql`
			{
				users: users_by_name_reverse(take: 4) {
					nodes {
						id
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Charlie", id: 4 },
			{ name: "Charlie", id: 2 },
			{ name: "Bob", id: 3 },
			{ name: "Alice", id: 1 },
		],
		false,
	)

	test_users(
		"take 100",
		await client.request(gql`
			{
				users: users_by_name_reverse(take: 100) {
					nodes {
						name
					}
					cursor
				}
			}
		`),
		[
			{ name: "Charlie" },
			{ name: "Charlie" },
			{ name: "Bob" },
			{ name: "Alice" },
		],
		false,
	)
})
