import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { expect, test } from "vitest"

import { Resolvers, setup } from "../setup"

class UserModel extends Model {
	static tableName = "user"

	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "user.id", to: "post.author_id" },
			},
		}
	}

	id?: number
	name?: string
	posts?: PostModel[]
}

class SectionModel extends Model {
	static tableName = "section"

	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "section.id", to: "post.section_id" },
			},
		}
	}

	id?: number
	name?: string
	posts?: PostModel[]
}

class PostModel extends Model {
	static tableName = "post"

	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "post.author_id", to: "user.id" },
			},
			section: {
				relation: Model.BelongsToOneRelation,
				modelClass: SectionModel,
				join: { from: "post.section_id", to: "section.id" },
			},
		}
	}

	id?: number
	text?: string
	author_id?: number
	author?: UserModel
	section_id?: number
	section?: SectionModel
}

const schema = gql`
	type User {
		id: Int!
		name: String!
		posts(cursor: String, take: Int): PostPage!
		posts_page(cursor: String, take: Int): PostPage!
		posts_by_one(cursor: String, take: Int): PostPage!
		all_posts: [Post!]!
		all_posts_verbose: [Post!]!
	}

	type Section {
		id: Int!
		name: String!
		posts(cursor: String, take: Int): PostPage!
	}

	type SectionPage {
		nodes: [Section!]!
		cursor: ID
	}

	type Post {
		id: Int!
		text: String!
		author: User!
		section: Section!
	}

	type PostPage {
		nodes: [Post!]!
		cursor: ID
	}

	type Query {
		user(id: Int!): User
	}
`

const graph = r.graph({
	User: r.model(UserModel, {
		fields: {
			id: true,
			name: true,
			posts: r.page(r.cursor({ take: 2 })),
			// TODO: test the fields below
			posts_page: r.page(r.cursor({ take: 2 }), {
				modelField: "posts",
			}),
			posts_by_one: r.page(r.cursor({ take: 1 }), {
				modelField: "posts",
			}),
			all_posts: "posts",
			all_posts_verbose: r.relation({ modelField: "posts" }),
		},
	}),
	Section: r.model(SectionModel, {
		fields: {
			id: true,
			name: true,
			posts: r.page(r.cursor({ take: 2 }), {
				filters: true,
			}),
		},
	}),
	Post: r.model(PostModel),
})

const resolvers: Resolvers = {
	Query: {
		user(_parent, { id }, ctx, info) {
			return graph.resolve(ctx, info, UserModel.query().findById(id))
		},
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

test("nested pagination", async () => {
	await knex.schema.createTable("user", (user) => {
		user.increments("id").notNullable().primary()
		user.string("name").notNullable()
	})

	await knex.schema.createTable("section", (section) => {
		section.increments("id").notNullable().primary()
		section.string("name").notNullable()
	})

	await knex.schema.createTable("post", (post) => {
		post.increments("id").notNullable().primary()
		post.string("text").notNullable()
		post.integer("author_id").notNullable().references("user.id")
		post.integer("section_id").notNullable().references("section.id")
	})

	await UserModel.query().insertGraph([
		{ name: "Alice" },
		{ name: "Bob" },
		{ name: "Charlie" },
	])

	await SectionModel.query().insertGraph([
		{ name: "News" },
		{ name: "Editorial" },
		{ name: "COVID-19" },
	])

	await PostModel.query().insertGraph(
		[
			{ author_id: 1, section_id: 1, text: "Oil price rising." },
			{ author_id: 1, section_id: 2, text: "Is communism dead yet?" },
			{ author_id: 2, section_id: 3, text: "Latest COVID figures." },
			{ author_id: 2, section_id: 1, text: "Good news from China." },
			{ author_id: 2, section_id: 1, text: "More good news!" },
			{ author_id: 1, section_id: 3, text: "COVID vs Flu?" },
		],
		{ relate: true }
	)

	expect(
		await client.request(
			gql`
				{
					user(id: 1) {
						name
						posts {
							nodes {
								id
								text
								section {
									name
								}
							}
							cursor
						}
					}
				}
			`
		)
	).toMatchSnapshot("nested pagination")

	expect(
		await client.request(
			gql`
				{
					user(id: 1) {
						id
						name
						posts {
							nodes {
								id
								text
								author {
									name
								}
								section {
									name
									posts {
										nodes {
											text
											author {
												name
											}
											section {
												name
											}
										}
										cursor
									}
								}
							}
							cursor
						}
					}
				}
			`
		)
	).toMatchSnapshot("double nested pagination")

	expect(
		await client.request(
			gql`
				{
					user(id: 2) {
						name
						posts {
							nodes {
								text
								author {
									name
									posts {
										nodes {
											text
											author {
												name
											}
										}
									}
								}
							}
							cursor
						}
					}
				}
			`
		)
	).toMatchSnapshot("triple nested pagination")
})
