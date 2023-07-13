import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { expect, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.string(1, 100),
	}))

	relations = {
		posts: this.hasMany(() => PostTable, {
			primaryKey: "id",
			foreignKey: "author_id",
		}),
		comments: this.hasMany(() => CommentTable, {
			primaryKey: "id",
			foreignKey: "user_id",
		}),
		likes: this.hasMany(() => LikeTable, {
			primaryKey: "id",
			foreignKey: "user_id",
		}),
	}
}

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		text: t.text(1, 10000),
		author_id: t.integer(),
	}))

	relations = {
		author: this.belongsTo(() => UserTable, {
			required: true,
			primaryKey: "id",
			foreignKey: "author_id",
		}),
		comments: this.hasMany(() => CommentTable, {
			primaryKey: "id",
			foreignKey: "post_id",
		}),
	}
}

class CommentTable extends BaseTable {
	readonly table = "comment"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		text: t.string(1, 1000),
		user_id: t.integer(),
		post_id: t.integer(),
	}))

	relations = {
		user: this.belongsTo(() => UserTable, {
			required: true,
			primaryKey: "id",
			foreignKey: "user_id",
		}),
		post: this.belongsTo(() => PostTable, {
			primaryKey: "id",
			foreignKey: "post_id",
		}),
		likes: this.hasMany(() => LikeTable, {
			primaryKey: "id",
			foreignKey: "comment_id",
		}),
	}
}

class LikeTable extends BaseTable {
	readonly table = "like"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		user_id: t.integer(),
		comment_id: t.integer(),
	}))

	relations = {
		user: this.belongsTo(() => UserTable, {
			required: true,
			primaryKey: "id",
			foreignKey: "user_id",
		}),
		comment: this.belongsTo(() => CommentTable, {
			primaryKey: "id",
			foreignKey: "comment_id",
		}),
	}
}

const db = await create_db({
	user: UserTable,
	post: PostTable,
	comment: CommentTable,
	like: LikeTable,
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
	create table comment (
		id serial primary key,
		text text not null,
		user_id integer not null,
		post_id integer not null
	);
	create table "like" (
		id serial primary key,
		user_id integer not null,
		comment_id integer not null
	);
`

const schema = gql`
	type User {
		id: Int!
		name: String!
		posts_page(cursor: String, take: Int): PostPage!
		posts_by_one(cursor: String, take: Int): PostPage!
		all_posts: [Post!]!
		all_posts_verbose: [Post!]!
		comments_page(cursor: String, take: Int): CommentPage!
	}

	type Post {
		id: Int!
		text: String!
		author: User!
		comments: [Comment!]!
		comments_page(cursor: String, take: Int): CommentPage!
	}

	type PostPage {
		nodes: [Post!]!
		cursor: ID
	}

	type Comment {
		id: Int!
		text: String!
		user: User!
		likes_page(cursor: String, take: Int): LikePage!
	}

	type CommentPage {
		nodes: [Comment!]!
		cursor: ID
	}

	type Like {
		id: Int!
		user: User!
	}

	type LikePage {
		nodes: [Like!]!
		cursor: ID
	}

	type Query {
		user(id: Int!): User
	}
`

const graph = r.graph(
	{
		User: r.table(db.user, {
			fields: {
				posts_page: r.page(r.cursor({ take: 2 }), {
					tableField: "posts",
				}),
				posts_by_one: r.page(r.cursor({ take: 1 }), {
					tableField: "posts",
				}),
				all_posts: "posts",
				all_posts_verbose: r.relation({ tableField: "posts" }),
				comments_page: r.page(r.cursor({ take: 2 }), {
					tableField: "comments",
				}),
			},
		}),
		Post: r.table(db.post, {
			fields: {
				comments_page: r.page(r.cursor({ take: 2 }), {
					tableField: "comments",
				}),
			},
		}),
		Comment: r.table(db.comment, {
			fields: {
				likes_page: r.page(r.cursor({ take: 2 }), {
					tableField: "likes",
				}),
			},
		}),
		Like: r.table(db.like),
	},
	{ allowAllFields: true }
)

const resolvers: Resolvers = {
	Query: {
		async user(_parent, { id }, context, info) {
			return await graph.resolve(db.user.findOptional(id), { context, info })
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

await db.user.createMany([
	{ name: "Alice" },
	{ name: "Bob" },
	{ name: "Charlie" },
])

await db.post.createMany([
	{ author_id: 1, text: "Oil price rising." },
	{ author_id: 1, text: "Is communism dead yet?" },
	{ author_id: 2, text: "Latest COVID figures." },
	{ author_id: 2, text: "Good news from China." },
	{ author_id: 2, text: "More good news!" },
	{ author_id: 1, text: "COVID vs Flu?" },
])

await db.comment.createMany([
	{ post_id: 1, user_id: 1, text: "I am so good." },
	{ post_id: 1, user_id: 2, text: "Boring." },
	{ post_id: 1, user_id: 3, text: "Yeah, TLDR." },
	{ post_id: 5, user_id: 3, text: "Cool." },
	{ post_id: 6, user_id: 3, text: "Who cares in 2023?" },
])

await db.like.create({ comment_id: 1, user_id: 2 })

test("relation pagination", async () => {
	expect(
		await client.request(
			gql`
				{
					user(id: 1) {
						name
						posts_page {
							nodes {
								text
							}
							cursor
						}
					}
				}
			`
		)
	).toMatchInlineSnapshot(`
		{
		  "user": {
		    "name": "Alice",
		    "posts_page": {
		      "cursor": "[\\"2\\"]",
		      "nodes": [
		        {
		          "text": "Oil price rising.",
		        },
		        {
		          "text": "Is communism dead yet?",
		        },
		      ],
		    },
		  },
		}
	`)
})

test("double nested pagination", async () => {
	expect(
		await client.request(
			gql`
				{
					user(id: 1) {
						name
						posts_page {
							nodes {
								text
								author {
									name
								}
								comments_page {
									nodes {
										text
									}
									cursor
								}
							}
							cursor
						}
					}
				}
			`
		)
	).toMatchInlineSnapshot(`
		{
		  "user": {
		    "name": "Alice",
		    "posts_page": {
		      "cursor": "[\\"2\\"]",
		      "nodes": [
		        {
		          "author": {
		            "name": "Alice",
		          },
		          "comments_page": {
		            "cursor": "[\\"2\\"]",
		            "nodes": [
		              {
		                "text": "I am so good.",
		              },
		              {
		                "text": "Boring.",
		              },
		            ],
		          },
		          "text": "Oil price rising.",
		        },
		        {
		          "author": {
		            "name": "Alice",
		          },
		          "comments_page": {
		            "cursor": null,
		            "nodes": [],
		          },
		          "text": "Is communism dead yet?",
		        },
		      ],
		    },
		  },
		}
	`)
})

test("double and triple nested pagination", async () => {
	expect(
		await client.request(
			gql`
				{
					user(id: 1) {
						name
						comments_page {
							nodes {
								text
								likes_page {
									nodes {
										id
									}
								}
							}
							cursor
						}
						posts_page {
							nodes {
								text
								author {
									name
								}
								comments_page {
									nodes {
										text
										likes_page {
											nodes {
												id
											}
										}
									}
									cursor
								}
							}
							cursor
						}
					}
				}
			`
		)
	).toMatchInlineSnapshot(`
		{
		  "user": {
		    "comments_page": {
		      "cursor": null,
		      "nodes": [
		        {
		          "likes_page": {
		            "nodes": [
		              {
		                "id": 1,
		              },
		            ],
		          },
		          "text": "I am so good.",
		        },
		      ],
		    },
		    "name": "Alice",
		    "posts_page": {
		      "cursor": "[\\"2\\"]",
		      "nodes": [
		        {
		          "author": {
		            "name": "Alice",
		          },
		          "comments_page": {
		            "cursor": "[\\"2\\"]",
		            "nodes": [
		              {
		                "likes_page": {
		                  "nodes": [
		                    {
		                      "id": 1,
		                    },
		                  ],
		                },
		                "text": "I am so good.",
		              },
		              {
		                "likes_page": {
		                  "nodes": [],
		                },
		                "text": "Boring.",
		              },
		            ],
		          },
		          "text": "Oil price rising.",
		        },
		        {
		          "author": {
		            "name": "Alice",
		          },
		          "comments_page": {
		            "cursor": null,
		            "nodes": [],
		          },
		          "text": "Is communism dead yet?",
		        },
		      ],
		    },
		  },
		}
	`)
})
