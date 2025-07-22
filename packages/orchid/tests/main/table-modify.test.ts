import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { expect, test } from "vitest"

import type {
	ResolverContext,
	Resolvers,
} from "../setup"
import {
	BaseTable,
	createClient,
	createDb,
} from "../setup"

class UserTable extends BaseTable {
	readonly table = "user"

	columns = this.setColumns(t => ({
		id: t.identity().primaryKey(),
		name: t.text(),
	}))
}

const db = await createDb({
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
		users: [User!]!
	}
`

const graph = r.graph<ResolverContext>({
	User: r.table(db.user, {
		modify(query, { context }) {
			const { userId } = context
			return userId ? query.whereNot({ id: userId }) : query
		},
	}),
})

const resolvers: Resolvers = {
	Query: {
		async users(_parent, _args, context, info) {
			return await graph.resolve(db.user, { context, info })
		},
	},
}

const client = await createClient({ typeDefs: schema, resolvers })

test("table modify", async () => {
	await db.user.create({ name: "Alice" })
	await db.user.create({ name: "Bob" })
	await db.user.create({ name: "Charlie" })

	expect(
		await client.request(
			gql`
				{
					users {
						name
					}
				}
			`,
			undefined,
			{ user_id: "2" },
		),
	).toMatchInlineSnapshot(`
		{
		  "users": [
		    {
		      "name": "Alice",
		    },
		    {
		      "name": "Charlie",
		    },
		  ],
		}
	`)
})
