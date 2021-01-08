import { GraphResolver } from "objection-graphql-resolver"

import { Post } from "./model_resolvers/post"
import { Section } from "./model_resolvers/section"
import { User } from "./model_resolvers/user"

export const resolve_graph = GraphResolver({ User, Section, Post })
