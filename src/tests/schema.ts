import gql from "graphql-tag"

export const schema = gql`
	scalar Filter

	type User {
		id: ID!
		name: String!
		# empty if not allowed
		password: String
		posts(filter: Filter, cursor: String, take: Int): PostPage!
		posts_page(filter: Filter, cursor: String, take: Int): PostPage!
		posts_by_one(filter: Filter, cursor: String, take: Int): PostPage!
		all_posts(filter: Filter): [Post!]!
		all_posts_verbose(filter: Filter): [Post!]!
	}

	type Section {
		id: ID!
		name: String!
		slug: String!
		upper_slug: String!
		url: String!
		posts(filter: Filter, cursor: String, take: Int): PostPage!
	}

	type SectionPage {
		nodes: [Section!]!
		cursor: String
	}

	type Post {
		id: ID!
		author: User!
		section: Section!
		text: String!
		url: String!
	}

	type PostPage {
		nodes: [Post!]!
		cursor: String
	}

	type Query {
		user(id: ID!): User
		section(slug: String!): Section
		sections(filter: Filter, cursor: String, take: Int): SectionPage!
		posts(filter: Filter, cursor: String, take: Int): PostPage!
	}
`
