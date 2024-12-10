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
  "cursor": "encoded-string-cursor-to-fetch-next-page"
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
    name: t.text(),
  }))

  relations = {
    posts: this.hasMany(() => PostTable, {
      columns: ["id"],
      references: ["author_id"],
    }),
  }
}

class PostTable extends BaseTable {
  readonly table = "post"

  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    text: t.text(),
    author_id: t.integer(),
  }))

  relations = {
    author: this.belongsTo(() => UserTable, {
      required: true,
      columns: ["author_id"],
      references: ["id"],
    }),
  }
}

const graph = r.graph({
  User: r.type(db.user, {
    fields: {
      id: true,
      name: true,
      // If it were posts: true, all posts would be returned.
      // Instead, return a page of posts sorted by newest first.
      posts: r.page(r.cursor({ fields: ["-id"], take: 10 })),
      // Pull all posts (non-paginated) under a different GraphQL field.
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
        // Pagination fields can be taken from cursor({ fields })
        // or from the query itself, like this:
        db.post.order({ id: "DESC" }),
        r.cursor({ take: 10 }),
        { context, info },
      )
    },
  },
}
```
