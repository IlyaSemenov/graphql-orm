export function is_plain_object(obj: any): obj is Record<string, any> {
  return typeof obj === "object" && !Array.isArray(obj)
}
