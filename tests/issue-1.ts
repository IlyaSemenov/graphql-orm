// Regression test for https://github.com/IlyaSemenov/objection-graphql-resolver/issues/1

import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

class CModel extends Model {
	static tableName = "c"
	id?: string
}

const schema = gql`
	type C {
		id: ID!
	}

	type Query {
		all_c: [C!]!
	}
`

const resolve_graph = GraphResolver({
	C: ModelResolver(CModel),
})

const resolvers: Resolvers = {
	Query: {
		all_c: (_parent, _args, ctx, info) =>
			resolve_graph(ctx, info, CModel.query()),
	},
}

tap.test("allow model without relationMappings", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs: schema, resolvers })

	await knex.schema.createTable("c", (c) => {
		c.string("id").primary()
	})

	await CModel.query().insert({ id: "foo" })

	tap.same(
		await client.request(
			gql`
				{
					all_c {
						id
					}
				}
			`
		),
		{
			all_c: [{ id: "foo" }],
		}
	)
})
