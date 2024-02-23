import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class AuthorTable extends BaseTable {
	readonly table = "author"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.string(1, 100),
	}))

	relations = {
		books: this.hasAndBelongsToMany(() => BookTable, {
			primaryKey: "id",
			foreignKey: "author_id",
			associationPrimaryKey: "id",
			associationForeignKey: "book_id",
			joinTable: "author_book_rel",
		}),
	}
}

class BookTable extends BaseTable {
	readonly table = "book"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		title: t.text(1, 200),
	}))

	relations = {
		authors: this.hasAndBelongsToMany(() => AuthorTable, {
			primaryKey: "id",
			foreignKey: "book_id",
			associationPrimaryKey: "id",
			associationForeignKey: "author_id",
			joinTable: "author_book_rel",
		}),
	}
}

const db = await create_db({
	author: AuthorTable,
	book: BookTable,
})

await db.$query`
  create table "author" (
    id serial primary key,
    name varchar(100) not null
  );
  create table book (
    id serial primary key,
    title varchar(200) not null
  );
  create table author_book_rel (
    author_id integer not null,
    book_id integer not null
  );
`

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
	Author: r.table(db.author),
	Book: r.table(db.book),
})

const resolvers: Resolvers = {
	Query: {
		books: async (_parent, _args, context, info) =>
			await graph.resolve(db.book.order("id"), { context, info }),
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("m2m", async () => {
	await db.author.createMany([
		{ id: 1, name: "George Orwell" },
		{ id: 2, name: "Mark Twain" },
	])
	await db.book.createMany([
		{ id: 1, title: "1984", authors: { connect: [{ id: 1 }] } },
		{ id: 2, title: "Tom Sawyer", authors: { connect: [{ id: 2 }] } },
		{
			id: 3,
			title: "Imaginary Book",
			authors: { connect: [{ id: 1 }, { id: 2 }] },
		},
	])

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
