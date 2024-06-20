import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { expect, test } from "vitest"

import type { Resolvers } from "../setup"
import { setup } from "../setup"

class PostModel extends Model {
  static tableName = "post"

  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: CommentModel,
        join: { from: "comment.post_id", to: "post.id" },
      },
    }
  }

  id?: number
  text?: string
  comments?: CommentModel[]
}

class CommentModel extends Model {
  static tableName = "comment"

  id?: number
  text?: string
  post_id?: number
}

const schema = gql`scalar Filter

type Post {
  id: Int!
  text: String!
  all_comments: [Comment!]!
}

type Comment {
  id: Int!
  text: String!
}

type Query {
  post(id: ID!): Post!
}
`

const graph = r.graph(
  {
    Post: r.model(PostModel, {
      fields: {
        all_comments: r.relation({
          // Using modelField, not tableField
          modelField: "comments",
        }),
      },
    }),
    Comment: r.model(CommentModel),
  },
  {
    allowAllFields: true,
  },
)

const resolvers: Resolvers = {
  Query: {
    post(_parent, args, context, info) {
      return graph.resolve(PostModel.query().findById(args.id), {
        context,
        info,
      })
    },
  },
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("post", (post) => {
  post.increments("id").notNullable().primary()
  post.string("text").notNullable()
})

await knex.schema.createTable("comment", (post) => {
  post.increments("id").notNullable().primary()
  post.string("text").notNullable()
  post.integer("post_id").notNullable().references("post.id")
})

test("filters", async () => {
  await PostModel.query().insertGraph(
    [
      {
        text: "Oil price rising.",
        comments: [
          { text: "Oh noes!" },
          { text: "Who cares, I have a Tesla." },
        ],
      },
      { text: "Is communism dead yet?", comments: [{ text: "[redacted]" }] },
    ],
    { relate: true },
  )

  expect(
    await client.request(gql`{
  post(id: 1) {
    id
    text
    all_comments {
      id
      text
    }
  }
}
`),
  ).toMatchInlineSnapshot(`
    {
      "post": {
        "all_comments": [
          {
            "id": 1,
            "text": "Oh noes!",
          },
          {
            "id": 2,
            "text": "Who cares, I have a Tesla.",
          },
        ],
        "id": 1,
        "text": "Oil price rising.",
      },
    }
  `)
})
