import { Query } from "pqb"

export type Modifier = (query: Query, param?: any) => Query
