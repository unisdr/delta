export interface PreviousUpdatesFromJson {
	updates?: Record<string, Record<number, any>>
	deletes?: string[]
	newRows?: Record<string, any[]>
}

// i - initial
// u - update
// n - new
type From = ("i" | "u" | "n")[]

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

export class DataManager {

	private colCount: number
	private lastTempId: number
	private initial: Map<string, any[]>
	private updates: Map<string, Map<number, any>>
	private deletes: Set<string>
	private newRows: Map<string, any[]>
	public sortOrder: string[]
	private sort: Sort

	constructor() {
		this.colCount = 0
		this.lastTempId = 0
		this.initial = new Map()
		this.updates = new Map()
		this.deletes = new Set()
		this.newRows = new Map()
		this.sortOrder = []
		this.sort = {column: 0, order: "asc"}
	}

	init(colCount: number, initialData: any[][], ids: string[], previousUpdatesFromJson: PreviousUpdatesFromJson = {}) {
		this.colCount = colCount
		if (colCount == 0) {
			throw "ColCount is 0"
		}
		if (initialData.length !== ids.length) {
			throw new Error("Mismatch between the number of rows and ids")
		}
		this.initial = new Map(ids.map((id, index) => [id, initialData[index]]))
		this.sortOrder = [...ids]
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

		this.sortOrder = this.sortOrder.filter(id => !this.deletes.has(id))
		this.sortOrder.push(...Array.from(this.newRows.keys()))

		this.sortDefault()
	}

	getSort(): Sort {
		return this.sort
	}

	sortDefault() {
		this.sortByColumn(0, "asc")
	}

	sortByColumn(index: number, order: "asc" | "desc") {
		this.sort = {column: index, order}
		const rows = this.applyUpdates()

		rows.sort((a, b) => {
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

		this.sortOrder = rows.map(row => row.id)
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

	deleteRow(rowId: string) {
		if (this.rowIdIsNew(rowId)) {
			this.newRows.delete(rowId)
		} else {
			this.deletes.add(rowId)
		}
		this.sortOrder = this.sortOrder.filter(id => id !== rowId)
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

	addRow(loc: "start" | "end"): string {
		let id = this.newId()
		this.newRows.set(id, Array(this.colCount).fill(null))
		if (loc == "start") {
			this.sortOrder.unshift(id)
		} else {
			this.sortOrder.push(id)
		}
		return id
	}


	applyUpdates(): DataWithId[] {
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
			if (row.length != this.colCount) {
				throw new Error("newRows length mismatch")
			}
			let from: From = Array(row.length).fill("n")
			rowsMap.set(id, {id, data: row, from})
		})

		// check that all rows are in sortOrder
		let sortOrderIds = new Map<string, boolean>()
		for (let id of this.sortOrder) {
			sortOrderIds.set(id, true)
		}
		for (let [id, _] of rowsMap) {
			if (!sortOrderIds.has(id)) {
				throw new Error("SortOrder array missing id: " + id)
			}
		}
		return this.sortOrder
			.map(id => {
				const row = rowsMap.get(id)
				if (!row) throw new Error(`ID not found in rowsMap: ${id}`)
				return row
			})
			.filter(row => row !== undefined) as DataWithId[]
	}

	getUpdatesForSaving(): any {
		return {
			updates: Object.fromEntries(
				Array.from(this.updates.entries()).map(([rowId, fields]) => [
					rowId,
					Object.fromEntries(fields.entries()),
				])
			),
			deletes: Array.from(this.deletes),
			newRows: Object.fromEntries(this.newRows.entries()),
		}
	}

	copyRow(rowId: string) {
		let data = this.applyUpdates()
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
			let i = this.sortOrder.indexOf(rowId)
			if (i === -1) {
				throw new Error("row not found in sort order: " + rowId)
			}
			this.sortOrder.splice(i + 1, 0, id)
		}
	}

}

