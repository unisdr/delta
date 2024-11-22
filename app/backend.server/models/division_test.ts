import {describe, it} from 'node:test';


import {asc, eq, aliasedTable} from 'drizzle-orm';

import assert from 'node:assert';
import {dr} from '~/db.server';
import {divisionsAllLanguages, importCSV, divisionBreadcrumb} from "./division"

import {
	divisionTable,
} from '~/drizzle/schema';

import {sql} from 'drizzle-orm';

describe("divisions", async () => {

	describe("importCSV", async () => {
		it("err no data", async () => {
			await assert.rejects(
				async () => {
					await importCSV("");
				},
				{
					message: "Empty CSV",
				}
			);
		})

		it.only("has data", async () => {
			await dr.execute(sql`TRUNCATE ${divisionTable};`);

			let data = `
	id, 	parent,geodata,en ,fr
	1,,g1, 	 en1,fr1
	2,,g2,en2,fr2
	3,1,g3,en1.1,fr1.1
	4,1,g4,en1.2,
	`


			let importRes = await importCSV(data)
			assert.equal(importRes.get("1")?.GeodataFileName, "g1")

			let getData = async function () {
				const parent = aliasedTable(divisionTable, "parent")

				let res = await dr.select({
					import_id: divisionTable.importId,
					name: divisionTable.name,
					parent_import_id: parent.importId
				})
					.from(divisionTable)
					.leftJoin(parent, eq(parent.id, divisionTable.parentId))
					.orderBy(asc(divisionTable.importId))
				return res
			}

			let res = await getData()

			//console.log("got data", res)

			let expected: any = [
				{
					import_id: "1",
					parent_import_id: null,
					name: {"en": "en1", "fr": "fr1"}
				},
				{
					import_id: "2",
					parent_import_id: null,
					name: {"en": "en2", "fr": "fr2"}
				},
				{
					import_id: "3",
					parent_import_id: "1",
					name: {"en": "en1.1", "fr": "fr1.1"}
				},
				{
					import_id: "4",
					parent_import_id: "1",
					name: {"en": "en1.2"}
				},
			];

			assert.deepStrictEqual(res, expected);



			data = `
	id, 	parent,geodata,es
	1,,g1,es1
	`


			await importCSV(data)

			res = await getData()

			//console.log("got data", res)
			expected[0] = {
				import_id: "1",
				parent_import_id: null,
				name: {"en": "en1", "fr": "fr1", "es": "es1"}
			}


			assert.deepStrictEqual(res, expected);


		});

	})

	describe("divisionsAllLanguages", async () => {
		it("basic", async () => {
			await dr.execute(sql`TRUNCATE ${divisionTable};`);

			let data = `
			id, 	parent,geodata,en ,fr, it
			1,,g1, 	 en1,fr1,
			2,,g2,en2,,
			3,1,g3,en1.1,fr1.1,
			4,1,g4,en1.2,,
			`

			await importCSV(data)



			let res = await divisionsAllLanguages(null);

			let expected = {"en": 2, "fr": 1};
			assert.deepStrictEqual(res, expected);

		});

	})

	describe("divisionsBreadcrumb", async () => {
		it("basic", async () => {
			await dr.execute(sql`TRUNCATE ${divisionTable};`);

			let data = `
			id, 	parent,geodata,en ,fr, it
			1,,g1, 	 en1,fr1,
			2,,g2,en2,,
			3,1,g3,en1.1,fr1.1,
			4,1,g4,en1.2,,
			`

			let idMap = await importCSV(data)

			let res = await divisionBreadcrumb(["en"], idMap.get("4")!.DBID);
			let expected = [
				{id: idMap.get("1"), nameLang: "en", name: "en1", parentId: null},
				{id: idMap.get("4"), nameLang: "en", name: "en1.2", parentId: idMap.get("1")},
			]
			assert.deepStrictEqual(res, expected);

		});

	})

});
