import {
	DefData,
	DataWithIdBasic,
} from "~/frontend/editabletable/base"
import {
	validateResToMessage,
	validate as validateData
} from "./validate"


export interface PreviousUpdatesFromJson {
	updates?: Record<string, Record<number, any>>
	deletes?: string[]
	newRows?: Record<string, any[]>
	totalGroupFlags?: TotalGroupFlags
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

export interface DataManagerCols {
	dimensions: number
	metrics: number
}

export interface Group<T> {
	key: string
	data: T[]
}

export function flattenGroups(groups: Group<DataWithIdBasic>[]): DataWithIdBasic[] {
	let result: DataWithIdBasic[] = []
	for (let i = 0; i < groups.length; i++) {
		let group = groups[i]
		for (let j = 0; j < group.data.length; j++) {
			result.push(group.data[j])
		}
	}
	return result
}

// Example: 10010
// 1 when disagg is set, 0 when not
export type GroupKey = string

export function groupKeyOnlyZeroes(key: GroupKey): boolean {
	return typeof key === 'string' && /^0+$/.test(key)
}

export interface sortOrderGroup {
	key: string
	ids: string[]
}

export type TotalGroupFlags = string[] | 'invalid' | null

export type TotalGroupString = GroupKey | 'invalid' | null

export function totalGroupToString(defs: DefData[], tg: TotalGroupFlags): TotalGroupString {
	if (tg === null) return null
	if (tg === 'invalid') return 'invalid'
	if (!Array.isArray(tg)) {
		console.error('Expected total group data to be an array', tg)
		throw new Error('Expected total group data to be an array')
	}
	const res: string[] = []
	for (let i = 0; i < defs.length; i++) {
		let def = defs[i]
		if (def.format == 'number') {
			break
		}
		res.push(tg.includes(def.dbName) ? '1' : '0')
	}
	return res.join('')
}

export function totalGroupFromString(defs: DefData[], s: TotalGroupString): TotalGroupFlags {
	if (s === null) return null
	if (s === 'invalid') return 'invalid'

	const res: string[] = []
	for (let i = 0; i < defs.length; i++) {
		let def = defs[i]
		if (def.format == "number") {
			break
		}
		let v = s[i]
		if (v === "1") {
			res.push(def.dbName)
		}
	}
	return res
}

export function validateTotalGroup(itg: TotalGroupFlags, defs: DefData[]): { res: TotalGroupFlags, error: Error | null } {
	if (itg !== null && itg !== "invalid" && !Array.isArray(itg)) {
		let error = new Error('Expected total group data to be an array')
		return { res: 'invalid', error }
	}
	if (Array.isArray(itg)) {
		if (!itg.every(a => typeof a == 'string')) {
			let error = new Error('Expected total group data to be an array of strings')
			return { res: 'invalid', error }
		}

		let defKeys = []
		for (let i = 0; i < defs.length; i++) {
			if (defs[i].format === 'number') break
			defKeys.push(defs[i].dbName)
		}
		let defSet = new Set(defKeys)
		let match = itg.every(k => defSet.has(k))
		if (!match) {
			let error = new Error(`Definitions in previous group selected for total no longer exist in columns defined, please select other group for total. Selected group total keys: ${itg}. Available keys: ${defKeys}`)
			return { res: 'invalid', error }
		}
	}
	return { res: itg, error: null }
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

	private totalsId: string | null

	private totalGroupFlags: TotalGroupFlags = null

	private defs: DefData[]

	constructor() {
		this.cols = { dimensions: 0, metrics: 0 }
		this.totalsId = null
		this.lastTempId = 0
		this.initial = new Map()
		this.updates = new Map()
		this.deletes = new Set()
		this.newRows = new Map()
		this.sortOrder = []
		this.defs = []
		this.sort = { column: 0, order: "asc" }
	}

	init(defs: DefData[], cols: DataManagerCols, initialData: any[][], ids: string[], initialTotalGroup: TotalGroupFlags = null, previousUpdatesFromJson: PreviousUpdatesFromJson = {}) {
		//console.log("prev data", previousUpdatesFromJson)
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
			g => { return { key: g.key, ids: g.ids.filter(id => !this.deletes.has(id)) } }
		)

		this.sortOrder[0].ids.push(...Array.from(this.newRows.keys()))

		this.totalsId = null

		let totalsRows = 0

		for (let row of this.applyUpdatesUnsorted()) {
			let ok = true
			for (let i = 0; i < this.cols.dimensions; i++) {
				let v = row.data[i]
				if (v != null) {
					ok = false
					break
				}
			}
			//console.log("checking row if totals", row, ok)
			if (ok) {
				totalsRows++
				this.totalsId = row.id
			}
		}
		if (totalsRows > 1) {
			console.error("found more than 1 totals row", totalsRows)
		}


		/*
		if (!this.totalsId) {
			let id = this.addRow("end")
			this.totalsId = id
		}*/

		this.sortDefault()


		let vgt = validateTotalGroup(initialTotalGroup, defs)

		this.totalGroupFlags = vgt.res
		if (vgt.error != null) {
			console.error(vgt.error)
		}


		this.defs = defs
	}

	getTotalGroupString(): TotalGroupString {
		return totalGroupToString(this.defs, this.totalGroupFlags)
	}
	setTotalGroupString(v: TotalGroupString) {
		this.totalGroupFlags = totalGroupFromString(this.defs, v)
		this.syncTotalsFromGroup()
	}

	hasUnsavedChanges(): boolean {
		//console.log("hasUnsavedChanges", this.updates, this.deletes, this.newRows)

		return (
			this.updates.size > 0 ||
			this.deletes.size > 0 ||
			this.newRows.size > 0
		)
	}

	getTotalsFromGroup(): { data: number[] } | null {
		let totalGroup = this.getTotalGroupString()
		if (!totalGroup) {
			return null
		}
		let allGroupTotals = this.groupTotals()

		let groupTotal = allGroupTotals.get(totalGroup)

		if (!groupTotal) {
			return {
				data: Array(this.cols.metrics).fill(0),
			}
		}
		return {
			data: groupTotal,
		}
	}

	getTotals(): { id?: string, data: number[] } | null {
		let v = this.getTotalsFromGroup()
		if (v) {
			return v
		}
		if (this.totalsId === null) {
			return null
		}
		for (let row of this.applyUpdatesUnsorted()) {
			if (row.id === this.totalsId) {
				let data: number[] = []
				let i = this.cols.dimensions
				while (i < row.data.length) {
					let v = row.data[i]
					if (v === null) {
						data.push(0)
					} else if (typeof v !== 'number' || isNaN(v)) {
						throw new Error('Invalid totals row: non-number metric value')
					} else {
						data.push(v)
					}
					i = i + 1
				}
				//console.log("get totals res", row, data)
				return { data, id: this.totalsId }
			}
		}
		throw new Error('Totals row not found')

	}

	groupTotals(): Map<string, number[]> {
		let res = new Map<string, number[]>
		let data = this.applyUpdatesWithGroupKey()
		for (let g of data) {
			let hasDate = false
			for (let row of g.data) {
				for (let i = 0; i < this.cols.dimensions; i++) {
					if (this.defs[i].format === "date") {
						let v = row.data[i]
						if (v) hasDate = true
						break
					}
				}
				if (hasDate) break
			}
			if (hasDate) continue
			let groupTotals = Array(this.cols.metrics).fill(0)
			for (let row of g.data) {
				for (let i = 0; i < this.cols.metrics; i++) {
					let j = i + this.cols.dimensions
					let v = Number(row.data[j])
					if (!isNaN(v)) {
						groupTotals[i] += v
					}
				}
			}
			res.set(g.key, groupTotals)
		}
		return res
	}

	validate(): string {
		let data = this.applyUpdatesUnsorted()
		let noTotalsRow = data.filter((row) => {
			return row.id !== this.totalsId
		})
		let totals = this.getTotals()
		let res = validateData(this.defs, noTotalsRow, totals?.data || null)
		return validateResToMessage(res)
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
		this.sort = { column: index, order }
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
		if (rowId != this.totalsId) {
			this.syncTotalsFromGroup()
		}
	}

	updateTotals(fieldIndex: number, newValue: number) {
		if (this.totalsId === null) {
			let id = this.addRow("end")
			this.totalsId = id
		}
		//console.log("updateTotals", fieldIndex, newValue)
		this.updateField(this.totalsId, fieldIndex + this.cols.dimensions, newValue)
		//console.log("updateTotals new data", this.applyUpdatesUnsorted())
	}

	syncTotalsFromGroup() {
		let totals = this.getTotalsFromGroup()
		if (!totals) {
			return
		}
		let data = totals.data
		for (let i = 0; i < data.length; i++) {
			this.updateTotals(i, data[i])
		}
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
			rowsMap.set(id, { id, data: updatedRow, from })
		})

		this.newRows.forEach((row, id) => {
			if (row.length != this.colCount()) {
				throw new Error("newRows length mismatch")
			}
			let from: From = Array(row.length).fill("n")
			rowsMap.set(id, { id, data: row, from })
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
				return { key: g.key, data: g.data.filter(r => r.id != this.totalsId) }
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
			totalGroupFlags: this.totalGroupFlags,
		}
		if (this.totalGroupFlags && this.totalsId !== null) {
			this.updates.delete(this.totalsId)
			this.deletes.delete(this.totalsId)
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
		return { key: g.key, data }
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
			return { key, data: grMap.get(key)! }
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
		return { key: g.key, ids: g.data.map(a => a.id) }
	})
}


