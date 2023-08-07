import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { assert, test } from "vitest"

import { BaseTable, create_client, create_db, Resolvers } from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns((t) => ({
		id: t.identity().primaryKey(),
		name: t.string(1, 100),
	}))
}

const db = await create_db({
	user: UserTable,
})

await db.$query`
	create table "user" (
		id serial primary key,
		name varchar(100) not null
	);
`

const schema = gql`
	type User {
		id: Int!
		name: String!
	}

	type Query {
		user(id: Int!): User
	}

	type Mutation {
		login(id: Int!): LoginResult!
	}

	type LoginResult {
		token: String!
		user: User!
	}
`

const graph = r.graph({
	User: r.table(db.user),
})

const resolvers: Resolvers = {
	Query: {},
	Mutation: {
		async login(_parent, args, context, info) {
			const user = await graph.resolve(db.user.find(args.id), {
				context,
				info,
				path: ["user"],
			})
			const token = "yammy"
			return { user, token }
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("root query sub-field", async () => {
	await db.user.create({ name: "Alice" })

	await client.request(gql`
		mutation {
			login(id: 1) {
				token
				user {
					name
				}
			}
		}
	`)
})
