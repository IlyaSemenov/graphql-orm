// Regression test for https://github.com/IlyaSemenov/objection-graphql-resolver/issues/1

import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "../setup"

class CModel extends Model {
  static tableName = "c"
  id?: string

  // no relationMappings defined on purpose
}

const schema = gql`
  type C {
    id: ID!
  }

  type Query {
    all_c: [C!]!
  }
`

const graph = r.graph({
  C: r.model(CModel),
})

const resolvers: Resolvers = {
  Query: {
    all_c: (_parent, _args, context, info) =>
      graph.resolve(CModel.query(), { context, info }),
  },
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("c", (c) => {
  c.string("id").primary()
})

test("allow model without relationMappings", async () => {
  await CModel.query().insert({ id: "foo" })

  assert.deepEqual(
    await client.request(gql`
      {
        all_c {
          id
        }
      }
    `),
    {
      all_c: [{ id: "foo" }],
    },
  )
})
