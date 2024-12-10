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
class PostModel extends Model {
  static tableName = "posts"
  static get relationMappings() {
    return {
      author: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: { from: "posts.author_id", to: "users.id" },
      },
    }
  }
}

class UserModel extends Model {
  static tableName = "users"
  static get relationMappings() {
    return {
      posts: {
        relation: Model.HasManyRelation,
        modelClass: PostModel,
        join: { from: "posts.author_id", to: "users.id" },
      },
    }
  }
}

const graph = r.graph({
  User: r.model(UserModel, {
    fields: {
      id: true,
      name: true,
      // If it were posts: true, all posts would be returned.
      // Instead, return a page of posts sorted by newest first.
      posts: r.page(r.cursor({ fields: ["-id"], take: 10 })),
      // Pull all posts (non-paginated) under a different GraphQL field.
      all_posts: r.relation({ modelField: "posts" }),
    },
  }),
  Post: r.model(PostModel),
})

const resolvers = {
  Query: {
    user: (parent, args, context, info) => {
      return graph.resolve(User.query().findById(args.id), { context, info })
    },
    posts: (parent, args, context, info) => {
      return graph.resolvePage(
        // Pagination fields can be taken from cursor({ fields })
        // or from the query itself, like this:
        Post.query().orderBy("id", "desc"),
        r.cursor({ take: 10 }),
        { context, info },
      )
    },
  },
}
```
