export function run_after(callback: (instance: any) => void) {
	return (result: any) => {
		if (Array.isArray(result)) {
			return result.map(callback)
		} else {
			return callback(result)
		}
	}
}

export function async_run_after(callback: (instance: any) => Promise<void>) {
	return (result: any) => {
		if (Array.isArray(result)) {
			return Promise.all(result.map(callback))
		} else {
			return callback(result)
		}
	}
}
