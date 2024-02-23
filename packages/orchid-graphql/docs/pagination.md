# Pagination

Root queries and -to-many nested relations can be paginated.

## Paginators

The specific shape of the page object and the pagination logic is decoupled and is defined by a _paginator_.

The library includes simple `CursorPaginator` implementation which traverses ordered rows with the following shape of the page object:

```json
{
  "nodes": [
    { "id": 1, "foo": "bar" },
    { "id": 2, "foo": "baz" }
  ],
  "cursor": "xyzzy"
}
```

Different paginators such as providing Relay-style pagination can be implemented similarly.

## Example

This example demonstrates both root query and relation pagination.

```gql
type Post {
  id: ID!
  text: String!
  author: User
}

type PostPage {
  nodes: [Post!]!
  cursor: String
}

type User {
  id: ID!
  name: String!
  posts: PostPage!
  all_posts: [Post!]!
}

type Query {
  user(id: ID!): User!
  posts: PostPage!
}
```

```ts
class UserTable extends BaseTable {
  readonly table = "user"

  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    name: t.string(1, 100),
  }))

  relations = {
    posts: this.hasMany(() => PostTable, {
      primaryKey: "id",
      foreignKey: "author_id",
    }),
  }
}

class PostTable extends BaseTable {
  readonly table = "post"

  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    text: t.text(1, 10000),
    author_id: t.integer(),
  }))

  relations = {
    author: this.belongsTo(() => UserTable, {
      required: true,
      primaryKey: "id",
      foreignKey: "author_id",
    }),
  }
}

const graph = r.graph({
  User: r.type(db.user, {
    fields: {
      id: true,
      name: true,
      // If it were posts: true, all posts will be returned.
      // Instead, return a page of posts sorted by newest first.
      posts: r.page(r.cursor({ fields: ["-id"], take: 10 })),
      // Should you want this, it's still possible to pull all posts (non-paginated)
      // under a different GraphQL field
      all_posts: r.relation({ tableField: "posts" }),
    },
  }),
  Post: r.type(db.post),
})

const resolvers = {
  Query: {
    user: async (parent, args, context, info) => {
      return await graph.resolve(db.user.find(args.id), { context, info })
    },
    posts: async (parent, args, context, info) => {
      return await graph.resolvePage(
        db.post,
        r.cursor({ fields: ["-id"], take: 10 }),
        { context, info },
      )
    },
  },
}
```
