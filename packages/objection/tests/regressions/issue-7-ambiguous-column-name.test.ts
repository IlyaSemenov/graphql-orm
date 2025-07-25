// Regression test for https://github.com/IlyaSemenov/objection-graphql-resolver/issues/7

import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class AuthorModel extends Model {
	static tableName = "author"

	static get relationMappings() {
		return {
			books: {
				relation: Model.ManyToManyRelation,
				modelClass: BookModel,
				join: {
					from: "author.id",
					through: {
						from: "author_book_rel.author_id",
						to: "author_book_rel.book_id",
					},
					to: "book.id",
				},
			},
		}
	}

	id?: number
	name?: string
	books?: BookModel[]
}

class BookModel extends Model {
	static tableName = "book"

	static get relationMappings() {
		return {
			authors: {
				relation: Model.ManyToManyRelation,
				modelClass: AuthorModel,
				join: {
					from: "book.id",
					through: {
						from: "author_book_rel.book_id",
						to: "author_book_rel.author_id",
					},
					to: "author.id",
				},
			},
		}
	}

	id?: number
	title?: string
	authors?: AuthorModel[]
}

const schema = gql`
	type Author {
		id: Int!
		name: String!
		books: [Book!]!
	}

	type Book {
		id: Int!
		title: String!
		authors: [Author!]!
	}

	type Query {
		books: [Book!]!
	}
`

const graph = r.graph({
	Author: r.model(AuthorModel),
	Book: r.model(BookModel),
})

const resolvers: Resolvers = {
	Query: {
		books: (_parent, _args, context, info) =>
			graph.resolve(BookModel.query().orderBy("id"), { context, info }),
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("author", (author) => {
	author.integer("id").primary()
	author.string("name").notNullable()
})
await knex.schema.createTable("book", (book) => {
	book.integer("id").primary()
	book.string("title").notNullable()
})
await knex.schema.createTable("author_book_rel", (rel) => {
	rel.increments("id").notNullable().primary()
	rel
		.integer("author_id")
		.notNullable()
		.references("author.id")
		.onDelete("cascade")
		.index()
	rel
		.integer("book_id")
		.notNullable()
		.references("book.id")
		.onDelete("cascade")
		.index()
})

test("m2m: naming clash with column in relation table", async () => {
	await BookModel.query().insertGraph(
		[
			{
				id: 1,
				title: "1984",
				authors: [{ "#id": "George Orwell", "name": "George Orwell" }],
			},
			{
				id: 2,
				title: "Tom Sawyer",
				authors: [{ "#id": "Mark Twain", "name": "Mark Twain" }],
			},
			{
				id: 3,
				title: "Imaginary Book",
				authors: [{ "#ref": "George Orwell" }, { "#ref": "Mark Twain" }],
			},
		],
		{ allowRefs: true },
	)

	assert.deepEqual(
		await client.request(gql`
			{
				books {
					id
					title
					authors {
						id
						name
					}
				}
			}
		`),
		{
			books: [
				{ id: 1, title: "1984", authors: [{ id: 1, name: "George Orwell" }] },
				{
					id: 2,
					title: "Tom Sawyer",
					authors: [{ id: 2, name: "Mark Twain" }],
				},
				{
					id: 3,
					title: "Imaginary Book",
					authors: [
						{ id: 1, name: "George Orwell" },
						{ id: 2, name: "Mark Twain" },
					],
				},
			],
		},
	)
})
