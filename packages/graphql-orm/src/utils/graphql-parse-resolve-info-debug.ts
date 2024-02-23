// Mimic npm debug (but don't actually have it as a dependency)

interface DebugFn {
	(message: string, ...args: any[]): void
	enabled: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function debugFactory(name: string): DebugFn {
	function debug() {}
	debug.enabled = false
	return debug
}
