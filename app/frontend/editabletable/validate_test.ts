import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	validate,
	groupTotals,
	getTotalsFromData
} from './validate'

import {
	DefData,
	DataWithIdBasic,
} from "~/frontend/editabletable/base"

describe('validate - 1', () => {

	let fn = validate

	it("empty", () => {
		let res = fn([], [], null)
		console.log("res", res)
		assert(res.ok)
	})

	it("totals row", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
		]
		let res = fn(defs, input, [1])
		assert(res.ok)
	})

	it("multiple rows with no dimensions", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: [null, 2] }
		]
		let res = fn(defs, input, [1])
		assert(!res.ok)
		assert.equal(res.rowErrors?.length, 1)
		assert.equal(res.rowErrors[0].code, "no_dimension_data")
	})

	it("duplicate_dimension", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id1", data: ["m", 1] },
			{ id: "id2", data: ["m", 2] }
		]
		let res = fn(defs, input, [])

		assert(!res.ok)
		assert.equal(res.rowErrors?.length, 2)
		let e0 = res.rowErrors[0]
		let e1 = res.rowErrors[1]
		assert.equal(e0.code, "duplicate_dimension")
		assert.equal(e1.code, "duplicate_dimension")
	})

	it("subtotal_larger_than_total", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", 1] },
			{ id: "id3", data: ["f", 2] }
		]
		let res = fn(defs, input, [1])

		assert(!res.ok)
		assert.equal(res.groupErrors?.length, 1)
		assert.equal(res.groupErrors[0].code, "subtotal_larger_than_total")

		assert.equal(res.rowErrors?.length, 2)
		assert.equal(res.rowErrors[0].code, "subtotal_larger_than_total")
		assert.equal(res.rowErrors[1].code, "subtotal_larger_than_total")
	})

	it("subtotal_lower_than_total", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", 1] },
			{ id: "id3", data: ["f", 2] }
		]
		let res = fn(defs, input, [4])

		assert(res.ok)
		assert.equal(res.groupWarnings?.length, 1)
		assert.equal(res.groupWarnings[0].code, "subtotal_lower_than_total")

		assert.equal(res.rowWarnings?.length, 2)
		assert.equal(res.rowWarnings[0].code, "subtotal_lower_than_total")
		assert.equal(res.rowWarnings[1].code, "subtotal_lower_than_total")
	})

	it("row_with_no_metric_values - invalid", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", null] },
		]
		let res = fn(defs, input, [1])
		assert(!res.ok)
		console.log("res", res)

		assert.equal(res.rowErrors?.length, 1)
		let e0 = res.rowErrors[0]
		assert.equal(e0.code, "row_with_no_metric_value")
	})

	it("row_with_no_metric_values - valid", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "directly_affected",
				format: "number",
				role: "metric"
			},
			{
				dbName: "indirectly_affected",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", 1, null] },
		]
		let res = fn(defs, input, [1, 0])
		assert(res.ok)
	})

	it("row_with_all_metrics_zeroes - invalid", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", 0] },
		]
		let res = fn(defs, input, [1])
		assert(!res.ok)

		assert.equal(res.rowErrors?.length, 1)
		let e0 = res.rowErrors[0]
		assert.equal(e0.code, "row_with_all_metrics_zeroes")
	})

	it("row_with_all_metrics_zeroes - valid", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "directly_affected",
				format: "number",
				role: "metric"
			},
			{
				dbName: "indirectly_affected",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", 1, 0] },
		]
		let res = fn(defs, input, [1, 0])
		assert(res.ok)
	})

	it("as_of column - do not validate totals", () => {
		let defs: DefData[] = [
			{
				dbName: "sex",
				format: "enum",
				role: "dimension"
			},
			{
				dbName: "asOf",
				format: "date",
				role: "dimension"
			},
			{
				dbName: "injured",
				format: "number",
				role: "metric"
			}
		]
		let input: DataWithIdBasic[] = [
			{ id: "id2", data: ["m", "2025-09-09", 2] },
		]
		let res = fn(defs, input, [1])
		console.log("res", res)
		assert.equal(res.ok, true)
	})
})

describe('groupTotals', () => {

	let fn = groupTotals

	it('empty', () => {
		let defs: DefData[] = []
		let data: DataWithIdBasic[] = []
		let res = fn(defs, data)
		assert(res.size === 0)
	})

	it('single row with dimension and metric', () => {
		let defs: DefData[] = [
			{ dbName: 'sex', format: 'enum', role: 'dimension' },
			{ dbName: 'injured', format: 'number', role: 'metric' }
		]
		let data: DataWithIdBasic[] = [
			{ id: 'r1', data: ['m', 5] }
		]
		let res = fn(defs, data)

		let expected = new Map()
		expected.set("1", new Map([['injured', 5]]))

		assert.deepEqual(res, expected)
	})

})


describe('getTotalsFromData', () => {
	let fn = getTotalsFromData

	it('returns null if no totals row (all-dimensions empty) exists', () => {
		let defs: DefData[] = [
			{ dbName: 'sex', format: 'enum', role: 'dimension' },
			{ dbName: 'injured', format: 'number', role: 'metric' }
		]
		let data: DataWithIdBasic[] = [
			{ id: 'r1', data: ['m', 5] },
			{ id: 'r2', data: ['f', 3] }
		]
		let res = fn(defs, data)
		assert.deepEqual(res, { totals: null, dataNoTotals: data })
	})

	it('returns metric values from row where all dimensions are empty', () => {
		let defs: DefData[] = [
			{ dbName: 'sex', format: 'enum', role: 'dimension' },
			{ dbName: 'location', format: 'enum', role: 'dimension' },
			{ dbName: 'injured', format: 'number', role: 'metric' },
			{ dbName: 'deaths', format: 'number', role: 'metric' }
		]
		let data: DataWithIdBasic[] = [
			{ id: 'r1', data: ['m', 'l1', 10, 2] },
			{ id: 'r2', data: ['f', 'l2', 7, 1] },
			{ id: 't1', data: [null, null, 17, 3] } // totals row
		]
		let res = fn(defs, data)
		assert.deepEqual(res, {
			totals: [17, 3],
			dataNoTotals: [
				{ id: 'r1', data: ['m', 'l1', 10, 2] },
				{ id: 'r2', data: ['f', 'l2', 7, 1] }
			]
		})
	})

	it('multiple rows all dimensions are empty', () => {
		let defs: DefData[] = [
			{ dbName: 'sex', format: 'enum', role: 'dimension' },
			{ dbName: 'location', format: 'enum', role: 'dimension' },
			{ dbName: 'injured', format: 'number', role: 'metric' },
			{ dbName: 'deaths', format: 'number', role: 'metric' }
		]
		let data: DataWithIdBasic[] = [
			{ id: 'r1', data: ['m', 'l1', 10, 2] },
			{ id: 'r2', data: ['f', 'l2', 7, 1] },
			{ id: 't1', data: [null, null, 17, 3] }, // totals row 1
			{ id: 't1', data: [null, null, 18, 4] } // totals row 2
		]
		let res = fn(defs, data)
		assert.deepEqual(res, {
			totals: [17, 3],
			dataNoTotals: [
				{ id: 'r1', data: ['m', 'l1', 10, 2] },
				{ id: 'r2', data: ['f', 'l2', 7, 1] },
				{ id: 't1', data: [null, null, 18, 4] }
			]
		})
	})

})

