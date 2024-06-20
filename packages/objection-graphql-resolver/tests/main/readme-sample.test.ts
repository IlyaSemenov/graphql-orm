// Repeat demo sample from README.md

import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class PostModel extends Model {
  static tableName = "post"

  id?: number
  text?: string
}

const typeDefs = gql`type Post {
  id: Int!
  text: String!
}

type Mutation {
  create_post(text: String!): Post!
}

type Query {
  posts: [Post!]!
}
`

const graph = r.graph({
  Post: r.model(PostModel),
})

const resolvers: Resolvers = {
  Mutation: {
    async create_post(_parent, args, context, info) {
      const post = await PostModel.query().insert(args)
      return graph.resolve(post.$query(), { context, info })
    },
  },
  Query: {
    posts(_parent, _args, context, info) {
      return graph.resolve(PostModel.query().orderBy("id"), { context, info })
    },
  },
}

const { client, knex } = await setup({ typeDefs, resolvers })

await knex.schema.createTable("post", (post) => {
  post.increments("id")
  post.text("text").notNullable()
})

test("readme demo sample", async () => {
  await client.request(
    gql`mutation create_post($text: String!) {
  new_post: create_post(text: $text) {
    id
  }
}
`,
    { text: "Hello, world!" },
  )

  const { posts } = await client.request<any>(gql`query {
  posts {
    id
    text
  }
}
`)

  assert.deepEqual(posts, [{ id: 1, text: "Hello, world!" }])
})
