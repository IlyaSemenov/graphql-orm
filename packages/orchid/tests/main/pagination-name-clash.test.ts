import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { expect, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.text(),
	}))
}

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		text: t.text(),
		author_id: t.integer(),
	}))

	relations = {
		author: this.belongsTo(() => UserTable, {
			columns: ["author_id"],
			references: ["id"],
			required: true,
		}),
	}
}

const db = await create_db({
	user: UserTable,
	post: PostTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null
	);
	create table "post" (
		id serial primary key,
		text text not null,
		author_id integer not null references "user" ("id")
	);
`

const schema = gql`
	type User {
		id: Int!
		name: String!
	}

	type Post {
		id: Int!
		text: String!
		author: User!
	}

	type PostPage {
		nodes: [Post!]!
		cursor: String
	}

	type Query {
		posts_page(cursor: String): PostPage!
	}
`

const graph = r.graph({
	User: r.table(db.user),
	Post: r.table(db.post),
})

const resolvers: Resolvers = {
	Query: {
		async posts_page(_parent, args, context, info) {
			return await graph.resolvePage(
				db.post.order({ id: "DESC" }),
				r.cursor({ take: 1 }),
				{
					context,
					info,
				},
			)
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

await db.user.insertMany([
	{ id: 1, name: "Alice" },
	{ id: 2, name: "Bob" },
])

await db.post.insertMany([
	{ text: "Hello", author_id: 2 },
	{ text: "World", author_id: 1 },
])

test("posts with user", async () => {
	const {
		posts_page: { nodes: nodes1, cursor: cursor1 },
	} = await client.request<any>(gql`
		{
			posts_page {
				nodes {
					id
					text
					author {
						id
						name
					}
				}
				cursor
			}
		}
	`)

	expect(nodes1).toEqual([
		{
			id: 2,
			text: "World",
			author: { id: 1, name: "Alice" },
		},
	])
	expect(cursor1).not.toBeNull()

	await client.request<any>(gql`
		{
			posts_page {
				nodes {
					id
					text
					author {
						id
						name
					}
				}
				cursor
			}
		}
	`)

	const {
		posts_page: { nodes: nodes2, cursor: cursor2 },
	} = await client.request<any>(
		gql`
			query next_page($cursor: String) {
				posts_page(cursor: $cursor) {
					nodes {
						id
						text
						author {
							id
							name
						}
					}
					cursor
				}
			}
		`,
		{
			cursor: cursor1,
		},
	)

	expect(nodes2).toEqual([
		{
			id: 1,
			text: "Hello",
			author: { id: 2, name: "Bob" },
		},
	])
	expect(cursor2).toBeNull()
})
