/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`tests/nested-pagination.ts TAP nested pagination > double nested pagination 1`] = `
Object {
  "user": Object {
    "id": 1,
    "name": "Alice",
    "posts": Object {
      "cursor": "[\\"2\\"]",
      "nodes": Array [
        Object {
          "author": Object {
            "name": "Alice",
          },
          "id": 1,
          "section": Object {
            "name": "News",
            "posts": Object {
              "cursor": "[\\"4\\"]",
              "nodes": Array [
                Object {
                  "author": Object {
                    "name": "Alice",
                  },
                  "section": Object {
                    "name": "News",
                  },
                  "text": "Oil price rising.",
                },
                Object {
                  "author": Object {
                    "name": "Bob",
                  },
                  "section": Object {
                    "name": "News",
                  },
                  "text": "Good news from China.",
                },
              ],
            },
          },
          "text": "Oil price rising.",
        },
        Object {
          "author": Object {
            "name": "Alice",
          },
          "id": 2,
          "section": Object {
            "name": "Editorial",
            "posts": Object {
              "cursor": null,
              "nodes": Array [
                Object {
                  "author": Object {
                    "name": "Alice",
                  },
                  "section": Object {
                    "name": "Editorial",
                  },
                  "text": "Is communism dead yet?",
                },
              ],
            },
          },
          "text": "Is communism dead yet?",
        },
      ],
    },
  },
}
`

exports[`tests/nested-pagination.ts TAP nested pagination > nested pagination 1`] = `
Object {
  "user": Object {
    "name": "Alice",
    "posts": Object {
      "cursor": "[\\"2\\"]",
      "nodes": Array [
        Object {
          "id": 1,
          "section": Object {
            "name": "News",
          },
          "text": "Oil price rising.",
        },
        Object {
          "id": 2,
          "section": Object {
            "name": "Editorial",
          },
          "text": "Is communism dead yet?",
        },
      ],
    },
  },
}
`

exports[`tests/nested-pagination.ts TAP nested pagination > triple nested pagination 1`] = `
Object {
  "user": Object {
    "name": "Bob",
    "posts": Object {
      "cursor": "[\\"4\\"]",
      "nodes": Array [
        Object {
          "author": Object {
            "name": "Bob",
            "posts": Object {
              "nodes": Array [
                Object {
                  "author": Object {
                    "name": "Bob",
                  },
                  "text": "Latest COVID figures.",
                },
                Object {
                  "author": Object {
                    "name": "Bob",
                  },
                  "text": "Good news from China.",
                },
              ],
            },
          },
          "text": "Latest COVID figures.",
        },
        Object {
          "author": Object {
            "name": "Bob",
            "posts": Object {
              "nodes": Array [
                Object {
                  "author": Object {
                    "name": "Bob",
                  },
                  "text": "Latest COVID figures.",
                },
                Object {
                  "author": Object {
                    "name": "Bob",
                  },
                  "text": "Good news from China.",
                },
              ],
            },
          },
          "text": "Good news from China.",
        },
      ],
    },
  },
}
`
