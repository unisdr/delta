export interface PreviousUpdatesFromJson {
	updates?: Record<string, Record<number, any>>
	deletes?: string[]
	newRows?: Record<string, any[]>
}

// i - initial
// u - update
// n - new
type From = ("i" | "u" | "n")[]

export interface DataWithIdBasic {
	id: string
	data: any[]
}

export interface DataWithId {
	id: string
	data: any[]
	from: From
}

const tempIdPrefix = "_temp"

export interface Sort {
	column: number
	order: "asc" | "desc"
}

export interface DataManagerCols {
	dimensions: number
	metrics: number
}

export interface Group<T> {
	key: string
	data: T[]
}

export interface sortOrderGroup {
	key: string
	ids: string[]
}

export class DataManager {

	private cols: DataManagerCols
	private lastTempId: number
	// map<id, data>
	private initial: Map<string, any[]>
	// map<id, map<field, value>
	private updates: Map<string, Map<number, any>>
	// set<id>
	private deletes: Set<string>
	// map<id, data>
	private newRows: Map<string, any[]>
	// list of row ids
	public sortOrder: sortOrderGroup[]
	private sort: Sort

	private totalsId: string

	constructor() {
		this.cols = {dimensions: 0, metrics: 0}
		this.totalsId = ""
		this.lastTempId = 0
		this.initial = new Map()
		this.updates = new Map()
		this.deletes = new Set()
		this.newRows = new Map()
		this.sortOrder = []
		this.sort = {column: 0, order: "asc"}
	}


	init(cols: DataManagerCols, initialData: any[][], ids: string[], previousUpdatesFromJson: PreviousUpdatesFromJson = {}) {

		console.log("prev data", previousUpdatesFromJson)
		this.cols = cols
		if (cols.dimensions == 0) {
			throw "cols.dimensions is 0"
		}
		if (cols.metrics == 0) {
			throw "cols.metrics is 0"
		}
		if (initialData.length !== ids.length) {
			throw new Error("Mismatch between the number of rows and ids")
		}
		this.initial = new Map(ids.map((id, index) => [id, initialData[index]]))
		this.sortOrder = [{
			key: dataToGroupKey(Array(cols.dimensions).fill(null)),
			ids: ids,
		}]

		this.lastTempId = 0
		{
			let upd = previousUpdatesFromJson
			this.updates = new Map(
				Object.entries(upd.updates || {}).map(([rowId, fields]) => [
					rowId,
					new Map(Object.entries(fields).map(([fieldIndex, value]) => [Number(fieldIndex), value])),
				])
			)
			this.deletes = new Set(upd.deletes || [])
			this.newRows = new Map(Object.entries(upd.newRows || {}))
			for (let key of this.newRows.keys()) {
				let trimmed = key.startsWith(tempIdPrefix) ? key.slice(tempIdPrefix.length) : null
				if (trimmed) {
					let n = parseInt(trimmed, 10)
					this.lastTempId = Math.max(this.lastTempId, n)
				}
			}
		}
		this.sortOrder = this.sortOrder.map(
			g => {return {key: g.key, ids: g.ids.filter(id => !this.deletes.has(id))}}
		)

		this.sortOrder[0].ids.push(...Array.from(this.newRows.keys()))

		for (let row of this.applyUpdatesUnsorted()) {
			let ok = true
			for (let i = 0; i < this.cols.dimensions; i++) {
				let v = row.data[i]
				if (v != null) {
					ok = false
					break
				}
			}
			if (ok) {
				this.totalsId = row.id
				break
			}
		}
		if (!this.totalsId) {
			let id = this.addRow("end")
			this.totalsId = id
		}

		this.sortDefault()
	}

	getTotals() {
		let data: any[] = []
		for (let row of this.applyUpdatesUnsorted()) {
			if (row.id == this.totalsId) {
				data = row.data.slice(this.cols.dimensions)
				return {data, id: this.totalsId}
			}
		}
		throw new Error("total row not found")
	}

	groupTotalsMatch(): Map<string, boolean[]> {
		let res = new Map<string, boolean[]>()
		let data = this.applyUpdatesWithGroupKey()
		let totals = this.getTotals().data
		for (let g of data) {
			let groupTotals = Array(this.cols.metrics).fill(0)
			for (let row of g.data) {
				for (let i = 0; i < this.cols.metrics; i++) {
					let j = i + this.cols.dimensions
					let v = Number(row.data[j])
					groupTotals[i] += v
				}
			}
			res.set(g.key, this.arraysEqualElements(totals, groupTotals))
		}
		return res
	}

	arraysEqualElements(arr1: any[], arr2: any[]): boolean[] {
		if (arr1.length !== arr2.length) throw new Error("len mismatch")
		return arr1.map((v, i) => Number(v) == Number(arr2[i]))
	}

	getSort(): Sort {
		return this.sort
	}

	sortDefault() {
		this.sortByColumn(0, "asc")
	}

	sortByColumn(index: number, order: "asc" | "desc") {
		this.sort = {column: index, order}
		const rows = this.applyUpdatesUnsorted()

		this.sortOrder = groupedSort(rows, index, order, this.cols.dimensions)
	}

	toggleColumnSort(index: number) {
		if (this.sort.column != index) {
			this.sortByColumn(index, "asc")
			return
		}
		this.sortByColumn(index, this.sort.order == "asc" ? "desc" : "asc")
	}

	updateField(rowId: string, fieldIndex: number, newValue: any) {
		if (this.newRows.has(rowId)) {
			let row = this.newRows.get(rowId)!
			row[fieldIndex] = newValue
			this.newRows.set(rowId, row)
		} else if (this.initial.has(rowId)) {
			if (!this.updates.has(rowId)) {
				this.updates.set(rowId, new Map())
			}
			this.updates.get(rowId)!.set(fieldIndex, newValue)
		} else {
			throw new Error("Row with ID not found: " + rowId)
		}
	}
	updateTotals(fieldIndex: number, newValue: any) {
		this.updateField(this.totalsId, fieldIndex + this.cols.dimensions, newValue)
	}

	deleteRow(rowId: string) {
		if (this.rowIdIsNew(rowId)) {
			this.newRows.delete(rowId)
		} else {
			this.deletes.add(rowId)
		}
		this.sortOrder = this.sortOrder.map(g => {
			return {
				key: g.key,
				ids: g.ids.filter(id => id !== rowId)
			}

		})
	}

	rowIdIsNew(rowId: string): boolean {
		for (let id of this.initial.keys()) {
			if (rowId == id) {
				return false
			}
		}
		for (let id of this.newRows.keys()) {
			if (rowId == id) {
				return true
			}
		}
		throw new Error("row not found by id: " + rowId)
	}

	newId(): string {
		this.lastTempId++
		let id = tempIdPrefix + this.lastTempId
		return id
	}

	colCount(): number {
		return this.cols.dimensions + this.cols.metrics
	}

	addRow(loc: "start" | "end"): string {
		let id = this.newId()
		this.newRows.set(id, Array(this.colCount()).fill(null))
		// TODO: better handling of groups
		if (!this.sortOrder.length) {
			this.sortOrder = [{
				key: dataToGroupKey(Array(this.cols.dimensions).fill(null)),
				ids: [],
			}]
		}
		if (loc == "start") {
			this.sortOrder[0].ids.unshift(id)
		} else {
			this.sortOrder[0].ids.push(id)
		}
		return id
	}

	applyUpdatesUnsorted(): DataWithId[] {
		let rowsMap = new Map<string, DataWithId>()

		this.initial.forEach((row, id) => {
			if (this.deletes.has(id)) return
			let updatedRow = [...row]
			let from: From = Array(row.length).fill("i")
			if (this.updates.has(id)) {
				this.updates.get(id)!.forEach((value, fieldIndex) => {
					updatedRow[fieldIndex] = value
					from[fieldIndex] = "u"
				})
			}
			rowsMap.set(id, {id, data: updatedRow, from})
		})

		this.newRows.forEach((row, id) => {
			if (row.length != this.colCount()) {
				throw new Error("newRows length mismatch")
			}
			let from: From = Array(row.length).fill("n")
			rowsMap.set(id, {id, data: row, from})
		})

		return Array.from(rowsMap.values())
	}

	applyUpdatesWithTotals(): Group<DataWithId>[] {
		let values = this.applyUpdatesUnsorted()
		return applySortOrder(values, this.sortOrder)
	}

	applyUpdatesWithGroupKey(): Group<DataWithId>[] {
		let values = this.applyUpdatesWithTotals()
		return values.map(
			g => {
				return {key: g.key, data: g.data.filter(r => r.id != this.totalsId)}
			}).filter(g => g.data.length != 0)
	}

	applyUpdates(): DataWithId[][] {
		return this.applyUpdatesWithGroupKey().map(g => g.data)
	}

	getUpdatesForSaving(): any {
		let res = {
			updates: Object.fromEntries(
				Array.from(this.updates.entries()).map(([rowId, fields]) => [
					rowId,
					Object.fromEntries(fields.entries()),
				])
			),
			deletes: Array.from(this.deletes),
			newRows: Object.fromEntries(this.newRows.entries()),
		}
		return res
	}

	copyRow(rowId: string) {
		let data = this.applyUpdatesUnsorted()
		let targetRow
		for (let row of data) {
			if (rowId == row.id) {
				targetRow = row
				break
			}
		}
		if (!targetRow) {
			throw "row not found with id: " + rowId
		}
		let id = this.newId()
		this.newRows.set(id, [...targetRow.data])
		{
			let ok = false
			for (let g of this.sortOrder) {
				let i = g.ids.indexOf(rowId)
				if (i === -1) {
					continue
				}
				ok = true
				g.ids.splice(i + 1, 0, id)
			}
			if (!ok) {
				throw new Error("Row not found in sort order: " + rowId)
			}
		}
	}

}

export function applySortOrder<T extends DataWithIdBasic>(rows: T[], sortOrder: sortOrderGroup[]): Group<T>[] {
	// check that all rows are in the sortOrder array
	{
		let allIds = new Set<string>()
		for (let g of sortOrder) {
			for (let id of g.ids) {
				allIds.add(id)
			}
		}
		for (let row of rows) {
			if (!allIds.has(row.id)) {
				throw new Error("SortOrder array is missing id, which is in rows: " + row.id)
			}
		}
	}

	let rowsById = new Map<string, T>()
	for (let row of rows) {
		rowsById.set(row.id, row)
	}
	let res: Group<T>[] = sortOrder.map(g => {
		let data = g.ids.map(id => {
			let r = rowsById.get(id)
			if (!r) {
				throw new Error("Sort order contains id, that is not in rows: " + id)
			}
			return r
		})
		return {key: g.key, data}
	})

	return res
}

export function dataToGroupKey(data: any[]): string {
	return data.map((v) => v !== null ? "1" : "0").join("")
}

export function dataKeySet(key: string): number {
	let c = 0
	for (let char of key) {
		if (char === "1") {
			c++
		}
	}
	return c
}

export function groupedSort(data: DataWithIdBasic[], index: number, order: "asc" | "desc", dimensions: number): sortOrderGroup[] {

	let grMap = new Map<string, DataWithIdBasic[]>()
	for (let a of data) {
		let k = dataToGroupKey(a.data.slice(0, dimensions))
		if (!grMap.has(k)) {
			grMap.set(k, [])
		}
		grMap.get(k)!.push(a)
	}
	let grKeys = Array.from(grMap.keys())
	grKeys.sort((a, b) => {
		let s1 = dataKeySet(a)
		let s2 = dataKeySet(b)
		if (s1 !== s2) {
			return s1 - s2
		}
		return b.localeCompare(a)
	})
	let grouped = grKeys.map(
		(key) => {
			return {key, data: grMap.get(key)!}
		})

	for (let group of grouped) {
		group.data.sort((a, b) => {
			let comparison = 0
			if (a.data[index] === null && b.data[index] !== null) return -1
			if (a.data[index] !== null && b.data[index] === null) return 1
			if (a.data[index] < b.data[index]) comparison = -1
			if (a.data[index] > b.data[index]) comparison = 1
			if (comparison === 0) {
				for (let i = 0; i < a.data.length; i++) {
					if (i === index) continue
					if (a.data[i] === null && b.data[i] !== null) return -1
					if (a.data[i] !== null && b.data[i] === null) return 1
					if (a.data[i] < b.data[i]) return -1
					if (a.data[i] > b.data[i]) return 1
				}
			}
			return order === "asc" ? comparison : -comparison
		})
	}

	return grouped.map(g => {
		return {key: g.key, ids: g.data.map(a => a.id)}
	})
}
