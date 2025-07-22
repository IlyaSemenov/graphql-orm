// Repeat demo sample from README.md

import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import type { Resolvers } from "../setup"
import { BaseTable, createClient, createDb } from "../setup"

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		text: t.text(),
	}))
}

const db = await createDb({
	post: PostTable,
})

await db.$query`
	create table post (
		id serial primary key,
		text text not null
	);
`

const typeDefs = gql`
	type Post {
		id: Int!
		text: String!
	}

	type Mutation {
		create_post(text: String!): Post!
	}

	type Query {
		posts: [Post!]!
	}
`

const graph = r.graph({
	Post: r.table(db.post),
})

const resolvers: Resolvers = {
	Mutation: {
		async create_post(_parent, args, context, info) {
			const post = await db.post.create(args)
			return await graph.resolve(db.post.find(post.id), {
				context,
				info,
			})
		},
	},
	Query: {
		async posts(_parent, _args, context, info) {
			return await graph.resolve(db.post, { context, info })
		},
	},
}

const client = await createClient({ typeDefs, resolvers })

test("readme demo sample", async () => {
	await client.request(
		gql`
			mutation create_post($text: String!) {
				new_post: create_post(text: $text) {
					id
				}
			}
		`,
		{ text: "Hello, world!" },
	)

	const { posts } = await client.request<any>(gql`
		query {
			posts {
				id
				text
			}
		}
	`)

	assert.deepEqual(posts, [{ id: 1, text: "Hello, world!" }])
})
