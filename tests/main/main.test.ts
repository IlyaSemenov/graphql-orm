import gql from "graphql-tag"
import tap from "tap"

import { use_db, use_server } from "../setup"
import { create_objects } from "./fixtures"
import { create_tables } from "./migrations"
import { resolvers } from "./resolvers"
import { schema } from "./schema"

tap.test("Main", async (tap) => {
	await use_db(tap)
	await create_tables()
	await create_objects()
	const { client } = await use_server(tap, { typeDefs: schema, resolvers })

	await tap.test("fetch existing object", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
						}
					}
				`
			)
		)
	})

	await tap.test("fetch missing object", async (tap) => {
		tap.same(
			await client.request(
				gql`
					{
						user(id: 9562876) {
							id
							name
						}
					}
				`
			),
			{ user: null }
		)
	})

	await tap.test("model getter", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						section(slug: "news") {
							id
							name
							url
						}
					}
				`
			)
		)
	})

	await tap.test("raw SQL selector", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						section(slug: "news") {
							id
							slug
							upper_slug
						}
					}
				`
			)
		)
	})

	await tap.test("field cleaner", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
						}
					}
				`
			),
			"public fields"
		)
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
							password
						}
					}
				`
			),
			"reject password to public"
		)
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
							password
						}
					}
				`,
				undefined,
				{ user_id: "2" }
			),
			"reject password to other users"
		)
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
							password
						}
					}
				`,
				undefined,
				{ user_id: "1" }
			),
			"return own password to user"
		)
	})

	await tap.test("root pagination", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						sections {
							nodes {
								id
								slug
								name
							}
							cursor
						}
					}
				`
			)
		)
	})

	await tap.test("root pagination with arguments", async (tap) => {
		const { sections } = await client.request(
			gql`
				{
					sections(take: 1) {
						nodes {
							id
							slug
							name
						}
						cursor
					}
				}
			`
		)
		tap.matchSnapshot(sections, "take 1")
		tap.matchSnapshot(
			await client.request(
				gql`
					query more_sections($cursor: String) {
						sections(take: 100, cursor: $cursor) {
							nodes {
								id
								slug
								name
							}
							cursor
						}
					}
				`,
				{ cursor: sections.cursor }
			),
			"take 100 with cursor"
		)
	})

	tap.test("nested pagination", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
							posts {
								nodes {
									id
									text
									section {
										url
									}
									url
								}
								cursor
							}
						}
					}
				`
			)
		)
	})

	tap.test("double nested pagination", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						user(id: 1) {
							id
							name
							posts {
								nodes {
									id
									text
									author {
										name
									}
									url
									section {
										url
										name
										posts {
											nodes {
												text
												url
												author {
													name
												}
												section {
													url
												}
											}
											cursor
										}
									}
								}
								cursor
							}
						}
					}
				`
			)
		)
	})

	tap.test("root filter", async (tap) => {
		tap.test("by field", async (tap) => {
			const query = gql`
				query ($author_id: Int) {
					posts(filter: { author_id: $author_id }, take: 10) {
						nodes {
							id
							text
							author {
								id
								name
							}
						}
					}
				}
			`
			tap.matchSnapshot(
				await client.request(query, { author_id: 2 }),
				"author_id: 2"
			)
			tap.matchSnapshot(
				await client.request(query),
				"author_id filter not defined"
			)
		})
		tap.test("__in", async (tap) => {
			tap.matchSnapshot(
				await client.request(
					gql`
						{
							posts(filter: { id__in: [3, 5] }, take: 10) {
								nodes {
									id
									text
								}
							}
						}
					`
				),
				"id__in: [3, 5]"
			)
		})
		tap.test("by modifier", async (tap) => {
			tap.matchSnapshot(
				await client.request(
					gql`
						{
							posts(filter: { is_draft: true }, take: 10) {
								nodes {
									id
									text
								}
							}
						}
					`
				),
				"is_draft"
			)
		})
		tap.test("filter by parametrized modifier", async (tap) => {
			tap.matchSnapshot(
				await client.request(
					gql`
						{
							posts(filter: { search: "news" }, take: 10) {
								nodes {
									id
									text
								}
							}
						}
					`
				),
				'search: "news"'
			)
		})
	})

	tap.test("root filter when filters not enabled", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						sections(filter: { slug: "news" }) {
							nodes {
								id
								name
							}
						}
					}
				`
			),
			"all sections, not only news"
		)
	})

	tap.test("nested filter", async (tap) => {
		tap.matchSnapshot(
			await client.request(
				gql`
					{
						section(slug: "news") {
							posts(filter: { author_id: 2 }, take: 10) {
								nodes {
									id
									text
									author {
										id
										name
									}
									section {
										slug
									}
								}
							}
						}
					}
				`
			),
			"section slug, author_id: 2"
		)
	})
})
