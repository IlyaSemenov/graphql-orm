import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, expect, test } from "vitest"

import { Resolvers, setup } from "../setup"

class UserModel extends Model {
  static tableName = "user"

  id?: number
  name?: string
  password?: string
}

const schema = gql`
  type User {
    id: Int!
    name: String!
    password: String!
  }

  type Query {
    default_user(id: Int!): User
    default_user1(id: Int!): User
    secure_user(id: Int!): User
    user1(id: Int!): User
    user2(id: Int!): User
  }
`

const default_graph = r.graph({
  User: r.model(UserModel),
})

const default_graph1 = r.graph(
  {
    User: r.model(UserModel),
  },
  { allowAllFields: false },
)

const secure_graph = r.graph({
  User: r.model(UserModel, {
    fields: {
      id: true,
      name: true,
    },
  }),
})

const graph1 = r.graph({
  User: r.model(UserModel, {
    allowAllFields: true,
    fields: {
      id: true,
      name: true,
    },
  }),
})

const graph2 = r.graph(
  {
    User: r.model(UserModel, {
      fields: {
        id: true,
        name: true,
      },
    }),
  },
  { allowAllFields: true },
)

const resolvers: Resolvers = {
  Query: {
    default_user(_parent, { id }, context, info) {
      return default_graph.resolve(UserModel.query().findById(id), {
        context,
        info,
      })
    },
    default_user1(_parent, { id }, context, info) {
      return default_graph1.resolve(UserModel.query().findById(id), {
        context,
        info,
      })
    },
    secure_user(_parent, { id }, context, info) {
      return secure_graph.resolve(UserModel.query().findById(id), {
        context,
        info,
      })
    },
    user1(_parent, { id }, context, info) {
      return graph1.resolve(UserModel.query().findById(id), { context, info })
    },
    user2(_parent, { id }, context, info) {
      return graph2.resolve(UserModel.query().findById(id), { context, info })
    },
  },
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", function (table) {
  table.increments("id").notNullable().primary()
  table.string("name").notNullable()
  table.string("password").notNullable()
})

test("model resolver fields access", async () => {
  await UserModel.query().insertGraph([{ name: "Alice", password: "secret" }])

  assert.deepEqual(
    await client.request(gql`
      {
        user: default_user(id: 1) {
          id
          name
          password
        }
      }
    `),
    {
      user: { id: 1, name: "Alice", password: "secret" },
    },
    "default user",
  )

  await expect(
    client.request(gql`
      {
        user: default_user1(id: 1) {
          id
          name
          password
        }
      }
    `),
  ).rejects.toThrow(
    "Resolver for type User must either allow all fields or specify options.fields.",
  )

  assert.deepEqual(
    await client.request(gql`
      {
        user: secure_user(id: 1) {
          id
          name
        }
      }
    `),
    {
      user: { id: 1, name: "Alice" },
    },
    "secure user without password",
  )

  await expect(
    client.request(gql`
      {
        user: secure_user(id: 1) {
          id
          name
          password
        }
      }
    `),
  ).rejects.toThrow("No field resolver defined for field User.password")

  assert.deepEqual(
    await client.request(gql`
      {
        user: user1(id: 1) {
          id
          name
          password
        }
      }
    `),
    {
      user: { id: 1, name: "Alice", password: "secret" },
    },
    "model-level allowAllFields",
  )

  assert.deepEqual(
    await client.request(gql`
      {
        user: user2(id: 1) {
          id
          name
          password
        }
      }
    `),
    {
      user: { id: 1, name: "Alice", password: "secret" },
    },
    "graph-level allowAllFields",
  )
})
