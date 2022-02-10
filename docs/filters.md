# Filters

Both root and nested queries can be filtered with GraphQL arguments:

```graphql
scalar Filter

type Query {
  posts(filter: Filter): [Post!]!
}

query get_all_posts {
  posts(filter: { date: "2020-10-01", author_id__in: [123, 456] }) {
    id
    text
  }
}
```

The above generates:

```sql
SELECT id, text FROM posts WHERE date='2020-10-01' AND author_id IN (123, 456)
```

For security purposes, filters are disabled by default. To enable filters, use:

```ts
const resolveGraph = GraphResolver({
  Post: ModelResolver(PostModel, {
    // enable all filters for all fields
    filter: true,
    // TODO: granular access
    filter: {
      date: true,
      author_id: true,
    },
  }),
})
```

To filter root query, use:

```ts
const resolvers = {
  Query: {
    posts: async (parent, args, ctx, info) => {
      const posts = await resolveGraph(ctx, info, Post.query(), {
        filter: true,
      })
      return posts
    },
  },
}
```

## Syntax

```js
{
  field: value,
  field__operator: value,
}
```

Supported operators:

- `exact`
- `in`
- TODO: `lt`, `gt`, `lte`, `gte`, `like`, `ilike`, `contains`, `icontains`

## Filtering with model modifiers

Define modifiers on a model class:

```ts
export class PostModel extends Model {
  static modifiers = {
    public: (query) => query.whereNull("delete_time"),
    search: (query, term) => query.where("text", "ilike", `%${term}%`),
  }
}
```

Then you can filter results with:

```graphql
query get_all_posts {
  posts(filter: { public: true, search: "hello" }) {
    id
    text
  }
}
```

Modifier filters take precedence over database field filters.
