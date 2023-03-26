import gql from "graphql-tag"
import { Model } from "objection"
import {
	CursorPaginator,
	GraphResolver,
	ModelResolver,
} from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "./setup"

class BookModel extends Model {
	static tableName = "book"

	id?: number
	title?: string
	author?: string
}

const schema = gql`
	type Book {
		id: Int!
		title: String!
		author: String!
	}

	type BookPage {
		nodes: [Book!]!
		cursor: String
	}

	type Query {
		books: BookPage!
	}
`

const resolve_graph = GraphResolver({
	Book: ModelResolver(BookModel),
})

const resolvers: Resolvers = {
	Query: {
		books: (_parent, _args, ctx, info) =>
			resolve_graph(ctx, info, BookModel.query(), {
				paginate: CursorPaginator({ take: 1, fields: ["author", "id"] }),
			}),
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

test("auto select pagination key", async () => {
	await knex.schema.createTable("book", (book) => {
		book.increments("id").notNullable().primary()
		book.string("title").notNullable()
		book.string("author").notNullable()
	})

	await BookModel.query().insertGraph([
		{ title: "1984", author: "George Orwell" },
		{ title: "Tom Sawyer", author: "Mark Twain" },
	])

	assert.deepEqual(
		await client.request(
			gql`
				{
					books {
						nodes {
							title
						}
					}
				}
			`
		),
		{
			books: {
				nodes: [{ title: "1984" }],
			},
		},
		"pagination works without selecting author explicitly"
	)
})
