# objection-graphql-resolver

A helper library to resolve GraphQL queries directly with [Objection.js](https://vincit.github.io/objection.js/) models and relations.

- Highly effective: selects only requested fields and relations (using fine-tuned `withGraphFetched`).
- Supports unlimited nested resolvers (traversing `relationMappings`).
- Supports pagination.
- Supports virtual attributes.
- Supports filters like `{ date: "2020-10-01", category__in: ["News", "Politics"] }`.
- Hooks into subqueries with query modifiers.
- Hooks into field results to restrict access to sensitive information.

_Note that there is a sister project: `orchid-graphql` which does the same for [Orchid ORM](https://orchid-orm.netlify.app)._

## Install

```sh
npm i objection-graphql-resolver
```

## Minimal all-in-one example

Run GraphQL server:

```ts
// Everything is put into a single file for demonstration purposes.
//
// In real projects, you will want to separate models, typedefs,
// model resolvers, and the server into their own modules.

import { ApolloServer, ApolloServerOptions } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import gql from "graphql-tag"
import Knex from "knex"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"

// Define Objection.js models

class PostModel extends Model {
  static tableName = "post"

  id?: number
  text?: string
}

// Define GraphQL schema

const typeDefs = gql`
  type Post {
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

// Map GraphQL types to model resolvers

const graph = r.graph({
  Post: r.model(PostModel),
})

// Define resolvers

const resolvers: ApolloServerOptions<any>["resolvers"] = {
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

// Configure database backend

const knex = Knex({ client: "sqlite3", connection: ":memory:" })
Model.knex(knex)

await knex.schema.createTable("post", (post) => {
  post.increments("id")
  post.text("text").notNullable()
})

// Start GraphQL server

const server = new ApolloServer({ typeDefs, resolvers })
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
})
console.log(`Listening on ${url}`)
```

Query it with GraphQL client:

```ts
import { GraphQLClient } from "graphql-request"
import gql from "graphql-tag"

const client = new GraphQLClient("http://127.0.0.1:4000")

await client.request(
  gql`
    mutation create_post($text: String!) {
      new_post: create_post(text: $text) {
        id
      }
    }
  `,
  { text: "Hello, world!" },
)

const { posts } = await client.request(gql`
  query {
    posts {
      id
      text
    }
  }
`)

console.log(posts)
```

## Relations

Relations will be fetched automatically using `withGraphFetched()` when resolving nested fields.

Example:

```ts
const graph = r.graph({
  User: r.model(UserModel),
  Post: r.model(PostModel),
})
```

```gql
query posts_with_author {
  posts {
    id
    text
    # will use withGraphFetched("author") if requested
    author {
      name
    }
  }
}

query user_with_posts($id: ID!) {
  user(id: $id) {
    name
    # will use withGraphFetched("posts") if requested
    posts {
      id
      text
    }
  }
}
```

[More details and examples for relations.](docs/relations.md)

## Fields access

Access to individual fields can be limited:

```ts
const graph = r.graph({
  User: r.model(UserModel, {
    fields: {
      id: true,
      name: true,
      // other fields not specified here, such as user password,
      // will not be accessible
    },
  }),
})
```

This API also allows to fine-tune field selectors, see [API](#api) section below.

## Pagination

Root queries and -to-many nested relations can be paginated.

```ts
const graph = r.graph({
  User: r.model(UserModel, {
    fields: {
      id: true,
      name: true,
      // user.posts will be a page with nodes and continuation cursor
      posts: r.page(r.cursor({ fields: ["-id"], take: 10 })),
    },
  }),
  Post: r.model(PostModel),
})
```

To paginate root query, use:

```ts
const resolvers = {
  Query: {
    posts: async (parent, args, context, info) => {
      return graph.resolvePage(
        PostModel.query(),
        r.cursor({ take: 10, fields: ["-id"] }),
        { context, info },
      )
    },
  },
}
```

[More details and examples for pagination.](docs/pagination.md)

## Filters

Both root and nested queries can be filtered with GraphQL arguments:

```gql
query {
  posts(filter: { date: "2020-10-01", author_id__in: [123, 456] }) {
    id
    date
    text
    author {
      id
      name
    }
  }
}
```

Filters will run against database fields, or call model modifiers.

[More details and examples for filters.](docs/filters.md)

## Virtual attributes

Virtual attributes (getters on models) can be accessed the same way as database fields:

```ts
class PostModel extends Model {
  declare id?: number
  declare title?: string

  get url() {
    assert(this.id)
    return `/${this.id}.html`
  }
}
```

```gql
query {
  posts {
    id
    title
    url
  }
}
```

[More details and examples for virtual attributes.](docs/virtual-attributes.md)

## API

```ts
import * as r from "objection-graphql-resolver"

const graph = r.graph(
  // Map GraphQL types to model resolvers (required)
  {
    Post: r.model(
      // Objection.js model class (required)
      PostModel,
      // Model resolver options
      {
        // List fields that can be accessed via GraphQL
        // if not provided, all fields can be accessed
        fields: {
          // Select field from database
          id: true,
          // Call model getter with this name
          url: true,
          // Descend into relation
          // (related model must be also registered in this graph resolver)
          author: true,
          // Modify query when this field is resolved
          preview: query =>
            query.select(raw("substr(text,1,100) as preview")),
          // Same as text: true
          text: r.field(),
          // Custom field resolver
          text2: r.field({
            // Model (database) field, if different from GraphQL field
            modelField: "text",
          }),
          preview2: r.field({
            // Modify query
            modify: query =>
              query.select(raw("substr(text,1,100) as preview2")),
            // Post-process selected value
            transform(
              // Selected value
              preview,
              // Current instance
              post,
              // Field resolve context: graph, tree, type, field, filters, context
              context,
            ) {
              if (preview.length < 100) {
                return preview
              } else {
                return preview + "..."
              }
            },
          }),
          // Select all objects in -to-many relation
          comments: true,
          // Select all objects in -to-many relation
          all_comments: r.relation({
            // Model field, if different from GraphQL field
            modelField: "comments",
            // Enable filters on -to-many relation
            filters: true,
            // Modify subquery
            modify: (query, { liked }) =>
              query.where({ liked }).orderBy("id", "desc"),
            // Post-process selected values, see r.field()
            // transform: ...,
          }),
          // Paginate subquery in -to-many relation
          comments_page: r.page(
            // Paginator
            r.cursor(
              // Pagination options
              // Default: { fields: ["id"], take: 10 }
              {
                // Which fields to use for ordering
                // Prefix with - for descending sort
                fields: ["name", "-id"],
                // How many object to take per page
                take: 10,
              },
            ),
            {
              // All r.relation() options, such as:
              modelField: "comments",
            },
          ),
        },
        // Modify all queries to this model
        modify: (
          // ORM (sub)query
          query,
          // Table resolve context: graph, tree, type, filters, context
          context,
        ) => query.where(context.tree.args).orderBy("id", "desc"),
        // Allow all fields (`fields` will be used for overrides)
        allowAllFields: true,
        // Allow filters in all relations
        allowAllFilters: true,
      },
    ),
  },
  // Graph options
  {
    // Allow all fields in all models (`fields` will be used for overrides)
    allowAllFields: true,
    // Allow filters in all models' relations
    allowAllFilters: true,
  },
)

const resolvers = {
  Query: {
    posts: (parent, args, context, info) => {
      return graph.resolve(
        // Root query (required)
        PostModel.query(),
        // Options (required)
        {
          // Resolver context
          context,
          // GraphQLResolveInfo object, as passed by GraphQL executor (required)
          info,
          // Enable filters
          filters: true,
        },
      )
    },
    posts_page: (parent, args, context, info) => {
      return graph.resolvePage(
        // Root query (required)
        PostModel.query(),
        // Paginator (required)
        r.cursor({ fields: ["-id"], take: 10 }),
        // Options (required) - see graph.resolve
        {
          context,
          info,
          filters: true,
        },
      )
    },
  },
}

graph.resolve(PostModel.query().findById(1), {
  // As comes from Apollo
  context,
  // As comes from Apollo
  info,
  // If resolving subfield
  path: ["subfield"],
})
```
