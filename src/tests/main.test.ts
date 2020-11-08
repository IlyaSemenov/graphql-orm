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

	type Post {
		id: ID!
		title: String
		text: String
		author: User
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

class PostModel extends Model {
	static tableName = "posts"
	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
		}
	}

	declare id?: number
	declare title?: string
	declare text?: string
	declare author?: UserModel
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
	await knex.schema.createTable("posts", function (table) {
		table.integer("id").primary()
		table.string("title")
		table.string("text")
		table.integer("author_id").notNullable()
		table.foreign("author_id").references("id").inTable("users")
	})
}

async function use_client(tap: Test) {
	const server = new ApolloServer({ typeDefs: schema, resolvers })
	tap.tearDown(async () => {
		await server.stop()
	})
	const { url } = await server.listen(0)
	console.log("Listening on", url)
	return new GraphQLClient(url)
}

tap.test("Main", async (tap) => {
	await use_db(tap)
	const client = await use_client(tap)

	await UserModel.query().insertGraph([
		{
			id: 1,
			name: "John",
			posts: [
				{ id: 1, title: "Hello", text: "Hello, world!" },
				{ id: 2, title: "Bye", text: "Bye-bye, cruel world!" },
			],
		},
		{
			id: 2,
			name: "Mary",
			posts: [
				{ id: 3, title: "Foo" },
				{ id: 4, title: "Bar" },
			],
		},
	])

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
})
