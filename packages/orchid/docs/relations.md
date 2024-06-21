# Relations

Relations will be fetched automatically using orchid-orm subqueries when resolving nested fields.

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

query user_with_posts($id: ID!) {
  user(id: $id) {
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
  User: r.type(db.user, {
    fields: {
      id: true,
      name: true,
      // Fetch posts with ORM subquery.
      // Use Post table resolver defined below.
      //
      // See r.relation() API for advanced options.
      posts: true,
    },
  }),
  // No resolver options = access to all fields (including relations)
  Post: r.type(db.post),
})

const resolvers = {
  Query: {
    user: async (parent, args, context, info) => {
      return await graph.resolve(db.user.find(args.id), { context, info })
    },
    posts: (parent, args, context, info) => {
      return graph.resolve(db.post, { context, info })
    },
  },
}
```

Internally, this traverses `table.relations` and can handle unlimited nesting levels. Using the graph above, one could run a request like:

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

_\* Not currently true due to orchid-orm bug: https://github.com/romeerez/orchid-orm/issues/89_
