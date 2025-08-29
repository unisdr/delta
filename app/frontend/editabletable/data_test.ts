import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	DataManager,
	groupedSort,
	applySortOrder,
	DataWithIdBasic,
	dataToGroupKey,
	dataKeySet,
	DataManagerCols,
} from './data'
import { DefData } from "~/frontend/editabletable/defs"

describe('DataManager', () => {
	let cols: DataManagerCols = { dimensions: 1, metrics: 1 }
	let defs: DefData[] = [
		{
			dbName: "col1",
			format:"enum",
		},
		{
			dbName: "col2",
			format:"number"
		},
	]

	it('initializes with no updates', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
			["Bob", 22],
		]
		const ids = ["1", "2", "3"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)
		let res = manager.applyUpdates()
		console.log("res", res)
		assert.deepEqual(res, [
			[
				{ id: "3", data: ["Bob", 22], from: ["i", "i"] },
				{ id: "2", data: ["Jane", 30], from: ["i", "i"] },
				{ id: "1", data: ["John", 25], from: ["i", "i"] },
			]])
	})

	it('initializes with updates', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
			["Bob", 22],
		]
		const ids = ["1", "2", "3"]
		const previousUpdates = {
			updates: { "1": { "1": 26 } },
			deletes: ["2"],
			newRows: { "4": ["Alice", 28] },
		}

		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids, null, previousUpdates)
		let res = manager.applyUpdates()
		assert.deepEqual(res, [
			[
				{ id: "4", data: ["Alice", 28], from: ["n", "n"] },
				{ id: "3", data: ["Bob", 22], from: ["i", "i"] },
				{ id: "1", data: ["John", 26], from: ["i", "u"] },
			]])
	})

	it('handles updates correctly', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)

		manager.updateField("1", 0, "Johnny")
		manager.updateField("2", 1, 35)

		let res = manager.applyUpdates()
		assert.deepEqual(res, [
			[
				{ id: "2", data: ["Jane", 35], from: ["i", "u"] },
				{ id: "1", data: ["Johnny", 25], from: ["u", "i"] },
			]])
	})

	it('handles deletes correctly', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)

		manager.updateField("1", 0, "Johnny")
		manager.deleteRow("1")

		let res = manager.applyUpdates()
		assert.deepEqual(res, [
			[
				{ id: "2", data: ["Jane", 30], from: ["i", "i"] },
			]])
	})

	it('handles new rows correctly', () => {
		const initialData = [["John", 25]]
		const ids = ["1"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)
		const id = manager.addRow("start")
		manager.updateField(id, 0, "Jane")

		let res = manager.applyUpdates()
		console.log("res", res)
		assert.deepEqual(res, [
			[
				{ id: "_temp2", data: ["Jane", null], from: ["n", "n"] }
			], [
				{ id: "1", data: ["John", 25], from: ["i", "i"] },
			]])
	})

	it('exports updates for saving', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)

		manager.updateField("1", 1, 26)
		manager.deleteRow("2")
		let id = manager.addRow("end")
		manager.updateField(id, 0, "Bob")

		assert.deepEqual(manager.getUpdatesForSaving(), {
			updates: { "1": { "1": 26 } },
			deletes: ["2"],
			newRows: {
				"_temp1": [null, null],
				"_temp2": ["Bob", null]
			},
			totalGroupFlags: null,
		})
	})

	it('sort by column', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)
		manager.updateField("1", 1, 27)
		manager.deleteRow("2")
		let id = manager.addRow("start")
		manager.updateField(id, 0, "Bob")
		manager.updateField(id, 1, 28)
		manager.sortByColumn(1, "desc")

		let res = manager.applyUpdates()
		console.log("res", res)
		assert.deepEqual(res, [
			[
				{ id: "_temp2", data: ["Bob", 28], from: ["n", "n"] },
				{ id: "1", data: ["John", 27], from: ["i", "u"] },
			]])
	})

	it('sort by column - null values', () => {
		const initialData = [
			["A", 1],
			["B", 2],
			["C", null],
			["D", 4],
			["E", 5],
		]
		const ids = ["1", "2", "3", "4", "5"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)
		manager.sortByColumn(1, "desc")
		let res = manager.applyUpdates()
		assert.deepEqual(res, [
			[
				{ id: "3", data: ["C", null], from: ["i", "i"] },
				{ id: "5", data: ["E", 5], from: ["i", "i"] },
				{ id: "4", data: ["D", 4], from: ["i", "i"] },
				{ id: "2", data: ["B", 2], from: ["i", "i"] },
				{ id: "1", data: ["A", 1], from: ["i", "i"] },
			]])
	})

	it('copy row', () => {
		const initialData = [
			["John", 1],
			["Jane", 2],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)
		manager.copyRow("2")
		let res = manager.applyUpdates()
		assert.deepEqual(res, [
			[
				{ id: "2", data: ["Jane", 2], from: ["i", "i"] },
				{ id: "_temp2", data: ["Jane", 2], from: ["n", "n"] },
				{ id: "1", data: ["John", 1], from: ["i", "i"] },
			]])
	})

	it('copy row, delete copied', () => {
		const initialData = [
			["John", 1],
			["Jane", 2],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(defs, cols, initialData, ids)
		manager.copyRow("2")
		manager.deleteRow("_temp2")
		let res = manager.applyUpdates()
		console.log(res)
		assert.deepEqual(res, [
			[
				{ id: "2", data: ["Jane", 2], from: ["i", "i"] },
				{ id: "1", data: ["John", 1], from: ["i", "i"] },
			]])
	})

	describe('applySortOrder', () => {
		let fn = applySortOrder
		it('basic', () => {
			let data: DataWithIdBasic[] = [
				{ id: "id1", data: ["a", 1] },
				{ id: "id2", data: ["b", 2] },
			]
			let res = fn(data, [
				{ key: "a", ids: ["id1", "id2"] },
			])
			assert.deepEqual(res, [
				{ key: "a", data }
			])
		})
		it('basic - order adjusted', () => {
			let data: DataWithIdBasic[] = [
				{ id: "id1", data: ["a", 1] },
				{ id: "id2", data: ["b", 2] },
			]
			let res = fn(data, [
				{ key: "a", ids: ["id2", "id1"] }
			])
			assert.deepEqual(res, [
				{
					key: "a", data: [
						{ id: "id2", data: ["b", 2] },
						{ id: "id1", data: ["a", 1] },
					]
				}])
		})
		it('grouped', () => {
			let data: DataWithIdBasic[] = [
				{ id: "id1", data: ["a", 1] },
				{ id: "id2", data: ["b", 2] },
				{ id: "id3", data: ["c", 3] },
			]
			let res = fn(data, [
				{ key: "a", ids: ["id3"] },
				{ key: "b", ids: ["id2", "id1"] },
			])
			assert.deepEqual(res, [
				{
					key: "a", data: [
						{ id: "id3", data: ["c", 3] },
					]
				},
				{
					key: "b", data: [
						{ id: "id2", data: ["b", 2] },
						{ id: "id1", data: ["a", 1] },
					]
				}
			])
		})
	})

	it('handle totals', () => {
		const manager = new DataManager()
		manager.init(defs, cols, [[null, 22]], ["id1"])
		assert.deepEqual(manager.getTotals(), { data: [22], id: "id1" })
		assert.deepEqual(manager.applyUpdates(), [])
	})

	it('handle totals - new', () => {
		const manager = new DataManager()
		manager.init(defs, cols, [], [])
		assert.deepEqual(manager.getTotals(), { data: [null], id: "_temp1" })
		assert.deepEqual(manager.applyUpdates(), [])
	})

	it('handle totals - update', () => {
		const manager = new DataManager()
		manager.init(defs, cols, [[null, 22]], ["id1"])
		manager.updateTotals(0, 23)
		assert.deepEqual(manager.getTotals(), { data: [23], id: "id1" })
		assert.deepEqual(manager.applyUpdates(), [])
	})

	it('get group totals - basic', () => {
		let manager = new DataManager()
		manager.init(defs, cols, [
			[null, 22],
			['a', 5],
			['b', 6],
		], ['id1', 'id2', 'id3'])
		let res = manager.groupTotals()
		let want = new Map([
			["1", [11]],
		])
		assert.deepEqual(res, want)
	})

	it('use group totals for overall totals', () => {
		let manager = new DataManager()
		manager.init(defs, cols, [
			[null, null],
			['a', 5],
			['b', 6],
		], ['id1', 'id2', 'id3'])
		manager.setTotalGroupString("1")
		let res = manager.getTotals()
		let want = {
			data: [11],
		}
		assert.deepEqual(res, want)
	})

	it('get group totals - basic', () => {
		let manager = new DataManager()
		manager.init(defs, cols, [
			[null, 22],
			['a', 5],
			['b', 6],
		], ['id1', 'id2', 'id3'])
		let res = manager.groupTotals()
		let want = new Map([
			["1", [11]],
		])
		assert.deepEqual(res, want)
	})

	it('groupTotalsAreNotOver - true', () => {
		let manager = new DataManager()
		manager.init(defs, cols, [
			[null, 11],
			['a', 5],
			['b', 6],
		], ['id1', 'id2', 'id3'])
		let res = manager.groupTotalsAreNotOver()
		assert.equal(res, true)
	})

	it('groupTotalsAreNotOver - false', () => {
		let manager = new DataManager()
		manager.init(defs, cols, [
			[null, 10],
			['a', 5],
			['b', 6],
		], ['id1', 'id2', 'id3'])
		let res = manager.groupTotalsAreNotOver()
		assert.equal(res, false)
	})
})


it("dataToGroupKey", () => {
	let fn = dataToGroupKey
	let res = fn([1, 2])
	assert.equal(res, "11")
	assert.equal(dataKeySet(res), 2)
	res = fn([1, null])
	assert.equal(res, "10")
	assert.equal(dataKeySet(res), 1)
})

describe('groupedSort', () => {

	let fn = groupedSort
	it("basic", () => {
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["b", 2] },
			{ id: "id1", data: ["a", 1] },
			{ id: "id3", data: ["c", 3] },
		]
		let res = fn(input, 0, "asc", 1)
		assert.deepEqual(res, [
			{ key: "1", ids: ["id1", "id2", "id3"] },
		])
	})


	it("group different number of disagregations separately, sort less first", () => {
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["b", null, 2] },
			{ id: "id1", data: ["a", "a", 1] },
			{ id: "id3", data: ["c", null, 3] },
		]
		let res = fn(input, 0, "asc", 2)
		console.log("res", res)
		assert.deepEqual(res, [
			{ key: "10", ids: ["id2", "id3"] },
			{ key: "11", ids: ["id1"] },
		])
	})
})
