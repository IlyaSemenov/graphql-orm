import * as r from "orchid-graphql"
import { createBaseTable, orchidORM } from "orchid-orm"
import { expect, test } from "tstyche"

const BaseTable = createBaseTable()

class PostTable extends BaseTable {
	readonly table = "post"

	columns = this.setColumns(t => ({
		id: t.serial().primaryKey(),
		text: t.text(),
	}))
}

const db = orchidORM(
	{},
	{
		post: PostTable,
	},
)

// Similar to db.post, but not necessary so.
interface Post {
	id: number
	text: number
	excerpt: string
	tags: string[]
}

const graph = r.graph({
	Post: r.table(db.post),
})

const ctx = 0 as any

test("valid query type", () => {
	expect(graph.resolve(db.post, ctx)).type.toBe<Promise<unknown>>()
	expect(graph.resolve<Post[]>(db.post.all(), ctx)).type.toBe<Promise<Post[]>>()
	expect(graph.resolve<Post[]>(db.post.where({ text: "foo" }), ctx)).type.toBe<
		Promise<Post[]>
	>()
	expect(graph.resolve<Post>(db.post.find(1), ctx)).type.toBe<Promise<Post>>()
	expect(
		graph.resolve<Post | undefined>(db.post.findOptional(1), ctx),
	).type.toBe<Promise<Post | undefined>>()
})

test("invalid query type", () => {
	expect(graph.resolve<Post>(db.post.all(), ctx)).type.toRaiseError()
	expect(graph.resolve<Post>(db.post.all(), ctx)).type.toRaiseError()
	expect(graph.resolve<Post>(db.post.count(), ctx)).type.toRaiseError()
	expect(graph.resolve<Post>(db.post.get("text"), ctx)).type.toRaiseError()
	expect(graph.resolve<Post>(db.post.findOptional(1), ctx)).type.toRaiseError()
	expect(graph.resolve<Post[]>(db.post.find(1), ctx)).type.toRaiseError()
})

test("query type inference", () => {
	;((): Promise<Post> => {
		return graph.resolve(db.post.find(1), ctx)
	})()
	;((): Promise<Post[]> => {
		// @ts-expect-error find(1) query should not be allowed for Post[] return type
		return graph.resolve(db.post.find(1), ctx)
	})()
})
