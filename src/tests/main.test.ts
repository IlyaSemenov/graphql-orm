import "objection-fetch-graphql"

import { ApolloServer } from "apollo-server"
import { GraphQLResolveInfo } from "graphql"
import { GraphQLClient } from "graphql-request"
import gql from "graphql-tag"
import Knex from "knex"
import { Model } from "objection"
import tap from "tap"

type Test = typeof tap.Test.prototype

const schema = gql`
	type User {
		id: ID!
		name: String
		posts: [Post!]!
	}

	type Section {
		id: ID!
		slug: String!
	}

	type Post {
		id: ID!
		author: User!
		section: Section
		title: String
		text: String
	}

	scalar Filter

	type Query {
		user(id: ID!): User
		posts(filter: Filter): [Post!]!
	}
`

type Resolver<A> = (
	parent: unknown,
	args: A,
	ctx: unknown,
	info: GraphQLResolveInfo,
) => any

const resolvers: Record<string, Record<string, Resolver<any>>> = {
	Query: {
		user: (parent, { id }, ctx: unknown, info) => {
			return UserModel.query().findById(id).fetchGraphQL(info)
		},
		posts: (parent, { filter }, ctx, info) => {
			return PostModel.query().fetchGraphQL(info, { filter })
		},
	},
}

class UserModel extends Model {
	static tableName = "users"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
		}
	}

	declare id?: number
	declare name?: string
	declare posts?: PostModel[]
}

class SectionModel extends Model {
	static tableName = "sections"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.section_id", to: "sections.id" },
			},
		}
	}

	declare id?: number
	declare slug?: string
	declare posts?: PostModel[]
}

class PostModel extends Model {
	static tableName = "posts"
	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
			section: {
				relation: Model.BelongsToOneRelation,
				modelClass: SectionModel,
				join: { from: "posts.section_id", to: "sections.id" },
			},
		}
	}

	declare id?: number
	declare title?: string | null
	declare text?: string | null
	declare author?: UserModel
	declare section?: SectionModel
}

async function use_db(tap: Test) {
	const knex = Knex({ client: "sqlite3", connection: ":memory:" })
	tap.tearDown(async () => {
		await knex.destroy()
	})
	Model.knex(knex)
	await knex.schema.createTable("users", function (table) {
		table.integer("id").primary()
		table.string("name")
	})
	await knex.schema.createTable("sections", function (table) {
		table.integer("id").primary()
		table.string("slug").notNullable()
	})
	await knex.schema.createTable("posts", function (table) {
		table.integer("id").primary()
		table.string("title")
		table.string("text")
		table.integer("author_id").notNullable()
		table.foreign("author_id").references("id").inTable("users")
		table.integer("section_id")
		table.foreign("section_id").references("id").inTable("sections")
	})
}

async function use_client(tap: Test) {
	const server = new ApolloServer({ typeDefs: schema, resolvers })
	tap.tearDown(async () => {
		await server.stop()
	})
	const { url } = await server.listen(0)
	return new GraphQLClient(url)
}

tap.test("Main", async (tap) => {
	await use_db(tap)
	const client = await use_client(tap)

	await UserModel.query().insertGraph([
		{ id: 1, name: "John" },
		{ id: 2, name: "Mary" },
	])

	await SectionModel.query().insertGraph([{ id: 1, slug: "test" }])

	await PostModel.query().insertGraph(
		[
			{
				id: 1,
				author: { id: 1 },
				section: { id: 1 },
				title: "Hello",
				text: "Hello, world!",
			},
			{ id: 2, author: { id: 1 }, title: "Bye", text: "Bye-bye, cruel world!" },
			{ id: 3, author: { id: 2 }, title: "Foo" },
			{ id: 4, author: { id: 2 }, section: { id: 1 }, title: "Bar" },
		],
		{ relate: true },
	)

	tap.matchSnapshot(
		await client.request(
			gql`
				{
					user(id: 1) {
						id
						name
						posts {
							id
							title
							text
						}
					}
				}
			`,
		),
		"User with id 1 and his posts",
	)

	tap.same(
		await client.request(
			gql`
				{
					user(id: 800) {
						id
						name
					}
				}
			`,
		),
		{ user: null },
	)

	tap.matchSnapshot(
		await client.request(
			gql`
				{
					posts(filter: { author_id: 2 }) {
						id
						title
						author {
							name
						}
					}
				}
			`,
		),
		"Posts where author_id=2",
	)

	tap.matchSnapshot(
		await client.request(
			gql`
				{
					posts(filter: { title__in: ["Hello", "Foo"] }) {
						id
						title
					}
				}
			`,
		),
		"Posts where title is Hello or Foo",
	)

	tap.matchSnapshot(
		await client.request(
			gql`
				{
					posts(filter: { section_id: 1 }) {
						id
						title
						author {
							name
						}
						section {
							slug
						}
					}
				}
			`,
		),
		"Posts with both author and section",
	)
})
