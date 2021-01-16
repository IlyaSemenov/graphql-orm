# Relations

Relations will be fetched automatically using `withGraphFetched()` when resolving nested fields.

Example:

```graphql
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
const resolveGraph = GraphResolver({
	User: ModelResolver(UserModel, {
		fields: {
			id: true,
			name: true,
			// Use withGraphFetched("posts")
			// and process subquery with Post model resolver defined below.
			//
			// See RelationResolver API for advanced options.
			posts: true,
		},
	}),
	// No resolver options = access to all fields
	Post: ModelResolver(PostModel),
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

Internally, this traverses `Model.relationMappings` and can handle unlimited nesting levels. Using the graph above, one could run a request like:

```graphql
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
