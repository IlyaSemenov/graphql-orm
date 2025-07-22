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

	relations = {
		posts: this.hasMany(() => PostTable, {
			columns: ["id"],
			references: ["author_id"],
		}),
	}
}

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		text: t.text(),
		author_id: t.integer(),
		is_draft: t.boolean().default(false),
	}))
}

const db = await create_db({
	post: PostTable,
	user: UserTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null
	);
	create table post (
		id serial primary key,
		text text not null,
		author_id integer not null,
		is_draft boolean default false
	);
`

const schema = gql`
	scalar Filter

	type User {
		id: Int!
		name: String!
		posts(filter: Filter!): [Post!]!
		non_filterable_posts(filter: Filter!): [Post!]!
	}

	type Post {
		id: Int!
		text: String!
	}

	type Query {
		user(id: Int!): User
		posts(filter: Filter): [Post!]!
		non_filterable_posts(filter: Filter): [Post!]!

		# test allowAllFilters
		users1(filter: Filter): [User!]!
		users2(filter: Filter): [User!]!
		users3(filter: Filter): [User!]!
	}
`

const graph1 = r.graph({
	User: r.table(db.user, {
		fields: {
			id: true,
			name: true,
			posts: r.relation({ filters: true }),
			non_filterable_posts: "posts",
		},
	}),
	Post: r.table(db.post, {
		modifiers: {
			published: query => query.where({ is_draft: false }),
			search: (query, term: string) =>
				query.where({ text: { contains: `%${term}%` } }),
		},
	}),
})

const graph2 = r.graph({
	User: r.table(db.user, {
		allowAllFilters: true,
	}),
})

const graph3 = r.graph(
	{
		User: r.table(db.user),
	},
	{
		allowAllFilters: true,
	},
)

const resolvers: Resolvers = {
	Query: {
		async user(_parent, { id }, context, info) {
			return await graph1.resolve(db.user.findOptional(id), { context, info })
		},
		async posts(_parent, _args, context, info) {
			return await graph1.resolve(db.post, { context, info, filters: true })
		},
		async non_filterable_posts(_parent, _args, context, info) {
			return await graph1.resolve(db.post, { context, info })
		},
		async users1(_parent, _args, context, info) {
			return await graph1.resolve(db.user, { context, info })
		},
		async users2(_parent, _args, context, info) {
			return await graph2.resolve(db.user, { context, info })
		},
		async users3(_parent, _args, context, info) {
			return await graph3.resolve(db.user, { context, info })
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

await db.user.createMany([
	{ name: "Alice" },
	{ name: "Bob" },
	{ name: "Charlie" },
])

await db.post.createMany([
	{ author_id: 1, text: "Oil price rising." },
	{ author_id: 1, text: "Is communism dead yet?" },
	{ author_id: 2, text: "Latest COVID news." },
	{ author_id: 1, text: "Good news from China." },
	{ author_id: 2, text: "COVID vs Flu?" },
	{ author_id: 2, text: "This is draft...", is_draft: true },
])

test("filters", async () => {
	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { author_id: 1 }) {
					id
				}
			}
		`),
		{
			posts: [{ id: 1 }, { id: 2 }, { id: 4 }],
		},
		"filter by field value",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { id__in: [3, 5] }) {
					id
				}
			}
		`),
		{ posts: [{ id: 3 }, { id: 5 }] },
		"filter by id__in",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { id__lt: 3 }) {
					id
				}
			}
		`),
		{ posts: [{ id: 1 }, { id: 2 }] },
		"filter by id__lt",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { id__lte: 3 }) {
					id
				}
			}
		`),
		{ posts: [{ id: 1 }, { id: 2 }, { id: 3 }] },
		"filter by id__lte",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { id__gt: 4 }) {
					id
				}
			}
		`),
		{ posts: [{ id: 5 }, { id: 6 }] },
		"filter by id__gt",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { id__gte: 4 }) {
					id
				}
			}
		`),
		{ posts: [{ id: 4 }, { id: 5 }, { id: 6 }] },
		"filter by id__gte",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { text__contains: "%COVID%" }) {
					text
				}
			}
		`),
		{ posts: [{ text: "Latest COVID news." }, { text: "COVID vs Flu?" }] },
		"filter operator like",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { text__contains: "%COVID%" }) {
					text
				}
			}
		`),
		{ posts: [{ text: "Latest COVID news." }, { text: "COVID vs Flu?" }] },
		"filter operator contains",
	)

	assert.deepEqual(
		(
			await client.request<any>(gql`
				{
					posts(filter: { published: true }) {
						text
					}
				}
			`)
		).posts.length,
		5,
		"filter by modifier",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				posts(filter: { search: "news" }) {
					text
				}
			}
		`),
		{
			posts: [
				{ text: "Latest COVID news." },
				{ text: "Good news from China." },
			],
		},
		"filter by parametrized modifier",
	)

	assert.deepEqual(
		(
			await client.request<any>(gql`
				{
					posts: non_filterable_posts(filter: { search: "news" }) {
						id
					}
				}
			`)
		).posts.length,
		6,
		"ignore filter in non-filterable root query",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				user(id: 1) {
					posts(filter: { search: "news" }) {
						text
					}
				}
			}
		`),
		{
			user: {
				posts: [{ text: "Good news from China." }],
			},
		},
		"nested filter",
	)

	assert.deepEqual(
		(
			await client.request<any>(gql`
				{
					user(id: 1) {
						posts: non_filterable_posts(filter: { search: "news" }) {
							text
						}
					}
				}
			`)
		).user.posts.length,
		3,
		"ignore filter in non-filterable relation",
	)
})

test("allowAllFilters", async () => {
	assert.deepEqual(
		await client.request(gql`
			{
				users: users1(filter: { name__contains: "%ob" }) {
					id
				}
			}
		`),
		{
			users: [{ id: 1 }, { id: 2 }, { id: 3 }],
		},
		"filters not enabled",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				users: users2(filter: { name__contains: "%ob" }) {
					id
				}
			}
		`),
		{
			users: [{ id: 2 }],
		},
		"table-level allowAllFilters",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				users: users3(filter: { name__contains: "%ob" }) {
					id
				}
			}
		`),
		{
			users: [{ id: 2 }],
		},
		"graph-level allowAllFilters",
	)
})
