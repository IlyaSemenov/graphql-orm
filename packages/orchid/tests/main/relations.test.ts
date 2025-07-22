import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { expect, test } from "vitest"

import type { Resolvers } from "../setup"
import { BaseTable, create_client, create_db } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		name: t.text(),
	}))

	relations = {
		posts: this.hasMany(() => PostTable, {
			columns: ["id"],
			references: ["author_id"],
		}),
	}
}

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		text: t.text(),
		author_id: t.integer(),
	}))

	relations = {
		author: this.belongsTo(() => UserTable, {
			required: true,
			columns: ["author_id"],
			references: ["id"],
		}),
	}
}

const db = await create_db({
	post: PostTable,
	user: UserTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null
	);
	create table post (
		id serial primary key,
		text text not null,
		author_id integer not null
	);
`

const schema = gql`
	scalar Filter

	type User {
		id: Int!
		name: String!
		posts: [Post!]!
	}

	type Post {
		id: Int!
		text: String!
		author: User!
	}

	type Query {
		user(id: ID): User
		posts: [Post!]!
	}
`

const graph = r.graph(
	{
		Post: r.table(db.post),
		User: r.table(db.user),
	},
	{
		allowAllFields: true,
	},
)

const resolvers: Resolvers = {
	Query: {
		async user(_parent, args, context, info) {
			return await graph.resolve(db.user.findOptional(args.id), {
				context,
				info,
			})
		},
		async posts(_parent, _args, context, info) {
			return await graph.resolve(db.post, { context, info })
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("filters", async () => {
	await db.user.createMany([
		{ name: "Alice" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	await db.post.createMany([
		{ author_id: 1, text: "Oil price rising." },
		{ author_id: 1, text: "Is communism dead yet?" },
		{ author_id: 2, text: "Latest COVID news." },
	])

	expect(
		await client.request(gql`
			{
				posts {
					id
					text
					author {
						id
						name
					}
				}
			}
		`),
	).toMatchInlineSnapshot(`
		{
		  "posts": [
		    {
		      "author": {
		        "id": 1,
		        "name": "Alice",
		      },
		      "id": 1,
		      "text": "Oil price rising.",
		    },
		    {
		      "author": {
		        "id": 1,
		        "name": "Alice",
		      },
		      "id": 2,
		      "text": "Is communism dead yet?",
		    },
		    {
		      "author": {
		        "id": 2,
		        "name": "Bob",
		      },
		      "id": 3,
		      "text": "Latest COVID news.",
		    },
		  ],
		}
	`)

	expect(
		await client.request(gql`
			{
				posts {
					id
					text
					author {
						id
						name
						posts {
							id
							text
						}
					}
				}
			}
		`),
	).toMatchInlineSnapshot(`
		{
		  "posts": [
		    {
		      "author": {
		        "id": 1,
		        "name": "Alice",
		        "posts": [
		          {
		            "id": 1,
		            "text": "Oil price rising.",
		          },
		          {
		            "id": 2,
		            "text": "Is communism dead yet?",
		          },
		        ],
		      },
		      "id": 2,
		      "text": "Is communism dead yet?",
		    },
		    {
		      "author": {
		        "id": 1,
		        "name": "Alice",
		        "posts": [
		          {
		            "id": 1,
		            "text": "Oil price rising.",
		          },
		          {
		            "id": 2,
		            "text": "Is communism dead yet?",
		          },
		        ],
		      },
		      "id": 1,
		      "text": "Oil price rising.",
		    },
		    {
		      "author": {
		        "id": 2,
		        "name": "Bob",
		        "posts": [
		          {
		            "id": 3,
		            "text": "Latest COVID news.",
		          },
		        ],
		      },
		      "id": 3,
		      "text": "Latest COVID news.",
		    },
		  ],
		}
	`)

	expect(
		await client.request(gql`
			{
				user(id: 1) {
					posts {
						id
					}
				}
			}
		`),
	).toStrictEqual({ user: { posts: [{ id: 1 }, { id: 2 }] } })
})
