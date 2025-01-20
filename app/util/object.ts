export function cloneInstance<T>(o: T): T {
	let n = Object.create(Object.getPrototypeOf(o))
	Object.assign(n, o)
	return n
}
