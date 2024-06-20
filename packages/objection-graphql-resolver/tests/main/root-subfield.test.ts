import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class UserModel extends Model {
  static tableName = "user"

  id?: number
  name?: string
}

const schema = gql`type User {
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
  User: r.model(UserModel),
})

const resolvers: Resolvers = {
  Query: {},
  Mutation: {
    async login(_parent, args, context, info) {
      const user = await graph.resolve(UserModel.query().findById(args.id), {
        context,
        info,
        path: ["user"],
      })
      const token = "xyzzy"
      return { user, token }
    },
  },
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", (table) => {
  table.increments("id").notNullable().primary()
  table.string("name").notNullable()
})

test("root query sub-field", async () => {
  await UserModel.query().insert({ name: "Alice" })

  assert.deepEqual(
    await client.request(gql`mutation {
  login(id: 1) {
    token
    user {
      name
    }
  }
}
`),
    { login: { token: "xyzzy", user: { name: "Alice" } } },
  )

  // Regression: should not crash when diving to non-requested subfield
  assert.deepEqual(
    await client.request(gql`mutation {
  login(id: 1) {
    token
  }
}
`),
    { login: { token: "xyzzy" } },
  )
})
