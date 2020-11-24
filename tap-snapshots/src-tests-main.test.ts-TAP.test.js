/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`src/tests/main.test.ts TAP Main > All sections, ordered, excluding hidden (test both global model modifiers) 1`] = `
Object {
  "sections": Array [
    Object {
      "id": "2",
      "name": "News",
    },
    Object {
      "id": "1",
      "name": "Test",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Find post under Hidden section (test global model modifier) 1`] = `
Object {
  "posts": Array [
    Object {
      "id": "3",
      "section": null,
      "title": "Foo",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Find post under User ID=1's default section (test async model modifier) 1`] = `
Object {
  "posts": Array [
    Object {
      "id": "1",
      "section": Object {
        "id": "1",
        "name": "Test",
      },
      "title": "Hello",
    },
    Object {
      "id": "4",
      "section": Object {
        "id": "1",
        "name": "Test",
      },
      "title": "Bar",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Posts where author_id=2 1`] = `
Object {
  "posts": Array [
    Object {
      "author": Object {
        "name": "Mary",
      },
      "id": "3",
      "title": "Foo",
    },
    Object {
      "author": Object {
        "name": "Mary",
      },
      "id": "4",
      "title": "Bar",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Posts where title is Hello or Foo 1`] = `
Object {
  "posts": Array [
    Object {
      "id": "1",
      "title": "Hello",
    },
    Object {
      "id": "3",
      "title": "Foo",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Posts with 'Bye' in title (parameterized filter modifier) 1`] = `
Object {
  "posts": Array [
    Object {
      "id": "2",
      "title": "Bye",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Posts with both author and section (multiple relations) 1`] = `
Object {
  "posts": Array [
    Object {
      "author": Object {
        "name": "John",
      },
      "id": "1",
      "section": Object {
        "slug": "test",
      },
      "title": "Hello",
    },
    Object {
      "author": Object {
        "name": "Mary",
      },
      "id": "4",
      "section": Object {
        "slug": "test",
      },
      "title": "Bar",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Posts with url and section without slug (test nested fields dependency) 1`] = `
Object {
  "posts": Array [
    Object {
      "section": Object {
        "name": "Test",
      },
      "url": "/test/Hello-1",
    },
    Object {
      "section": null,
      "url": "/Bye-2",
    },
    Object {
      "section": null,
      "url": "/Foo-3",
    },
    Object {
      "section": Object {
        "name": "Test",
      },
      "url": "/test/Bar-4",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Posts with url only (test fields dependency) 1`] = `
Object {
  "posts": Array [
    Object {
      "url": "/test/Hello-1",
    },
    Object {
      "url": "/Bye-2",
    },
    Object {
      "url": "/hidden/Foo-3",
    },
    Object {
      "url": "/test/Bar-4",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > Published posts (filter modifier) 1`] = `
Object {
  "posts": Array [
    Object {
      "id": "1",
      "section": Object {
        "slug": "test",
      },
      "title": "Hello",
    },
    Object {
      "id": "3",
      "section": null,
      "title": "Foo",
    },
    Object {
      "id": "4",
      "section": Object {
        "slug": "test",
      },
      "title": "Bar",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main > User with id 1 and his posts 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
    "posts": Array [
      Object {
        "id": "1",
        "text": "Hello, world!",
        "title": "Hello",
      },
      Object {
        "id": "2",
        "text": "Bye-bye, cruel world!",
        "title": "Bye",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main > User with name->user_name (field alias) 1`] = `
Object {
  "user": Object {
    "user_name": "John",
  },
}
`
