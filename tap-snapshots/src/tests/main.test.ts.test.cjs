/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`src/tests/main.test.ts TAP Main double nested pagination > must match snapshot 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
    "posts": Object {
      "cursor": "[\\"2\\"]",
      "nodes": Array [
        Object {
          "author": Object {
            "name": "John",
          },
          "id": "1",
          "section": Object {
            "name": "News",
            "posts": Object {
              "cursor": "[\\"4\\"]",
              "nodes": Array [
                Object {
                  "author": Object {
                    "name": "John",
                  },
                  "section": Object {
                    "url": "/news",
                  },
                  "text": "Oil price rising.",
                  "url": "/news/1",
                },
                Object {
                  "author": Object {
                    "name": "Mary",
                  },
                  "section": Object {
                    "url": "/news",
                  },
                  "text": "Good news from China.",
                  "url": "/news/4",
                },
              ],
            },
            "url": "/news",
          },
          "text": "Oil price rising.",
          "url": "/news/1",
        },
        Object {
          "author": Object {
            "name": "John",
          },
          "id": "2",
          "section": Object {
            "name": "Editorial",
            "posts": Object {
              "cursor": null,
              "nodes": Array [
                Object {
                  "author": Object {
                    "name": "John",
                  },
                  "section": Object {
                    "url": "/editorial",
                  },
                  "text": "Is communism dead yet?",
                  "url": "/editorial/2",
                },
              ],
            },
            "url": "/editorial",
          },
          "text": "Is communism dead yet?",
          "url": "/editorial/2",
        },
      ],
    },
  },
}
`

exports[`src/tests/main.test.ts TAP Main fetch existing object > must match snapshot 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
  },
}
`

exports[`src/tests/main.test.ts TAP Main field cleaner > public fields 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
  },
}
`

exports[`src/tests/main.test.ts TAP Main field cleaner > reject password to other users 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
    "password": null,
  },
}
`

exports[`src/tests/main.test.ts TAP Main field cleaner > reject password to public 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
    "password": null,
  },
}
`

exports[`src/tests/main.test.ts TAP Main field cleaner > return own password to user 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
    "password": "secret",
  },
}
`

exports[`src/tests/main.test.ts TAP Main model getter > must match snapshot 1`] = `
Object {
  "section": Object {
    "id": "1",
    "name": "News",
    "url": "/news",
  },
}
`

exports[`src/tests/main.test.ts TAP Main nested filter > section slug, author_id: 2 1`] = `
Object {
  "section": Object {
    "posts": Object {
      "nodes": Array [
        Object {
          "author": Object {
            "id": "2",
            "name": "Mary",
          },
          "id": "4",
          "section": Object {
            "slug": "news",
          },
          "text": "Good news from China.",
        },
        Object {
          "author": Object {
            "id": "2",
            "name": "Mary",
          },
          "id": "5",
          "section": Object {
            "slug": "news",
          },
          "text": "More good news!",
        },
      ],
    },
  },
}
`

exports[`src/tests/main.test.ts TAP Main nested pagination > must match snapshot 1`] = `
Object {
  "user": Object {
    "id": "1",
    "name": "John",
    "posts": Object {
      "cursor": "[\\"2\\"]",
      "nodes": Array [
        Object {
          "id": "1",
          "section": Object {
            "url": "/news",
          },
          "text": "Oil price rising.",
          "url": "/news/1",
        },
        Object {
          "id": "2",
          "section": Object {
            "url": "/editorial",
          },
          "text": "Is communism dead yet?",
          "url": "/editorial/2",
        },
      ],
    },
  },
}
`

exports[`src/tests/main.test.ts TAP Main raw SQL selector > must match snapshot 1`] = `
Object {
  "section": Object {
    "id": "1",
    "slug": "news",
    "upper_slug": "NEWS",
  },
}
`

exports[`src/tests/main.test.ts TAP Main root filter __in > id__in: [3, 5] 1`] = `
Object {
  "posts": Object {
    "nodes": Array [
      Object {
        "id": "5",
        "text": "More good news!",
      },
      Object {
        "id": "3",
        "text": "Latest COVID figures.",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root filter by field > author_id not defined 1`] = `
Object {
  "posts": Object {
    "nodes": Array [
      Object {
        "author": Object {
          "id": "1",
          "name": "John",
        },
        "id": "7",
        "text": "This is a draft",
      },
      Object {
        "author": Object {
          "id": "1",
          "name": "John",
        },
        "id": "6",
        "text": "COVID vs Flu?",
      },
      Object {
        "author": Object {
          "id": "2",
          "name": "Mary",
        },
        "id": "5",
        "text": "More good news!",
      },
      Object {
        "author": Object {
          "id": "2",
          "name": "Mary",
        },
        "id": "4",
        "text": "Good news from China.",
      },
      Object {
        "author": Object {
          "id": "2",
          "name": "Mary",
        },
        "id": "3",
        "text": "Latest COVID figures.",
      },
      Object {
        "author": Object {
          "id": "1",
          "name": "John",
        },
        "id": "2",
        "text": "Is communism dead yet?",
      },
      Object {
        "author": Object {
          "id": "1",
          "name": "John",
        },
        "id": "1",
        "text": "Oil price rising.",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root filter by field > author_id: 2 1`] = `
Object {
  "posts": Object {
    "nodes": Array [
      Object {
        "author": Object {
          "id": "2",
          "name": "Mary",
        },
        "id": "5",
        "text": "More good news!",
      },
      Object {
        "author": Object {
          "id": "2",
          "name": "Mary",
        },
        "id": "4",
        "text": "Good news from China.",
      },
      Object {
        "author": Object {
          "id": "2",
          "name": "Mary",
        },
        "id": "3",
        "text": "Latest COVID figures.",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root filter by modifier > is_draft 1`] = `
Object {
  "posts": Object {
    "nodes": Array [
      Object {
        "id": "7",
        "text": "This is a draft",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root filter filter by parametrized modifier > search: "news" 1`] = `
Object {
  "posts": Object {
    "nodes": Array [
      Object {
        "id": "5",
        "text": "More good news!",
      },
      Object {
        "id": "4",
        "text": "Good news from China.",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root filter when filters not enabled > all sections, not only news 1`] = `
Object {
  "sections": Object {
    "nodes": Array [
      Object {
        "id": "3",
        "name": "COVID-19",
      },
      Object {
        "id": "2",
        "name": "Editorial",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root pagination > must match snapshot 1`] = `
Object {
  "sections": Object {
    "cursor": "[\\"Editorial\\",\\"2\\"]",
    "nodes": Array [
      Object {
        "id": "3",
        "name": "COVID-19",
        "slug": "covid",
      },
      Object {
        "id": "2",
        "name": "Editorial",
        "slug": "editorial",
      },
    ],
  },
}
`

exports[`src/tests/main.test.ts TAP Main root pagination with arguments > take 1 1`] = `
Object {
  "cursor": "[\\"COVID-19\\",\\"3\\"]",
  "nodes": Array [
    Object {
      "id": "3",
      "name": "COVID-19",
      "slug": "covid",
    },
  ],
}
`

exports[`src/tests/main.test.ts TAP Main root pagination with arguments > take 100 with cursor 1`] = `
Object {
  "sections": Object {
    "cursor": null,
    "nodes": Array [
      Object {
        "id": "2",
        "name": "Editorial",
        "slug": "editorial",
      },
      Object {
        "id": "1",
        "name": "News",
        "slug": "news",
      },
    ],
  },
}
`
