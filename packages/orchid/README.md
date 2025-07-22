# orchid-graphql

A helper library to resolve GraphQL queries directly with [Orchid ORM](https://orchid-orm.netlify.app) tables and relations.

- Highly effective: selects only requested fields and relations.
- Unlimited nested resolvers.
- Pagination.
- Filters like `{ date: "2020-10-01", category__in: ["News", "Politics"] }`.
- Hook into (sub)queries with query modifiers.
- Hook into field results to restrict access to sensitive information.

_Note that there is a sister project: `objection-graphql-resolver` which does the same for [Objection.js ORM](https://vincit.github.io/objection.js/)._

## Status and limitations

This is pre-release and not battle tested. `orchid-graphql` is a quick adaptation of `objection-graphql-resolver`.

In particular the typings are not ready. The resolver returns a generic `Query` most of the time.

## Install

```sh
npm i orchid-graphql
```

## Minimal all-in-one example

Run GraphQL server:

```ts
// Everything is put into a single file for demonstration purposes.
//
// In real projects, you will want to separate tables, typedefs,
// resolvers, and the server into their own modules.

import { ApolloServer, ApolloServerOptions } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import gql from "graphql-tag"
import * as r from "orchid-graphql"
import { createBaseTable, orchidORM } from "orchid-orm"

// Define database tables

const BaseTable = createBaseTable()

class PostTable extends BaseTable {
  readonly table = "post"
  columns = this.setColumns(t => ({
    id: t.identity().primaryKey(),
    text: t.text(0, 5000),
  }))
}

const db = orchidORM(
  {
    databaseURL: process.env.DATABASE_URL,
    log: true,
  },
  {
    post: PostTable,
  },
)

await db.$query`
  create table post (
    id serial primary key,
    text text not null
  );
`

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

// Map GraphQL types to table resolvers

const graph = r.graph({
  Post: r.table(db.post),
})

// Define resolvers

const resolvers: ApolloServerOptions<any>["resolvers"] = {
  Mutation: {
    async create_post(_parent, args, context, info) {
      const post = await db.post.create(args)
      return await graph.resolve(db.post.find(post.id), { context, info })
    },
  },
  Query: {
    async posts(_parent, _args, context, info) {
      return await graph.resolve(db.post, { context, info })
    },
  },
}

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

Relations will be fetched automatically when resolving nested fields.

Example:

```ts
const graph = r.graph({
  User: r.type(db.user),
  Post: r.type(db.post),
})
```

```gql
query posts_with_author {
  posts {
    id
    text
    # will use subquery if requested
    author {
      name
    }
  }
}

query user_with_posts($id: ID!) {
  user(id: $id) {
    name
    # will use subquery if requested
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
  User: r.type(db.user, {
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
  User: r.type(db.user, {
    fields: {
      id: true,
      name: true,
      // user.posts will be a page with nodes and continuation cursor
      posts: r.page(r.cursor({ fields: ["-id"], take: 10 })),
    },
  }),
  Post: r.type(db.post),
})
```

To paginate root query, use:

```ts
const resolvers = {
  Query: {
    posts: async (parent, args, context, info) => {
      return await graph.resolvePage(
        db.post,
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

Filters will run against database fields, or call field modifiers.

[More details and examples for filters.](docs/filters.md)

## API

```ts
import * as r from "orchid-graphql"

const graph = r.graph(
  // Map GraphQL types to table resolvers (required)
  {
    Post: r.table(
      // orchid-orm bound table (required)
      db.post,
      // Table resolver options
      {
        // List fields that can be accessed via GraphQL
        // if not provided, all fields can be accessed
        fields: {
          // Select field from database
          id: true,
          // Descend into relation
          // (related table must be also registered in this graph resolver)
          author: true,
          // Modify query when this field is resolved
          preview: q =>
            q.select({ preview: q.sql <string>`substr(text,1,100)` }),
          // Same as text: true
          text: r.field(),
          // Custom field resolver
          text2: r.field({
            // Table field, if different from GraphQL field
            tableField: "text",
          }),
          preview2: r.field({
            // Modify query
            modify: q =>
              q.select({ preview2: q.sql <string>`substr(text,1,100)` }),
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
            // Table field, if different from GraphQL field
            tableField: "comments",
            // Enable filters on -to-many relation
            filters: true,
            // Modify subquery
            modify: (q, { liked }) => q.where({ liked }).order({ id: "DESC" }),
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
              tableField: "comments",
            },
          ),
        },
        // Modify all queries to this table
        modify: (
          // ORM (sub)query
          query,
          // Table resolve context: graph, tree, type, filters, context
          context,
        ) => query.where(context.tree.args).order({ id: "DESC" }),
        // Allow all fields (`fields` will be used for overrides)
        allowAllFields: true,
        // Allow filters in all relations
        allowAllFilters: true,
      },
    ),
  },
  // Graph options
  {
    // Allow all fields in all tables (`fields` will be used for overrides)
    allowAllFields: true,
    // Allow filters in all relations of all tables
    allowAllFilters: true,
  },
)

const resolvers = {
  Query: {
    posts: async (parent, args, context, info) => {
      return await graph.resolve(
        // Root query (required)
        db.post,
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
    posts_page: async (parent, args, context, info) => {
      return await graph.resolvePage(
        // Root query (required)
        db.post,
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

graph.resolve(db.user.find(1), {
  // As comes from Apollo
  context,
  // As comes from Apollo
  info,
  // If resolving subfield
  path: ["subfield"],
})
```
