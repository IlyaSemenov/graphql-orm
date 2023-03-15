# objection-graphql-resolver

A helper library to resolve GraphQL queries directly with [Objection.js](https://vincit.github.io/objection.js/) models and relations.

- Highly effective: selects only requested fields and relations (using fine-tuned `withGraphFetched`).
- Supports unlimited nested resolvers (traversing `relationMappings`).
- Supports pagination.
- Supports virtual attributes.
- Supports filters like `{ date: "2020-10-01", category__in: ["News", "Politics"] }`.
- Hooks into subqueries with query modifiers.
- Hooks into field results to restrict access to sensitive information.

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

import { ApolloServer } from "apollo-server"
import gql from "graphql-tag"
import Knex from "knex"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"

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

const resolveGraph = GraphResolver({
  Post: ModelResolver(PostModel),
})

// Define resolvers

const resolvers = {
  Mutation: {
    async create_post(_parent, args, ctx, info) {
      const post = await PostModel.query().insert(args)
      return resolveGraph(ctx, info, post.$query())
    },
  },
  Query: {
    posts(_parent, _args, ctx, info) {
      return resolveGraph(ctx, info, PostModel.query().orderBy("id"))
    },
  },
}

// Configure database backend

const knex = Knex({ client: "sqlite3", connection: ":memory:" })
Model.knex(knex)

async function migrate() {
  await knex.schema.createTable("post", (post) => {
    post.increments("id")
    post.text("text").notNullable()
  })
}

migrate()

// Start GraphQL server

async function start() {
  const server = new ApolloServer({ typeDefs, resolvers })
  const { url } = await server.listen({ port: 4000 })
  console.log(`Listening on ${url}`)
}

start()
```

Query it with GraphQL client:

```ts
import { GraphQLClient } from "graphql-request"
import gql from "graphql-tag"

const client = new GraphQLClient("http://127.0.0.1:4000")

async function main() {
  await client.request(
    gql`
      mutation create_post($text: String!) {
        new_post: create_post(text: $text) {
          id
        }
      }
    `,
    { text: "Hello, world!" }
  )

  const { posts } = await client.request(
    gql`
      query {
        posts {
          id
          text
        }
      }
    `
  )

  console.log(posts)
}

main()
```

## Relations

Relations will be fetched automatically using `withGraphFetched()` when resolving nested fields.

Example:

```ts
const resolveGraph = GraphResolver({
  User: ModelResolver(UserModel, {
    fields: {
      id: true,
      name: true,
      // will use withGraphFetched("posts")
      // and process subquery with Post model resolver defined below
      posts: true,
    },
  }),
  // No resolver options = access to all fields
  Post: ModelResolver(PostModel),
})
```

```graphql
query posts_with_author {
  posts {
    id
    text
    author {
      name
    }
  }
}

query user_with_posts {
  user(id: ID!) {
    name
    posts {
      id
      text
    }
  }
}
```

[More details and examples for relations.](docs/relations.md)

## Pagination

Root queries and -to-many nested relations can be paginated.

Example:

```ts
const resolveGraph = GraphResolver({
  User: ModelResolver(UserModel, {
    fields: {
      id: true,
      name: true,
      posts: RelationResolver({
        paginate: CursorPaginage({ take: 10, fields: ["-id"] }),
      }),
    },
  }),
  Post: ModelResolver(PostModel),
})
```

To paginate root query, use:

```ts
const resolvers = {
  Query: {
    posts: async (parent, args, ctx, info) => {
      const page = await resolveGraph(ctx, info, Post.query(), {
        paginate: CursorPaginator({ take: 10, fields: ["-id"] }),
      })
      return page
    },
  },
}
```

[More details and examples for pagination.](docs/pagination.md)

## Filters

Both root and nested queries can be filtered with GraphQL arguments:

```graphql
query {
  posts(filter: { date: "2020-10-01", author_id__in: [123, 456] }) {
    nodes {
      id
      text
    }
    cursor
  }
}
```

Filters will run against database fields, or call model modifiers.

To enable filters, use:

```ts
const resolveGraph = GraphResolver({
  Post: ModelResolver(PostModel, {
    // enable all filters for all fields
    filter: true,
    // TODO: granular access
    filter: {
      date: true,
      author_id: true,
      published: true, // where published is a model modifier
    },
  }),
})
```

[More details and examples for filters.](docs/filters.md)

## Virtual attributes

Virtual attributes (getters on models) can be accessed the same way as database fields:

```ts
export class PostModel extends Model {
  declare id: number
  declare title: string

  get url() {
    assert(this.id)
    return `/${this.id}.html`
  }
}
```

```graphql
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

The following functions are exported:

```ts
import {
  GraphResolver,
  ModuleResolver,
  FieldResolver,
  RelationResolver,
  CursorPaginator,
} from "objection-graphql-resolver"
```

### Arguments reference

```ts
const resolveGraph = GraphResolver(
  // Map GraphQL types to model resolvers (required)
  {
    Post: ModelResolver(
      // Required: Objection.js model class
      PostModel,
      // Default: { fields: true }
      {
        // List fields that can be accessed via GraphQL,
        // or true = all fields can be accessed
        fields: {
          // Select field from database
          id: true,
          // Call model getter with this name
          url: true,
          // Descend into relation
          // (related model must be also registered in this graph resolver)
          author: true,
          // Modify query when this field is resolved
          preview: (query) =>
            query.select(raw("substr(text,1,100) as preview")),
          // Same as text: true
          text: FieldResolver(),
          // Custom field resolver
          text2: FieldResolver({
            // Model (database) field, if different from GraphQL field
            modelField: "text",
          }),
          preview2: FieldResolver({
            // Modify query
            select: (query) =>
              query.select(raw("substr(text,1,100) as preview2")),
            // Post-process selected value
            clean(
              // Selected value
              preview,
              // Current instance
              post,
              // Query context
              context
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
          comments_page: RelationResolver({
            // Model field, if different from GraphQL field
            modelField: "comments",
            // Paginate subquery in -to-many relation
            paginate: CursorPaginator(
              // Pagination options
              // Default: { take: 10, fields: ["id"] }
              {
                // How many object to take per page
                take: 10,
                // Which fields to use for ordering
                // Prefix with - for descending sort
                fields: ["name", "-id"],
              }
            ),
            // Enable filters on -to-many relation
            filters: true,
            // Modify subquery
            modifier: (query, { args }) =>
              query.where(args).orderBy("id", "desc"),
            // Post-process selected value, see FieldResolver
            // clean: ...,
          }),
        },
        // Modify all queries to this model
        modifier: (query, { args }) => query.where(args).orderBy("id", "desc"),
      }
    ),
  },
  // Options (default: empty)
  {
    // Callback: convert RequestContext into query context
    // Default: merge RequestContext into query context as is
    context(ctx) {
      return { userId: ctx.passport.user.id }
    },
  }
)

const resolvers = {
  Query: {
    posts: async (parent, args, context, info) => {
      const page = await resolveGraph(
        // Resolver context (required)
        // Will be merged into query context,
        // possibly converted with GraphResolver's options.context callback
        context,
        // GraphQLResolveInfo object, as passed by GraphQL executor (required)
        info,
        // Root query (required)
        Post.query(),
        // Default: empty
        {
          // Paginator (only works for list queries)
          // Default: resolve list query as is
          paginate: CursorPaginator({ take: 10, fields: ["-id"] }),
          // Enable filters
          filters: true,
        }
      )
      return page
    },
  },
}
```
