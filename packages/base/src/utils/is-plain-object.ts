export function isPlainObject(obj: any): obj is Record<string, any> {
	return typeof obj === "object" && !Array.isArray(obj)
}
