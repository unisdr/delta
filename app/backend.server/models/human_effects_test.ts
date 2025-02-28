import {beforeEach, describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dr} from '~/db.server'
import {
	create,
	update,
	deleteRows,
	get,
	validate,
	categoryPresenceGet,
	categoryPresenceSet
} from './human_effects'
import {injuredTable, humanDsgTable, humanCategoryPresenceTable, disasterRecordsTable, disasterEventTable, hazardousEventTable} from '~/drizzle/schema'

import {Def} from "~/frontend/editabletable/defs"

import {
	sql
} from "drizzle-orm"
import {createTestDisasterRecord1, testDisasterRecord1Id} from './disaster_record_test'

let rid1 = testDisasterRecord1Id

let defs1: Def[] = [
	{
		shared: true,
		uiName: "Sex",
		jsName: "sex",
		dbName: "sex",
		format: "enum",
		role: "dimension",
		data: [
			{key: "m", label: "Male"},
			{key: "f", label: "Female"}]
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		format: "number",
		role: "metric"
	}
]

let defs2: Def[] = [
	{
		uiName: "As of",
		jsName: "asOf",
		dbName: "as_of",
		format: "date",
		role: "dimension",
	},
	{
		uiName: "Missing",
		jsName: "missing",
		dbName: "missing",
		format: "number",
		role: "metric",
	}
]

let defsCustom: Def[] = [
	{
		uiName: "custom",
		jsName: "custom",
		dbName: "custom",
		custom: true,
		format: "enum",
		role: "dimension",
		data: [
			{key: "g1", label: "G1"},
			{key: "g2", label: "G2"}]
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		format: "number",
		role: "metric"
	}
]

async function resetTestData() {
	await dr.execute(sql`TRUNCATE ${humanDsgTable}, ${injuredTable}, ${disasterRecordsTable}, ${disasterEventTable}, ${hazardousEventTable} CASCADE`)
	await createTestDisasterRecord1(dr)
}

describe("human_effects - number data", async () => {
	beforeEach(async () => {
		await resetTestData()
	})

	it("create basic", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["m", 1], ["f", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 2], ["m", 1]])
		}
	})

	it("create - validation - no duplicates", async () => {
		let defs = defs1
		let res1 = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [
			["m", 1],
			["m", 2]
		], false)
		assert(res1.ok)
		let res = await validate(dr, "Injured", rid1, defs)
		assert(!res.ok)
		assert.equal(res.errors?.length, 2)
		let e0 = res.errors[0]
		let e1 = res.errors[1]
		console.log("errors", res.errors)
		assert.equal(e0.code, "duplicate_dimension")
		assert.equal(e1.code, "duplicate_dimension")
	})

	it("create custom", async () => {
		let defs = defsCustom
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["g1", 1]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["g1", 1]])
		}
	})

	it("get field casing", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Global Poverty Line",
				jsName: "globalPovertyLine",
				dbName: "global_poverty_line",
				format: "enum",
				role: "dimension",
				data: [
					{key: "above", label: "Above"},
					{key: "below", label: "Below"}]
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["above", 1], ["below", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["above", 1], ["below", 2]])
		}
	})
	it("type mismatch", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [[1, 1], [1, 2]], false)
			console.log(res)
			assert(!res.ok)
			assert.equal(res.error!.code, "invalid_value")
		}
	})
	it("non string data (for json)", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["m", 1], ["f", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 2], ["m", 1]])
		}
	})
	it("string data (for csv)", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["m", "1"], ["f", "2"]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 2], ["m", 1]])
		}
	})
	it("string data (for csv) - unset", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["", ""]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [[null, null]])
		}
	})
	it("non string data (for json) - date", async () => {
		let defs = defs2
		{
			let res = await create(dr, "Missing", rid1, defs, ["t1", "t2"], [["2025-01-29", 1], ["2025-01-30", 2]], false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Missing", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [
				["2025-01-29 00:00:00", 1],
				["2025-01-30 00:00:00", 2],
			])
		}
	})
	it("string data (for csv) - date", async () => {
		let defs = defs2
		{
			let res = await create(dr, "Missing", rid1, defs, ["t1", "t2"], [["2025-01-29", "1"], ["2025-01-30", "2"]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Missing", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [
				["2025-01-29 00:00:00", 1],
				["2025-01-30 00:00:00", 2],
			])
		}
	})
	it("string data (for csv) - date - wrong format", async () => {
		let defs = defs2
		{
			let res = await create(dr, "Missing", rid1, defs, ["t1", "t2"], [["xxxx", "1"]], true)
			console.log(res)
			assert(!res.ok)
			assert.equal(res.error!.code, "invalid_value")
		}
	})
	it("update", async () => {
		let defs = defs1
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["m", "1"], ["f", "2"]], true)
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
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["f", 4], ["m", 3]])
		}
	})
	it("update custom", async () => {
		let defs = defsCustom
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["g1", 1]], false)
			console.log(res)
			assert(res.ok)
			ids = res.ids
		}
		{
			let res = await update(dr, "Injured", defs, ids, [["g2", "2"]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["g2", 2]])
		}
	})

	it("update (partial)", async () => {
		let defs = defs1
		let ids = []
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["m", "1"], ["f", "2"]], true)
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
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [[null, 4], ["m", 3]])
		}
	})

	let defsCustom2: Def[] = [
		{
			uiName: "custom1",
			jsName: "custom1",
			dbName: "custom1",
			custom: true,
			format: "enum",
			role: "dimension",
			data: [
				{key: "g1", label: "G1"},
				{key: "g2", label: "G2"}]
		},
		{
			uiName: "custom2",
			jsName: "custom2",
			dbName: "custom2",
			custom: true,
			format: "enum",
			role: "dimension",
			data: [
				{key: "g1", label: "G1"},
				{key: "g2", label: "G2"}]
		},
		{
			uiName: "Injured",
			jsName: "injured",
			dbName: "injured",
			format: "number",
			role: "metric"
		}
	]

	it("update custom - partial", async () => {
		let defs = defsCustom2
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2", "t3"], [["g1", "g2", 1]], false)
			console.log(res)
			assert(res.ok)
			ids = res.ids
		}
		{
			let res = await update(dr, "Injured", defs, ids, [["g2", undefined, "2"]], true)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [["g2", "g2", 2]])
		}
	})


	it("delete", async () => {
		let defs = defs1
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", rid1, defs, ["t1", "t2"], [["m", "1"], ["f", "2"]], true)
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
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [])
		}
	})
})


async function resetCategoryPresenceData() {
	await dr.execute(sql`TRUNCATE ${humanCategoryPresenceTable}, ${disasterRecordsTable}, ${disasterEventTable}, ${hazardousEventTable} CASCADE`)
	await createTestDisasterRecord1(dr)
}

describe("human_effects - category presence data", async () => {
	beforeEach(async () => {
		await resetCategoryPresenceData()
	})

	let defs: Def[] = [
		{
			uiName: "Injured",
			jsName: "injured",
			dbName: "injured",
			format: "number",
			role: "metric"
		}
	]

	it("no data", async () => {
		let res = await categoryPresenceGet(rid1, "Injured", defs)
		assert.deepEqual(res, {})
	})

	it("insert", async () => {
		await categoryPresenceSet(rid1, "Injured", defs, {
			"injured": true
		})
		let res = await categoryPresenceGet(rid1, "Injured", defs)
		assert.deepEqual(res, {"injured": true})
	})

	it("update - false", async () => {
		await categoryPresenceSet(rid1, "Injured", defs, {
			"injured": true
		})
		await categoryPresenceSet(rid1, "Injured", defs, {
			"injured": false,
		})
		let res = await categoryPresenceGet(rid1, "Injured", defs)
		assert.deepEqual(res, {"injured": false})
	})

	it("update - unset", async () => {
		await categoryPresenceSet(rid1, "Injured", defs, {
			"injured": true
		})
		await categoryPresenceSet(rid1, "Injured", defs, {
		})
		let res = await categoryPresenceGet(rid1, "Injured", defs)
		assert.deepEqual(res, {})
	})

	let defs2: Def[] = [
		{
			uiName: "Directly Affected",
			jsName: "direct",
			dbName: "direct",
			format: "number",
			role: "metric",
		}
	]

	it("insert - table prefix", async () => {
		let defs = defs2
		await categoryPresenceSet(rid1, "Affected", defs, {
			"direct": true
		})
		let res = await categoryPresenceGet(rid1, "Affected", defs)
		assert.deepEqual(res, {"direct": true})
	})

	it("update - table prefix", async () => {
		let defs = defs2
		await categoryPresenceSet(rid1, "Affected", defs, {
			"direct": true
		})
		await categoryPresenceSet(rid1, "Affected", defs, {
		})
		let res = await categoryPresenceGet(rid1, "Affected", defs)
		assert.deepEqual(res, {})
	})

})
