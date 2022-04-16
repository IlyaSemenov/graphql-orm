import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

class BookModel extends Model {
	static tableName = "book"

	id?: number

	get foo() {
		return "whatever"
	}
}

const schema = gql`
	type Book {
		id: Int!
		foo: String!
	}

	type Query {
		books: [Book!]!
	}
`

const resolve_graph = GraphResolver({
	Book: ModelResolver(BookModel),
})

const resolvers: Resolvers = {
	Query: {
		books: (_parent, _args, ctx, info) =>
			resolve_graph(ctx, info, BookModel.query()),
	},
}

tap.test("select virtual attribute only", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

	await knex.schema.createTable("book", (book) => {
		book.integer("id").notNullable().primary()
	})

	await BookModel.query().insert({ id: 1 })

	tap.strictSame(
		await client.request(
			gql`
				{
					books {
						foo
					}
				}
			`
		),
		{
			books: [{ foo: "whatever" }],
		}
	)
})
