# Pagination

Root queries and -to-many nested relations can be paginated.

## Paginators

The specific shape of the page object and the pagination logic is decoupled and is fully defined by a _paginator_.

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

```graphql
type Post {
  id: ID!
  text: String!
  author: User
}

type User {
  id: ID!
  name: String!
  posts: PostPage!
  all_posts: [Post!]!
}

type PostPage {
  nodes: [Post!]!
  cursor: String
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

const resolveGraph = GraphResolver({
  User: ModelResolver(UserModel, {
    fields: {
      id: true,
      name: true,
      // If it were posts: true, all posts will be returned.
      // Instead, return a page of posts
      posts: RelationResolver({
        paginate: CursorPaginage({ take: 10, fields: ["-id"] }),
      }),
      // Should you want this, it's still possible to pull all posts (non-paginated)
      // under a different GraphQL field
      all_posts: RelationResolver({ modelField: "posts" }),
    },
  }),
  Post: ModelResolver(PostModel, {
    fields: {
      id: true,
      text: true,
      author: true,
    },
  }),
})

const resolvers = {
  Query: {
    user: async (parent, args, ctx, info) => {
      const user = await resolveGraph(ctx, info, User.query().findById(args.id))
      return user
    },
    posts: async (parent, args, ctx, info) => {
      const page = await resolveGraph(ctx, info, Post.query(), {
        paginate: CursorPaginator({ take: 10, fields: ["-id"] }),
      })
      return page
    },
  },
}
```
