import gql from "graphql-tag"
import type { QueryBuilder } from "objection"
import { Model, ref } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, beforeAll, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class UserModel extends Model {
	static tableName = "user"

	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "user.id", to: "post.author_id" },
			},
		}
	}

	id?: number
	name?: string
	posts?: PostModel[]
}

class PostModel extends Model {
	static tableName = "post"

	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "post.author_id", to: "user.id" },
			},
		}
	}

	static modifiers = {
		published(query: QueryBuilder<PostModel>) {
			query.where(ref("post.is_draft"), false)
		},
	}

	id?: number
	text?: string
	is_draft?: boolean
	author_id?: number
	author?: UserModel
}

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
		author: User!
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
	User: r.model(UserModel, {
		fields: {
			id: true,
			name: true,
			posts: r.relation({ filters: true }),
			non_filterable_posts: "posts",
		},
	}),
	Post: r.model(PostModel, {
		modifiers: {
			search(query, term: string) {
				return query.where(ref("post.text"), "like", `%${term}%`)
			},
		},
	}),
})

const graph2 = r.graph({
	User: r.model(UserModel, {
		allowAllFilters: true,
	}),
})

const graph3 = r.graph(
	{
		User: r.model(UserModel),
	},
	{
		allowAllFilters: true,
	},
)

const resolvers: Resolvers = {
	Query: {
		user(_parent, { id }, context, info) {
			return graph1.resolve(UserModel.query().findById(id), { context, info })
		},
		posts(_parent, _args, context, info) {
			return graph1.resolve(PostModel.query(), {
				context,
				info,
				filters: true,
			})
		},
		non_filterable_posts(_parent, _args, context, info) {
			return graph1.resolve(PostModel.query(), { context, info })
		},
		users1(_parent, _args, context, info) {
			return graph1.resolve(UserModel.query(), { context, info })
		},
		users2(_parent, _args, context, info) {
			return graph2.resolve(UserModel.query(), { context, info })
		},
		users3(_parent, _args, context, info) {
			return graph3.resolve(UserModel.query(), { context, info })
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", (user) => {
	user.increments("id").notNullable().primary()
	user.string("name").notNullable()
})
await knex.schema.createTable("post", (post) => {
	post.increments("id").notNullable().primary()
	post.string("text").notNullable()
	post.boolean("is_draft").notNullable().defaultTo(false)
	post.integer("author_id").notNullable().references("user.id")
})

beforeAll(async () => {
	await UserModel.query().insertGraph([
		{ name: "Alice" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	await PostModel.query().insertGraph(
		[
			{ author_id: 1, text: "Oil price rising." },
			{ author_id: 1, text: "Is communism dead yet?" },
			{ author_id: 2, text: "Latest COVID news." },
			{ author_id: 1, text: "Good news from China." },
			{ author_id: 2, text: "COVID vs Flu?" },
			{ author_id: 2, text: "This is draft...", is_draft: true },
		],
		{ relate: true },
	)
})

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
				posts(filter: { text__like: "%COVID%" }) {
					text
				}
			}
		`),
		{ posts: [{ text: "Latest COVID news." }, { text: "COVID vs Flu?" }] },
		"filter by text__like",
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
				users: users1(filter: { name__like: "%ob" }) {
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
				users: users2(filter: { name__like: "%ob" }) {
					id
				}
			}
		`),
		{
			users: [{ id: 2 }],
		},
		"model-level allowAllFilters",
	)

	assert.deepEqual(
		await client.request(gql`
			{
				users: users3(filter: { name__like: "%ob" }) {
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
