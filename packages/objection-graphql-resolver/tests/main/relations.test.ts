import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { expect, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class UserModel extends Model {
  static tableName = "user"

  static get relationMappings() {
    return {
      posts: {
        relation: Model.HasManyRelation,
        modelClass: PostModel,
        join: { from: "user.id", to: "post.author_id" },
      },
    }
  }

  id?: number
  name?: string
  posts?: PostModel[]
}

class PostModel extends Model {
  static tableName = "post"

  static get relationMappings() {
    return {
      author: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: { from: "post.author_id", to: "user.id" },
      },
    }
  }

  id?: number
  text?: string
  author_id?: number
  author?: UserModel
}

const schema = gql`scalar Filter

type User {
  id: Int!
  name: String!
  posts: [Post!]!
}

type Post {
  id: Int!
  text: String!
  author: User!
}

type Query {
  posts: [Post!]!
}
`

const graph = r.graph(
  {
    User: r.model(UserModel),
    Post: r.model(PostModel),
  },
  {
    allowAllFields: true,
  },
)

const resolvers: Resolvers = {
  Query: {
    posts(_parent, _args, context, info) {
      return graph.resolve(PostModel.query(), { context, info })
    },
  },
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("user", (user) => {
  user.increments("id").notNullable().primary()
  user.string("name").notNullable()
})

await knex.schema.createTable("post", (post) => {
  post.increments("id").notNullable().primary()
  post.string("text").notNullable()
  post.integer("author_id").notNullable().references("user.id")
})

test("filters", async () => {
  await UserModel.query().insertGraph([
    { name: "Alice" },
    { name: "Bob" },
    { name: "Charlie" },
  ])

  await PostModel.query().insertGraph(
    [
      { author_id: 1, text: "Oil price rising." },
      { author_id: 1, text: "Is communism dead yet?" },
      { author_id: 2, text: "Latest COVID news." },
    ],
    { relate: true },
  )

  expect(
    await client.request(gql`{
  posts {
    id
    text
    author {
      id
      name
    }
  }
}
`),
  ).toMatchInlineSnapshot(`
    {
      "posts": [
        {
          "author": {
            "id": 1,
            "name": "Alice",
          },
          "id": 1,
          "text": "Oil price rising.",
        },
        {
          "author": {
            "id": 1,
            "name": "Alice",
          },
          "id": 2,
          "text": "Is communism dead yet?",
        },
        {
          "author": {
            "id": 2,
            "name": "Bob",
          },
          "id": 3,
          "text": "Latest COVID news.",
        },
      ],
    }
  `)

  expect(
    await client.request(gql`{
  posts {
    id
    text
    author {
      id
      name
      posts {
        id
        text
      }
    }
  }
}
`),
  ).toMatchInlineSnapshot(`
    {
      "posts": [
        {
          "author": {
            "id": 1,
            "name": "Alice",
            "posts": [
              {
                "id": 1,
                "text": "Oil price rising.",
              },
              {
                "id": 2,
                "text": "Is communism dead yet?",
              },
            ],
          },
          "id": 1,
          "text": "Oil price rising.",
        },
        {
          "author": {
            "id": 1,
            "name": "Alice",
            "posts": [
              {
                "id": 1,
                "text": "Oil price rising.",
              },
              {
                "id": 2,
                "text": "Is communism dead yet?",
              },
            ],
          },
          "id": 2,
          "text": "Is communism dead yet?",
        },
        {
          "author": {
            "id": 2,
            "name": "Bob",
            "posts": [
              {
                "id": 3,
                "text": "Latest COVID news.",
              },
            ],
          },
          "id": 3,
          "text": "Latest COVID news.",
        },
      ],
    }
  `)
})
