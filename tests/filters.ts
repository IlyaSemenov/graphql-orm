import gql from "graphql-tag"
import { Model, QueryBuilder, ref } from "objection"
import {
	GraphResolver,
	ModelResolver,
	RelationResolver,
} from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

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

export class PostModel extends Model {
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
		search(query: QueryBuilder<PostModel>, term: string) {
			query.where(ref("post.text"), "like", `%${term}%`)
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
	}
`

const resolve_graph = GraphResolver({
	User: ModelResolver(UserModel, {
		fields: {
			id: true,
			name: true,
			posts: RelationResolver({ filter: true }),
			non_filterable_posts: "posts",
		},
	}),
	Post: ModelResolver(PostModel),
})

const resolvers: Resolvers = {
	Query: {
		user(_parent, { id }, ctx, info) {
			return resolve_graph(ctx, info, UserModel.query().findById(id))
		},
		posts(_parent, _args, ctx, info) {
			return resolve_graph(ctx, info, PostModel.query(), {
				filter: true,
			})
		},
		non_filterable_posts(_parent, _args, ctx, info) {
			return resolve_graph(ctx, info, PostModel.query())
		},
	},
}

tap.test("filters", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

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
		{ relate: true }
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					posts(filter: { author_id: 1 }) {
						id
					}
				}
			`
		),
		{
			posts: [{ id: 1 }, { id: 2 }, { id: 4 }],
		},
		"filter by field value"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					posts(filter: { id__in: [3, 5] }) {
						id
					}
				}
			`
		),
		{ posts: [{ id: 3 }, { id: 5 }] },
		"filter by id__in"
	)

	tap.strictSame(
		(
			await client.request(
				gql`
					{
						posts(filter: { published: true }) {
							text
						}
					}
				`
			)
		).posts.length,
		5,
		"filter by modifier"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					posts(filter: { search: "news" }) {
						text
					}
				}
			`
		),
		{
			posts: [
				{ text: "Latest COVID news." },
				{ text: "Good news from China." },
			],
		},
		"filter by parametrized modifier"
	)

	tap.strictSame(
		(
			await client.request(
				gql`
					{
						posts: non_filterable_posts(filter: { search: "news" }) {
							id
						}
					}
				`
			)
		).posts.length,
		6,
		"ignore filter in non-filterable root query"
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					user(id: 1) {
						posts(filter: { search: "news" }) {
							text
						}
					}
				}
			`
		),
		{
			user: {
				posts: [{ text: "Good news from China." }],
			},
		},
		"nested filter"
	)

	tap.strictSame(
		(
			await client.request(
				gql`
					{
						user(id: 1) {
							posts: non_filterable_posts(filter: { search: "news" }) {
								text
							}
						}
					}
				`
			)
		).user.posts.length,
		3,
		"ignore filter in non-filterable relation"
	)
})
