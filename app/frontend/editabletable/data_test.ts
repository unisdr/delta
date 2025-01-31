import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {DataManager} from './data'

describe('DataManager', () => {
	it('initializes with no updates', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
			["Bob", 22],
		]
		const ids = ["1", "2", "3"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)
		assert.deepEqual(manager.applyUpdates(), [
			{id: "3", data: ["Bob", 22], from: ["i", "i"]},
			{id: "2", data: ["Jane", 30], from: ["i", "i"]},
			{id: "1", data: ["John", 25], from: ["i", "i"]},
		])
	})

	it('initializes with updates', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
			["Bob", 22],
		]
		const ids = ["1", "2", "3"]
		const previousUpdates = {
			updates: {"1": {"1": 26}},
			deletes: ["2"],
			newRows: {"4": ["Alice", 28]},
		}

		const manager = new DataManager()
		manager.init(2, initialData, ids, previousUpdates)

		assert.deepEqual(manager.applyUpdates(), [
			{id: "4", data: ["Alice", 28], from: ["n", "n"]},
			{id: "3", data: ["Bob", 22], from: ["i", "i"]},
			{id: "1", data: ["John", 26], from: ["i", "u"]},
		])
	})

	it('handles updates correctly', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)

		manager.updateField("1", 0, "Johnny")
		manager.updateField("2", 1, 35)

		assert.deepEqual(manager.applyUpdates(), [
			{id: "2", data: ["Jane", 35], from: ["i", "u"]},
			{id: "1", data: ["Johnny", 25], from:["u","i"]},
		])
	})

	it('handles deletes correctly', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)

		manager.updateField("1", 0, "Johnny")
		manager.deleteRow("1")

		assert.deepEqual(manager.applyUpdates(), [
			{id: "2", data: ["Jane", 30], from: ["i","i"]},
		])
	})

	it('handles new rows correctly', () => {
		const initialData = [["John", 25]]
		const ids = ["1"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)
		const id = manager.addRow("start")
		manager.updateField(id, 0, "Jane")

		assert.deepEqual(manager.applyUpdates(), [
			{id: "_temp1", data: ["Jane", null], from: ["n", "n"]},
			{id: "1", data: ["John", 25], from: ["i", "i"]},
		])
	})

	it('exports updates for saving', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)

		manager.updateField("1", 1, 26)
		manager.deleteRow("2")
		let id = manager.addRow("end")
		manager.updateField(id, 0, "Bob")

		assert.deepEqual(manager.getUpdatesForSaving(), {
			updates: {"1": {"1": 26}},
			deletes: ["2"],
			newRows: {"_temp1": ["Bob", null]},
		})
	})

	it('sort by column', () => {
		const initialData = [
			["John", 25],
			["Jane", 30],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)
		manager.updateField("1", 1, 27)
		manager.deleteRow("2")
		let id = manager.addRow("start")
		manager.updateField(id, 0, "Bob")
		manager.updateField(id, 1, 28)
		manager.sortByColumn(1, "desc")

		let res = manager.applyUpdates()
		console.log(manager)
		console.log(res)
		assert.deepEqual(res, [
			{id: "_temp1", data: ["Bob", 28], from: ["n", "n"]},
			{id: "1", data: ["John", 27], from:["i","u"] },
		])
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
		manager.init(2, initialData, ids)
		manager.sortByColumn(1, "desc")
		let res = manager.applyUpdates()
		console.log(res)
		assert.deepEqual(res, [
			{id: "3", data: ["C", null], from: ["i", "i"]},
			{id: "5", data: ["E", 5], from: ["i", "i"]},
			{id: "4", data: ["D", 4], from: ["i", "i"]},
			{id: "2", data: ["B", 2], from: ["i", "i"]},
			{id: "1", data: ["A", 1], from: ["i", "i"]},
		])
	})

	it('copy row', () => {
		const initialData = [
			["John", 1],
			["Jane", 2],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)
		manager.copyRow("2")
		let res = manager.applyUpdates()
		console.log("res", res)
		assert.deepEqual(res, [
			{id: "2", data: ["Jane", 2], from: ["i", "i"]},
			{id: "_temp1", data: ["Jane", 2], from: ["n", "n"]},
			{id: "1", data: ["John", 1], from: ["i", "i"]},
		])
	})

	it('copy row, delete copied', () => {
		const initialData = [
			["John", 1],
			["Jane", 2],
		]
		const ids = ["1", "2"]
		const manager = new DataManager()
		manager.init(2, initialData, ids)
		manager.copyRow("2")
		manager.deleteRow("_temp1")
		let res = manager.applyUpdates()
		console.log("res", res)
		assert.deepEqual(res, [
			{id: "2", data: ["Jane", 2], from: ["i", "i"]},
			{id: "1", data: ["John", 1], from: ["i", "i"]},
		])
	})

})

