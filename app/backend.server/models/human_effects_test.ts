import {beforeEach, describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dr} from '~/db.server'
import {
	create,
	update,
	deleteRows,
	get,
} from './human_effects'
import {injuredTable, humanDsgTable} from '~/drizzle/schema'

import {Def} from "~/frontend/editabletable/defs"

import {
	sql
} from "drizzle-orm"

async function truncateData() {
	await dr.execute(sql`TRUNCATE ${humanDsgTable}, ${injuredTable} CASCADE`)
}

let defs1: Def[] = [
	{
		shared: true,
		uiName: "Sex",
		jsName: "sex",
		dbName: "sex",
		type: "enum",
		data: [
			{key: "m", label: "Male"},
			{key: "f", label: "Female"}]
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		type: "number"
	}
]

describe("human_effects", async () => {
	beforeEach(async () => {
		await truncateData()
	})

	it("create basic", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", "rid1", defs, [["m", 1], ["f", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 2], ["m", 1]])
		}
	})
	it("get field casing", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Global Poverty Line",
				jsName: "globalPovertyLine",
				dbName: "global_poverty_line",
				type: "enum",
				data: [
					{key: "above", label: "Above"},
					{key: "below", label: "Below"}]
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				type: "number"
			}
		]
		{
			let res = await create(dr, "Injured", "rid1", defs, [["above", 1], ["below", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["above", 1], ["below", 2]])
		}
	})
	it("type mismatch", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", "rid1", defs, [[1, 1], [1, 2]], false)
			console.log(res)
			assert(!res.ok)
			assert.equal(res.error.code, "invalid_value")
		}
	})
	it("non string data (for json)", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", "rid1", defs, [["m", 1], ["f", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 2], ["m", 1]])
		}
	})
	it("string data (for csv)", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", "rid1", defs, [["m", "1"], ["f", "2"]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 2], ["m", 1]])
		}
	})
	it("update", async () => {
		let defs = defs1
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", "rid1", defs, [["m", "1"], ["f", "2"]], true)
			console.log(res)
			assert(res.ok)
			ids = res.ids
		}
		{
			let res = await update(dr, "Injured", defs, ids, [["m", "3"], ["f", "4"]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 4], ["m", 3]])
		}
	})
	it("update (partial)", async () => {
		let defs = defs1
		let ids = []
		{
			let res = await create(dr, "Injured", "rid1", defs, [["m", "1"], ["f", "2"]], true)
			assert(res.ok)
			ids = res.ids
		}
		{
			let res = await update(dr, "Injured", defs, ids, [
				[undefined, "3"],
				[null, "4"],
			], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [[null, 4], ["m", 3]])
		}
	})

	it("delete", async () => {
		let defs = defs1
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", "rid1", defs, [["m", "1"], ["f", "2"]], true)
			console.log(res)
			assert(res.ok)
			ids = res.ids
		}
		{
			let res = await deleteRows(dr, "Injured", ids)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", "rid1", defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [])
		}
	})
})

