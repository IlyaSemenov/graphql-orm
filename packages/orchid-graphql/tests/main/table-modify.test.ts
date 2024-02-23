import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { expect, test } from "vitest"

import {
	BaseTable,
	create_client,
	create_db,
	ResolverContext,
	Resolvers,
} from "../setup"

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
		users: [User!]!
	}
`

const graph = r.graph<ResolverContext>({
	User: r.table(db.user, {
		modify(query, { context }) {
			const { user_id } = context
			return user_id ? query.whereNot({ id: user_id }) : query
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

const client = await create_client({ typeDefs: schema, resolvers })

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
