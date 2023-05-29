import gql from "graphql-tag"
import { Model, QueryBuilder } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "../setup"

class UserModel extends Model {
	static tableName = "user"

	id?: number
	name?: string
	favorite_tag?: string
}

class PostModel extends Model {
	static tableName = "post"

	static modifiers = {
		favorite_for_user(query: QueryBuilder<PostModel>, user_id: number) {
			query.runBefore(async function () {
				const { favorite_tag } = await UserModel.query(
					this.context().transaction
				)
					.findById(user_id)
					.throwIfNotFound()
					.castTo<PostModel & { favorite_tag: string }>()
				this.where("tag", favorite_tag)
			})
		},
	}

	id?: number
	text?: string
	tag?: string
}

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
	Post: r.model(PostModel),
})

const resolvers: Resolvers = {
	Query: {
		posts(_parent, _args, context, info) {
			return graph.resolve(PostModel.query(), { context, info, filters: true })
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", (user) => {
	user.increments("id").notNullable().primary()
	user.string("name").notNullable()
	user.string("favorite_tag").notNullable()
})
await knex.schema.createTable("post", (post) => {
	post.increments("id").notNullable().primary()
	post.string("text").notNullable()
	post.string("tag").notNullable()
})

test("filter with async modifier", async () => {
	await UserModel.query().insertGraph([
		{ name: "Alice", favorite_tag: "politics" },
		{ name: "Bob", favorite_tag: "celebrities" },
	])

	await PostModel.query().insertGraph([
		{ text: "Oil price rising.", tag: "politics" },
		{ text: "Is communism dead yet?", tag: "politics" },
		{ text: "Elon Musk marries again.", tag: "celebrities" },
	])

	assert.deepEqual(
		await client.request(
			gql`
				{
					posts(filter: { favorite_for_user: 2 }) {
						text
					}
				}
			`
		),
		{
			posts: [{ text: "Elon Musk marries again." }],
		}
	)
})
