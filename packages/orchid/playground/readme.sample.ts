// Everything is put into a single file for demonstration purposes.
//
// In real projects, you will want to separate tables, typedefs,
// resolvers, and the server into their own modules.

import { env } from "node:process"

import type { ApolloServerOptions } from "@apollo/server"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { createBaseTable, orchidORM } from "orchid-orm"

// Define database tables

const BaseTable = createBaseTable()

class PostTable extends BaseTable {
	readonly table = "post"
	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		text: t.text(),
	}))
}

const db = orchidORM(
	{
		databaseURL: env.DATABASE_URL,
		log: true,
	},
	{
		post: PostTable,
	},
)

await db.$query`
	create table post (
		id serial primary key,
		text text not null
	);
`

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

// Map GraphQL types to table resolvers

const graph = r.graph({
	Post: r.table(db.post),
})

// Define resolvers

const resolvers: ApolloServerOptions<any>["resolvers"] = {
	Mutation: {
		async create_post(_parent, args, context, info) {
			const post = await db.post.create(args)
			return await graph.resolve(db.post.find(post.id), { context, info })
		},
	},
	Query: {
		async posts(_parent, _args, context, info) {
			return await graph.resolve(db.post, { context, info })
		},
	},
}

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
