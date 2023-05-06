# Relations

Relations will be fetched automatically using `withGraphFetched()` when resolving nested fields.

Example:

```gql
type User {
	id: ID!
	name: String!
	posts: [Post!]!
}

type Post {
	id: ID!
	text: String!
	author: User
}

type Query {
	user(id: ID!): User!
	posts: [Post!]!
}

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
      title
    }
  }
}
```

```ts
const graph = r.graph({
  User: r.model(UserModel, {
    fields: {
      id: true,
      name: true,
      // Use withGraphFetched("posts")
      // and process subquery with Post model resolver defined below.
      //
      // See r.relation() API for advanced options.
      posts: true,
    },
  }),
  // No resolver options = access to all fields (including relations)
  Post: r.model(PostModel),
})

const resolvers = {
  Query: {
    user: (parent, args, ctx, info) => {
      return graph.resolve(ctx, info, User.query().findById(args.id))
    },
    posts: (parent, args, ctx, info) => {
      return graph.resolve(ctx, info, Post.query())
    },
  },
}
```

Internally, this traverses `Model.relationMappings` and can handle unlimited nesting levels. Using the graph above, one could run a request like:

```gql
query deep_nesting {
  posts {
    id
    text
    author {
      name
      posts {
        id
        author {
          name
        }
      }
    }
  }
}
```
