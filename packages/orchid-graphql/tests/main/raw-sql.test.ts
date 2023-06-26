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

await db.$adapter.query(`
	create table "user" (
		id serial primary key,
		name varchar(100) not null
	);
`)

const schema = gql`
	type User {
		id: Int!
		name: String!
		upper_name: String!
	}

	type Query {
		user(id: Int!): User
	}
`

const graph = r.graph({
	User: r.table(db.user, {
		fields: {
			id: true,
			name: true,
			upper_name: (q) =>
				q.select({
					upper_name: q.sql<string>`upper("user".name)`,
				}),
		},
	}),
})

const resolvers: Resolvers = {
	Query: {
		async user(_parent, args, context, info) {
			return await graph.resolve(db.user.findOptional(args.id), {
				context,
				info,
			})
		},
	},
}

const client = await create_client({ typeDefs: schema, resolvers })

test("raw sql", async () => {
	await db.user.create({ name: "Alice" })

	assert.deepEqual(
		await client.request(
			gql`
				{
					user(id: 1) {
						upper_name
					}
				}
			`
		),
		{
			user: { upper_name: "ALICE" },
		}
	)
})
