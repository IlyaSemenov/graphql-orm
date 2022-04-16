// Regression test for https://github.com/IlyaSemenov/objection-graphql-resolver/issues/7

import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

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
		library: [Book!]!
	}
`

const resolve_graph = GraphResolver({
	Author: ModelResolver(AuthorModel),
	Book: ModelResolver(BookModel),
})

const resolvers: Resolvers = {
	Query: {
		library: (_parent, _args, ctx, info) =>
			resolve_graph(ctx, info, BookModel.query().orderBy("id")),
	},
}

tap.test("m2m: naming clash with column in relation table", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

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

	await BookModel.query().insertGraph(
		[
			{ id: 1, title: "1984", authors: [{ "#id": 1, name: "George Orwell" }] },
			{
				id: 2,
				title: "Tom Sawyer",
				authors: [{ "#id": 2, name: "Mark Twain" }],
			},
			{
				id: 3,
				title: "Imaginary Book",
				authors: [{ "#ref": 1 }, { "#ref": 2 }],
			},
		],
		{ allowRefs: true }
	)

	tap.strictSame(
		await client.request(
			gql`
				{
					library {
						id
						title
						authors {
							id
							name
						}
					}
				}
			`
		),
		{
			library: [
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
		}
	)
})
