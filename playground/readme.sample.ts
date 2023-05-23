// Everything is put into a single file for demonstration purposes.
//
// In real projects, you will want to separate models, typedefs,
// model resolvers, and the server into their own modules.

import { ApolloServer, ApolloServerOptions } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import gql from "graphql-tag"
import Knex from "knex"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"

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

const resolvers: ApolloServerOptions<any>["resolvers"] = {
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

// Configure database backend

const knex = Knex({ client: "sqlite3", connection: ":memory:" })
Model.knex(knex)

await knex.schema.createTable("post", (post) => {
	post.increments("id")
	post.text("text").notNullable()
})

// Start GraphQL server

const server = new ApolloServer({ typeDefs, resolvers })
const { url } = await startStandaloneServer(server, {
	listen: { port: 4000 },
})
console.log(`Listening on ${url}`)

if (import.meta.hot) {
	import.meta.hot.on("vite:beforeFullReload", async () => {
		await server.stop()
	})
}
