# Virtual attributes

## Model getters

Getters on objection.js instances can be pulled the same way as database fields:

```ts
class PostModel extends Model {
  declare id?: number
  declare title?: string

  get url() {
    assert(this.id)
    return `/${this.id}.html`
  }
}

const graph = r.graph({
  Post: r.model(PostModel, {
    fields: {
      id: true,
      title: true,
      url: true,
    },
    // or simply omit `fields` to allow all fields and getters
  }),
})
```

```gql
query get_all_posts {
  posts {
    # Pull from database
    id
    title
    # Use instance getter
    url
  }
}
```

## Virtual attribute dependencies

If a getter relies on certain model fields (such as if `url` needs `slug`), you will need to select all of them in the query.

You can automate this with:

```ts
class PostModel extends Model {
  declare id?: number
  declare slug?: string
  declare title?: string

  get url() {
    assert(this.slug)
    return `/${this.slug}.html`
  }
}

const graph = r.graph({
  Post: r.model(PostModel, {
    fields: {
      id: true,
      title: true,
      url: (query) => query.select("slug"),
    },
  }),
})
```

## Virtual attributes provided by the database

Similarly, you can pull virtual attributes directly from the database:

```gql
type Post {
  id: ID
  title: String
  upper_title: String
}
```

```ts
const graph = r.graph({
  Post: r.model(PostModel, {
    fields: {
      id: true,
      title: true,
      upper_title: (query) => query.select(raw("upper(title) as upper_title")),
    },
  }),
})
```
