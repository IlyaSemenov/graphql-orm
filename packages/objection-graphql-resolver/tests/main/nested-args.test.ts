import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "../setup"

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
	country?: string
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
		country: String
		books: [Book!]!
	}

	type Book {
		id: Int!
		title: String!
		authors(country: String): [Author!]!
	}

	type Query {
		books: [Book!]!
	}
`

const graph = r.graph({
	Author: r.model(AuthorModel),
	Book: r.model(BookModel, {
		fields: {
			id: true,
			title: true,
			authors: r.relation({
				modify(authors, { tree: { args } }) {
					authors.orderBy("name")
					if (typeof args.country === "string" || args.country === null) {
						authors.where("country", args.country)
					}
				},
			}),
		},
	}),
})

const resolvers: Resolvers = {
	Query: {
		books: (_parent, _args, context, info) =>
			graph.resolve(BookModel.query().orderBy("id"), { context, info }),
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("author", (author) => {
	author.integer("id").notNullable().primary()
	author.string("name").notNullable()
	author.string("country")
})
await knex.schema.createTable("book", (book) => {
	book.integer("id").notNullable().primary()
	book.string("title").notNullable()
})
await knex.schema.createTable("author_book_rel", (rel) => {
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
	rel.primary(["author_id", "book_id"])
})

test("filter relation", async () => {
	await AuthorModel.query().insertGraph([
		{ id: 1, name: "George Orwell", country: "UK" },
		{ id: 2, name: "Mark Twain", country: "USA" },
		{ id: 3, name: "Bill Gates", country: "USA" },
	])

	await BookModel.query().insertGraph(
		[
			{
				id: 1,
				title: "1984",
				authors: [{ id: 1 }],
			},
			{
				id: 2,
				title: "Tom Sawyer",
				authors: [{ id: 2 }],
			},
			{
				id: 3,
				title: "Imaginary Book",
				authors: [{ id: 1 }, { id: 2 }, { id: 3 }],
			},
		],
		{ relate: true }
	)

	assert.deepEqual(
		await client.request(
			gql`
				{
					books {
						title
						authors(country: "USA") {
							name
						}
					}
				}
			`
		),
		{
			books: [
				{ title: "1984", authors: [] },
				{ title: "Tom Sawyer", authors: [{ name: "Mark Twain" }] },
				{
					title: "Imaginary Book",
					authors: [{ name: "Bill Gates" }, { name: "Mark Twain" }],
				},
			],
		}
	)
})
