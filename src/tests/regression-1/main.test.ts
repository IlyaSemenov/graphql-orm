import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, use_db, use_server } from "../setup"

class CModel extends Model {
	static tableName = "c"

	id!: string

	// Regression: model without relationMappings should not crash
}

const schema = gql`
	type C {
		id: String!
	}

	type Query {
		all_c: [C!]!
	}
`

const resolvers: Resolvers = {
	Query: {
		all_c: (_parent, _args, ctx, info) =>
			resolve_graph(ctx, info, CModel.query()),
	},
}

const resolve_graph = GraphResolver({ C: ModelResolver(CModel) })

tap.test("Main", async (tap) => {
	await use_db(tap)
	await Model.knex().schema.createTable("c", function (table) {
		table.string("id").primary()
	})
	await CModel.query().insert({ id: "foo" })

	const { client } = await use_server(tap, { typeDefs: schema, resolvers })

	await tap.test("fetch object", async (tap) => {
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
})
