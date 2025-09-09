import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dr } from '~/db.server'
import {
	create,
	update,
	deleteRows,
	get,
	validate,
	categoryPresenceGet,
	categoryPresenceSet,
	totalGroupGet,
	totalGroupSet,
	setTotalDsgTable,
	getTotalDsgTable,
	setTotalPresenceTable,
	getTotalPresenceTable,
	calcTotalForGroup
} from './human_effects'
import { HumanEffectsTable } from "~/frontend/human_effects/defs"
import { injuredTable, humanDsgTable, humanCategoryPresenceTable, disasterRecordsTable, disasterEventTable, hazardousEventTable } from '~/drizzle/schema'

import { Def } from "~/frontend/editabletable/base"

import {
	sql
} from "drizzle-orm"
import { createTestDisasterRecord1, testDisasterRecord1Id } from './disaster_record_test'

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
			{ key: "m", label: "Male" },
			{ key: "f", label: "Female" }
		],
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		format: "number",
		role: "metric",
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
			{ key: "g1", label: "G1" },
			{ key: "g2", label: "G2" }
		],
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		format: "number",
		role: "metric",
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
			let res = await create(dr, "Injured", rid1, defs, [["m", 1], ["f", 2]], false)
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

	it("validate - no duplicates", async () => {
		let defs = defs1
		let res1 = await create(dr, "Injured", rid1, defs, [
			["m", 1],
			["m", 2]
		], false)
		assert(res1.ok)
		let res = await validate(dr, "Injured", rid1, defs)
		assert(!res.ok)
		assert.equal(res.rowErrors?.length, 2)
		let e0 = res.rowErrors[0]
		let e1 = res.rowErrors[1]
		//console.log("errors", res.rowErrors)
		assert.equal(e0.code, "duplicate_dimension")
		assert.equal(e1.code, "duplicate_dimension")
	})

	it("create custom", async () => {
		let defs = defsCustom
		{
			let res = await create(dr, "Injured", rid1, defs, [["g1", 1]], false)
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
					{ key: "above", label: "Above" },
					{ key: "below", label: "Below" }]
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
			let res = await create(dr, "Injured", rid1, defs, [["above", 1], ["below", 2]], false)
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
			let res = await create(dr, "Injured", rid1, defs, [[1, 1], [1, 2]], false)
			console.log(res)
			assert(!res.ok)
			assert.equal(res.error!.code, "invalid_value")
		}
	})
	it("non string data (for json)", async () => {
		let defs = defs1
		{
			let res = await create(dr, "Injured", rid1, defs, [["m", 1], ["f", 2]], false)
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
			let res = await create(dr, "Injured", rid1, defs, [["m", "1"], ["f", "2"]], true)
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
			let res = await create(dr, "Injured", rid1, defs, [["", ""]], true)
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
			let res = await create(dr, "Missing", rid1, defs, [["2025-01-29", 1], ["2025-01-30", 2]], false)
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
			let res = await create(dr, "Missing", rid1, defs, [["2025-01-29", "1"], ["2025-01-30", "2"]], true)
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
			let res = await create(dr, "Missing", rid1, defs, [["xxxx", "1"]], true)
			console.log(res)
			assert(!res.ok)
			assert.equal(res.error!.code, "invalid_value")
		}
	})
	it("update", async () => {
		let defs = defs1
		let ids: string[] = []
		{
			let res = await create(dr, "Injured", rid1, defs, [["m", "1"], ["f", "2"]], true)
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
			let res = await create(dr, "Injured", rid1, defs, [["g1", 1]], false)
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
			let res = await create(dr, "Injured", rid1, defs, [["m", "1"], ["f", "2"]], true)
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
				{ key: "g1", label: "G1" },
				{ key: "g2", label: "G2" }]
		},
		{
			uiName: "custom2",
			jsName: "custom2",
			dbName: "custom2",
			custom: true,
			format: "enum",
			role: "dimension",
			data: [
				{ key: "g1", label: "G1" },
				{ key: "g2", label: "G2" }]
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
			let res = await create(dr, "Injured", rid1, defs, [["g1", "g2", 1]], false)
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
			let res = await create(dr, "Injured", rid1, defs, [["m", "1"], ["f", "2"]], true)
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
		let res = await categoryPresenceGet(dr, rid1, "Injured", defs)
		assert.deepEqual(res, { injured: null })
	})

	it("insert", async () => {
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			"injured": true
		})
		let res = await categoryPresenceGet(dr, rid1, "Injured", defs)
		assert.deepEqual(res, { "injured": true })
	})

	it("update - false", async () => {
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			"injured": true
		})
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			"injured": false,
		})
		let res = await categoryPresenceGet(dr, rid1, "Injured", defs)
		assert.deepEqual(res, { "injured": false })
	})

	it("update - unset", async () => {
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			"injured": true
		})
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
		})
		let res = await categoryPresenceGet(dr, rid1, "Injured", defs)
		assert.deepEqual(res, {
			"injured": null
		})
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
		await categoryPresenceSet(dr, rid1, "Affected", defs, {
			"direct": true
		})
		let res = await categoryPresenceGet(dr, rid1, "Affected", defs)
		assert.deepEqual(res, { "direct": true })
	})

	it("update - table prefix", async () => {
		let defs = defs2
		await categoryPresenceSet(dr, rid1, "Affected", defs, {
			"direct": true
		})
		await categoryPresenceSet(dr, rid1, "Affected", defs, {
		})
		let res = await categoryPresenceGet(dr, rid1, "Affected", defs)
		assert.deepEqual(res, {
			direct: null
		})
	})

})

describe("human_effects - total group", async () => {
	beforeEach(async () => {
		await resetCategoryPresenceData()
	})

	it("get no data", async () => {
		let res = await totalGroupGet(dr, rid1, "Deaths")
		assert.equal(res, null)
	})

	it("set and get", async () => {
		let data = ["sex"]
		await totalGroupSet(dr, rid1, "Deaths", data)
		let res = await totalGroupGet(dr, rid1, "Deaths")
		assert.deepEqual(res, data)
	})

	it("update", async () => {
		await totalGroupSet(dr, rid1, "Deaths", ["sex"])
		await totalGroupSet(dr, rid1, "Deaths", ["sex", "age"])
		let res = await totalGroupGet(dr, rid1, "Deaths")
		assert.deepEqual(res, ["sex", "age"])
	})

	it("set null", async () => {
		let data = ["sex"]
		await totalGroupSet(dr, rid1, "Deaths", data)

		await totalGroupSet(dr, rid1, "Deaths", null)
		let res = await totalGroupGet(dr, rid1, "Deaths")
		assert.equal(res, null)
	})
})

const testNonExistingRecordID = "00000000-0000-0000-0000-000000000000"

describe("human_effects - total data", async () => {
	beforeEach(async () => {
		await resetTestData()
	})

	it("set and get total - dsg table", async () => {
		const tblId: HumanEffectsTable = "Injured"
		const recordId = testDisasterRecord1Id
		const data = { injured: 2 }
		await setTotalDsgTable(dr, tblId, recordId, defs1, data)
		let res = await getTotalDsgTable(dr, tblId, recordId, defs1)
		assert.deepEqual(res, { injured: 2 })
	})

	it("set and get total - dsg table - custom", async () => {
		const tblId: HumanEffectsTable = "Injured"

		let defs = defsCustom
		{
			let res = await create(dr, "Injured", rid1, defs, [[null, 1]], false)
			assert(res.ok)
		}
		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [[null, 1]])
		}

		await setTotalDsgTable(dr, tblId, rid1, defs, {"injured": 2})

		{
		let res = await getTotalDsgTable(dr, tblId, rid1, defs1)
		assert.deepEqual(res, { injured: 2 })
		}

		{
			let res = await get(dr, "Injured", rid1, defs)
			console.log(res)
			assert(res.ok)
			assert.deepEqual(res.data, [[null, 2]])
		}

	})

	it("get returns empty when no matching total - dsg table", async () => {
		let res = await getTotalDsgTable(dr, "Injured", testNonExistingRecordID, defs1)
		assert.deepEqual(res, { injured: 0 })
	})

	it("set and get total - presence table", async () => {
		const tblId: HumanEffectsTable = "Injured"
		const recordId = testDisasterRecord1Id
		const data = { injured: 2 }
		await setTotalPresenceTable(dr, tblId, recordId, defs1, data)
		let res = await getTotalPresenceTable(dr, tblId, recordId, defs1)
		assert.deepEqual(res, { injured: 2 })
	})

	it("get returns empty when no matching total - presence table", async () => {
		let res = await getTotalPresenceTable(dr, "Injured", testNonExistingRecordID, defs1)
		assert.deepEqual(res, { injured: 0 })
	})
})


describe("human_effects - calc total for group", async () => {
	beforeEach(async () => {
		await resetTestData()
	})

	it("calcs total for group - no custom", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" }
				],
			},
			{
				shared: true,
				uiName: "Age",
				jsName: "age",
				dbName: "age",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "<50", label: "<50" },
					{ key: ">=50", label: ">=50" }
				],
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
			}
		]
		{
			let data = [
				["m", null, 1],
				["f", null, 2],
				["m", "<50", 1],
				["m", ">=50", 2],
				["f", "<50", 3],
				["f", ">=50", 4],
			]
			let res = await create(dr, "Injured", rid1, defs, data, false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["sex"])
			assert(res.ok)
			assert.equal(res.totals.injured, 3)
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["sex", "age"])
			assert(res.ok)
			assert.equal(res.totals.injured, 10)
		}
	})

	it("calcs total for group - global poverty line", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" }
				],
			},
			{
				shared: true,
				uiName: "Global poverty line",
				jsName: "globalPovertyLine",
				dbName: "global_poverty_line",
				uiColWidth: "thin", // 60
				format: "enum",
				role: "dimension",
				data: [
					{ key: "below", label: "Below" },
					{ key: "above", label: "Above" },
				]
			},
			{
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
			}
		]
		{
			let data = [
				["m", null, 1],
				["f", null, 2],
				["f", "above", 3],
				["m", "above", 4],
			]
			let res = await create(dr, "Missing", rid1, defs, data, false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await calcTotalForGroup(dr, "Missing", rid1, defs, ["sex", "global_poverty_line"])
			console.log(res)
			assert(res.ok)
			assert.equal(res.totals.missing, 7)
		}
	})

	it("calcs total for group - as of date", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" }
				],
			},
			{
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin"
			},
			{
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
			}
		]
		{
			let data = [
				["m", null, 1],
				["f", null, 2],
				["f", "2025-09-04", 3],
				["m", "2025-09-04", 4],
				[null, "2025-09-04", 5],
				[null, "2025-09-04", 6],
			]
			let res = await create(dr, "Missing", rid1, defs, data, false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await calcTotalForGroup(dr, "Missing", rid1, defs, ["sex"])
			assert(res.ok)
			assert.equal(res.totals.missing, 3)
		}
		{
			let res = await calcTotalForGroup(dr, "Missing", rid1, defs, ["asOf"])
			console.log("res", res)
			assert.equal(res.ok, false)
		}
	})

	it("calcs total for group - custom cols", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" }
				],
			},
			{
				shared: true,
				uiName: "Age",
				jsName: "age",
				dbName: "age",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "<50", label: "<50" },
					{ key: ">=50", label: ">=50" }
				],
			},
			{
				custom: true,
				uiName: "My Custom",
				jsName: "custom",
				dbName: "custom",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "l1" },
					{ key: "v2", label: "l2" }
				],
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
			}
		]
		{
			let data = [
				[null, null, "v1", 5],
				[null, null, "v2", 6],
				["m", null, null, 1],
				["f", null, null, 1],
				["m", null, "v1", 1],
				["f", null, "v2", 2],
				["m", "<50", "v1", 1],
				["m", ">=50", "v2", 2],
				["f", "<50", "v1", 3],
				["f", ">=50", "v2", 4],
			]
			let res = await create(dr, "Injured", rid1, defs, data, false)
			console.log(res)
			assert(res.ok)
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["custom"])
			assert(res.ok)
			assert.equal(res.totals.injured, 11)
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["sex"])
			assert(res.ok)
			assert.equal(res.totals.injured, 2)
		}
	})

	it("calcs total for group - custom cols - changed", async () => {
		let defs1: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" }
				],
			},
			{
				custom: true,
				uiName: "My Custom",
				jsName: "custom",
				dbName: "custom",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "l1" },
					{ key: "v2", label: "l2" }
				],
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
			}
		]
		{
			let data = [
				["m", null, 1],
				["f", null, 1],
			]
			let res = await create(dr, "Injured", rid1, defs1, data, false)
			console.log(res)
			assert.equal(res.ok, true)
		}
		let defs2 = [defs1[0], defs1[2]]
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs2, ["sex"])
			console.log("res", res)
			assert.equal(res.ok, true)
			assert.equal(res.totals.injured, 2)
		}
	})



})
