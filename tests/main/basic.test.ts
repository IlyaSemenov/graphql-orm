// Replicate basic demo from README.md

import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "../setup"

// Define Objection.js models

class PostModel extends Model {
	static tableName = "post"

	id?: number
	text?: string
}

// Define GraphQL schema

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

// Map GraphQL types to model resolvers

const graph = r.graph({
	Post: r.model(PostModel),
})

// Define resolvers

const resolvers: Resolvers = {
	Mutation: {
		async create_post(_parent, args, ctx, info) {
			const post = await PostModel.query().insert(args)
			return graph.resolve(ctx, info, post.$query())
		},
	},
	Query: {
		posts(_parent, _args, ctx, info) {
			return graph.resolve(ctx, info, PostModel.query().orderBy("id"))
		},
	},
}

const { client, knex } = await setup({ typeDefs, resolvers })

test("basic demo", async () => {
	await knex.schema.createTable("post", (post) => {
		post.increments("id")
		post.text("text").notNullable()
	})

	await client.request(
		gql`
			mutation create_post($text: String!) {
				new_post: create_post(text: $text) {
					id
				}
			}
		`,
		{ text: "Hello, world!" }
	)

	const { posts } = await client.request<any>(
		gql`
			query {
				posts {
					id
					text
				}
			}
		`
	)

	assert.deepEqual(posts, [{ id: 1, text: "Hello, world!" }])
})
