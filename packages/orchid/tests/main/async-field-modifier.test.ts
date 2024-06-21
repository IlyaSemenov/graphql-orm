import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.text(),
		favorite_tag: t.text().nullable(),
	}))
}

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		text: t.text(),
		tag: t.text().nullable(),
	}))
}

const db = await create_db({
	post: PostTable,
	user: UserTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null,
		favorite_tag varchar(100)
	);
	create table post (
		id serial primary key,
		text text not null,
		tag varchar(100)
	);
`

const schema = gql`
	scalar Filter

	type Post {
		id: Int!
		text: String!
	}

	type Query {
		posts(filter: Filter): [Post!]!
	}
`

const graph = r.graph({
	Post: r.table(db.post, {
		modifiers: {
			favorite_for_user(query, user_id: number) {
				return query.beforeQuery(async (query) => {
					const tag = await db.user.find(user_id).get("favorite_tag")
					// beforeQuery doesn't support returning a new query, update it in-place
					query.q = query.where({ tag }).q
				})
			},
		},
	}),
})

const resolvers: Resolvers = {
	Query: {
		async posts(_parent, _args, context, info) {
			return await graph.resolve(db.post, {
				context,
				info,
				filters: true,
			})
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("filter with async modifier", async () => {
	await db.user.createMany([
		{ name: "Alice", favorite_tag: "politics" },
		{ name: "Bob", favorite_tag: "celebrities" },
	])

	await db.post.createMany([
		{ text: "Oil price rising.", tag: "politics" },
		{ text: "Is communism dead yet?", tag: "politics" },
		{ text: "Elon Musk marries again.", tag: "celebrities" },
		{ text: "No tags attached." },
	])

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { favorite_for_user: 2 }) {
					text
				}
			}
		`),
		{
			posts: [{ text: "Elon Musk marries again." }],
		},
	)
})
