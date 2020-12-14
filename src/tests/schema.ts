import gql from "graphql-tag"

export const schema = gql`
	type User {
		id: ID!
		name: String
		upper_name: String
		posts: [Post!]!
	}

	type Section {
		id: ID!
		slug: String!
		name: String
	}

	type Post {
		id: ID!
		author: User!
		section: Section
		title: String
		text: String
		url: String!
	}

	scalar Filter

	type Query {
		user(id: ID!): User
		sections(filter: Filter): [Section!]!
		posts(filter: Filter): [Post!]!
	}
`
