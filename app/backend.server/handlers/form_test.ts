import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
	formSave,
	SaveResult,
	CreateResult,
	JsonCreateArgs,
	jsonCreate,
	JsonUpdateArgs,
	jsonUpdate,
	jsonUpsert,
	UpdateResult,
	CsvCreateArgs,
	csvCreate,
	CsvUpdateArgs,
	csvUpdate,
	csvUpsert,
	CsvUpsertArgs,
	RowError,
	csvImportExample
} from './form';
import {FormError, FormInputDef} from '~/frontend/form';
import {ActionFunctionArgs} from "@remix-run/node";
import {Request} from "node-fetch";
import {Tx} from '~/db.server';

interface TestFields {
	field1: string;
	field2?: string;
}
export const fieldsDef: FormInputDef<TestFields>[] = [
	{key: "field1", label: "Field 1", type: "text", required: true},
	{key: "field2", label: "Field 2", type: "text"},
];

describe("formSave", () => {
	it("should save a new record", async () => {
		const saveMock = async (_tx: Tx, id: string | null, data: TestFields): Promise<SaveResult<TestFields>> => {
			assert.strictEqual(id, null);
			assert.deepEqual(data, {"field1": "a"});
			return {ok: true, id: 1};
		};

		const fd = new FormData()
		fd.append("field1", "a")
		const actionArgs = {
			request: new Request("http://example.com", {
				method: "POST",
				body: new URLSearchParams({field1: "a"}),
			}),
			params: {id: "new"},
			userSession: {user: {role: "admin"}}
		};
		const res = await formSave({
			actionArgs: actionArgs as unknown as ActionFunctionArgs,
			fieldsDef,
			save: saveMock,
			redirectTo: (id: any) => `/test/${id}`,
		}) as any;
		console.log("res", res)
		assert.equal(res.headers.get("Location"), "/test/1")
	});
});

describe('jsonCreate', () => {
	it('handles validation errors', async () => {
		const createMock = async (_tx: Tx, _data: TestFields) => {
			throw new Error('Should not reach this point')
		}

		const args: JsonCreateArgs<TestFields> = {
			data: [{}],
			fieldsDef,
			create: createMock
		}

		const res = await jsonCreate(args)
		assert(!res.ok)
		assert.equal(res.res.length, 1)
		assert.equal(res.res[0].id, null)
		assert(res.res[0].errors)
		let field1Errs = res.res[0].errors.fields?.field1
		assert(field1Errs)
		let err = field1Errs[0] as FormError
		assert.equal(err.code, "required")
	})

	it('handles multiple records', async () => {
		const createMock = async (_tx: Tx, data: TestFields): Promise<SaveResult<TestFields>> => {
			return {ok: true, id: `id-${data.field1}`}
		}

		const args: JsonCreateArgs<TestFields> = {
			data: [{field1: 'a'}, {field1: 'b'}],
			fieldsDef,
			create: createMock
		}

		const res = await jsonCreate(args)
		assert(res.ok)
		assert.equal(res.res.length, 2)
		assert.equal(res.res[0].id, 'id-a')
		assert.equal(res.res[1].id, 'id-b')
		assert(!res.res[0].errors)
		assert(!res.res[1].errors)
	})

})

describe('jsonUpdate', () => {
	it('handles validation errors', async () => {
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields>) => {
			throw new Error('Should not reach this point')
		}

		const args: JsonUpdateArgs<TestFields> = {
			data: [{id: "1", field1: 1}],
			fieldsDef,
			update: updateMock
		}

		const res = await jsonUpdate(args)
		assert(!res.ok)
		assert.equal(res.res.length, 1)
		assert(res.res[0].errors)
		let field1Errs = res.res[0].errors?.fields?.field1
		assert(field1Errs)
		let err = field1Errs[0] as FormError
		assert.equal(err.code, "invalid_type")
	})

	it('handles missing id', async () => {
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields>) => {
			throw new Error('Should not reach this point')
		}

		const args: JsonUpdateArgs<TestFields> = {
			data: [{}],
			fieldsDef,
			update: updateMock
		}

		const res = await jsonUpdate(args)
		assert(!res.ok)
		assert.equal(res.res.length, 1)
		assert(res.res[0].errors)
		let formErrs = res.res[0].errors?.form
		assert(formErrs)
		let err = formErrs[0] as FormError
		assert.equal(err.code, "missingId")
	})

	it('multiple updates, allow partials', async () => {
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields>): Promise<SaveResult<TestFields>> => {
			return {ok: true}
		}

		const args: JsonUpdateArgs<TestFields> = {
			data: [
				{id: "1", field1: "a"},
				{id: "2", field2: "b"}
			],
			fieldsDef,
			update: updateMock
		}

		const res = await jsonUpdate(args)
		assert(res.ok)
		assert.equal(res.res.length, 2)
		assert(!res.res[0].errors)
		assert(!res.res[1].errors)
	})
})

interface TestFields2 {
	apiImportId?: string;
	field1: string;
	field2?: string;
}
export const fieldsDef2: FormInputDef<TestFields2>[] = [
	{key: "apiImportId", label: "API Import ID", type: "text"},
	{key: "field1", label: "Field 1", type: "text", required: true},
	{key: "field2", label: "Field 2", type: "text"},
];

describe('jsonUpsert', () => {

	it('missing apiImportId', async () => {
		const createMock = async (_tx: Tx, _data: TestFields2) => {
			throw new Error('Should not reach this point')
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields2>) => {
			throw new Error('Should not reach this point')
		}
		const idByImportId = async (_tx: Tx, _importId: string) => null
		const args = {
			data: [{}],
			fieldsDef: fieldsDef2,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}
		const res = await jsonUpsert(args)
		assert(!res.ok)
		assert.equal(res.res.length, 1)
		assert(!res.res[0].ok)
		assert(res.res[0].errors)
		let formErrs = res.res[0].errors?.form
		assert(formErrs)
		let err = formErrs[0] as FormError
		assert.equal(err.code, "UpsertApiImportIdMissingError")
	})

	it('handles validation errors', async () => {
		const createMock = async (_tx: Tx, _data: TestFields2) => {
			throw new Error('Should not reach this point')
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields2>) => {
			throw new Error('Should not reach this point')
		}
		const idByImportId = async (_tx: Tx, _importId: string) => null
		const args = {
			data: [{apiImportId: "123"}],
			fieldsDef: fieldsDef2,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}
		const res = await jsonUpsert(args)
		assert(!res.ok)
		assert.equal(res.res.length, 1)
		assert(!res.res[0].ok)
		assert(res.res[0].errors)
		console.log("errs", res.res[0].errors)
		let field1Errs = res.res[0].errors.fields?.field1
		// this assert freezes test runner when it fails
		// looks like a bug in nodejs
		// for some reason it works when any message is passed
		// assert(false)
		assert(field1Errs, "nodejs bug workaround")
		let err = field1Errs[0] as FormError
		assert.equal(err.code, "required")
	})

	it('creates new records when not found', async () => {
		const createMock = async (_tx: Tx, data: TestFields2): Promise<CreateResult<TestFields2>> => {
			return {ok: true, id: `id-${data.field1}`}
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields2>) => {
			throw new Error('Should not reach this point')
		}
		const idByImportId = async (_tx: Tx, _importId: string) => null

		const args = {
			data: [{apiImportId: "123", field1: "new-value"}],
			fieldsDef: fieldsDef2,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}

		const res = await jsonUpsert(args)
		assert(res.ok)
		assert.equal(res.res.length, 1)
		assert(res.res[0].ok)
		assert.equal(res.res[0].id, "id-new-value")
	})

	it('updates existing records', async () => {
		const createMock = async (_tx: Tx, _data: TestFields2) => {
			throw new Error('Should not reach this point')
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields2>): Promise<UpdateResult<TestFields2>> => {
			return {ok: true}
		}
		const idByImportId = async (_tx: Tx, _importId: string) => "existing-id"

		const args = {
			data: [{apiImportId: "123", field1: "updated-value"}],
			fieldsDef: fieldsDef2,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}

		const res = await jsonUpsert(args)
		assert(res.ok)
		assert.equal(res.res.length, 1)
		assert(res.res[0].ok)
		assert.equal(res.res[0].id, "existing-id")
	})
})

interface TestFields3 {
	field1?: number;
	field2?: string;
}
export const fieldsDef3: FormInputDef<TestFields3>[] = [
	{key: "field1", label: "Field 1", type: "number"},
	{key: "field2", label: "Field 2", type: "text"},
];

describe('csvCreate', () => {
	it('handles validation errors (field1 is a number)', async () => {
		const createMock = async (_tx: Tx, _data: TestFields3) => {
			throw new Error('Should not reach this point')
		}

		const args: CsvCreateArgs<TestFields3> = {
			data: [
				['field1', 'field2'],
				['no-a-number', 'value2']
			],
			fieldsDef: fieldsDef3,
			create: createMock
		}

		const res = await csvCreate(args)
		assert(!res.ok)
		let err = res.rowError! as RowError
		console.log("err res", res)
		assert.equal(err.def?.key, "field1")
		assert.equal(err.code, "invalid_type")
	})

	it('handles multiple records', async () => {
		const createMock = async (_tx: Tx, data: TestFields3): Promise<SaveResult<TestFields3>> => {
			return {ok: true, id: `id-${data.field1}`}
		}

		const args: CsvCreateArgs<TestFields3> = {
			data: [
				['field1', 'field2'],
				['1', 'value1'],
				['2', 'value2']
			],
			fieldsDef: fieldsDef3,
			create: createMock
		}

		const res = await csvCreate(args)
		assert(res.ok)
		assert.deepEqual(res.res!, [
			["id", "field1", "field2"],
			["id-1", "1", "value1"],
			["id-2", "2", "value2"],
		])
	})
})

describe('csvUpdate', () => {
	it('handles validation errors (field1 is a number)', async () => {
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields3>) => {
			throw new Error('Should not reach this point')
		}

		const args: CsvUpdateArgs<TestFields3> = {
			data: [
				['id', 'field1', 'field2'],
				['1', 'no-a-number', 'value2']
			],
			fieldsDef: fieldsDef3,
			update: updateMock
		}

		const res = await csvUpdate(args)
		assert(!res.ok)
		let err = res.rowError! as FormError
		console.log("err", err)
		assert.equal(err.def?.key, "field1")
		assert.equal(err.code, "invalid_type")
	})

	it('handles missing id', async () => {
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields3>) => {
			throw new Error('Should not reach this point')
		}

		const args: CsvUpdateArgs<TestFields3> = {
			data: [
				['field1', 'field2'],
				['1', 'value2']
			],
			fieldsDef: fieldsDef3,
			update: updateMock
		}

		const res = await csvUpdate(args)
		assert(!res.ok)
		let err = res.rowError! as FormError
		assert.equal(err.code, "missingId")
	})

	it('handles multiple updates', async () => {
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields3>): Promise<SaveResult<TestFields3>> => {
			return {ok: true}
		}

		const args: CsvUpdateArgs<TestFields3> = {
			data: [
				['id', 'field1', 'field2'],
				['1', '42', 'value1'],
				['2', '84', 'value2']
			],
			fieldsDef: fieldsDef3,
			update: updateMock
		}

		const res = await csvUpdate(args)
		assert(res.ok)
	})
})

interface TestFields4 {
	field1?: number
	field2?: string
	apiImportId?: string
}
export const fieldsDef4: FormInputDef<TestFields4>[] = [
	{key: "field1", label: "", type: "number"},
	{key: "field2", label: "", type: "text"},
	{key: "apiImportId", label: "", type: "text"},
];

describe('csvUpsert', () => {
	it('handles missing apiImportId', async () => {
		const createMock = async (_tx: Tx, _data: TestFields4) => {
			throw new Error('Should not reach this point')
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields4>) => {
			throw new Error('Should not reach this point')
		}
		const idByImportId = async (_tx: Tx, _importId: string) => null

		const args: CsvUpsertArgs<TestFields4> = {
			data: [
				['field1', 'field2'],
				['42', 'value']
			],
			fieldsDef: fieldsDef4,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}

		const res = await csvUpsert(args)
		assert(!res.ok)
		let rowError = res.rowError! as RowError
		assert.equal(rowError.code, "UpsertApiImportIdMissingError")
		assert.equal(rowError.row, 0)
	})

	it('handles validation errors', async () => {
		const createMock = async (_tx: Tx, _data: TestFields4) => {
			throw new Error('Should not reach this point')
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields4>) => {
			throw new Error('Should not reach this point')
		}
		const idByImportId = async (_tx: Tx, _importId: string) => null

		const args: CsvUpsertArgs<TestFields4> = {
			data: [
				['apiImportId', 'field1', 'field2'],
				['123', 'not-a-number', 'value']
			],
			fieldsDef: fieldsDef4,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}

		const res = await csvUpsert(args)
		assert(!res.ok)
		console.log("res", res)
		let rowError = res.rowError! as RowError
		assert.equal(rowError.code, "invalid_type")
		assert.equal(rowError.row, 0)
	})

	it('creates new records when not found', async () => {
		const createMock = async (_tx: Tx, data: TestFields4): Promise<CreateResult<TestFields4>> => {
			return {ok: true, id: `id-${data.field1}`}
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields4>) => {
			throw new Error('Should not reach this point')
		}
		const idByImportId = async (_tx: Tx, _importId: string) => null

		const args: CsvUpsertArgs<TestFields4> = {
			data: [
				['apiImportId', 'field1', 'field2'],
				['123', '42', 'value']
			],
			fieldsDef: fieldsDef4,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}

		const res = await csvUpsert(args)
		assert(res.ok)
	})

	it('updates existing records', async () => {
		const createMock = async (_tx: Tx, _data: TestFields4) => {
			throw new Error('Should not reach this point')
		}
		const updateMock = async (_tx: Tx, _id: string, _data: Partial<TestFields4>): Promise<UpdateResult<TestFields4>> => {
			return {ok: true}
		}
		const idByImportId = async (_tx: Tx, _importId: string) => "existing-id"

		const args: CsvUpsertArgs<TestFields4> = {
			data: [
				['apiImportId', 'field1', 'field2'],
				['123', '84', 'value']
			],
			fieldsDef: fieldsDef4,
			create: createMock,
			update: updateMock,
			idByImportId: idByImportId
		}

		const res = await csvUpsert(args)
		assert(res.ok)
	})
})

interface TestFields5 {
	apiImportId?: string
	number1?: number
	text1?: string
	bool1?: boolean
	date1?: Date
	enum1?: string
}
export const fieldsDef5: FormInputDef<TestFields5>[] = [
	{key: "apiImportId", label: "", type: "text"},
	{key: "number1", label: "", type: "number"},
	{key: "text1", label: "", type: "text"},
	{key: "bool1", label: "", type: "bool"},
	{key: "date1", label: "", type: "date"},
	{
		key: "enum1", label: "", type: "enum", enumData: [
			{key: "one", label: ""},
			{key: "two", label: ""},
		]
	},
];

interface TestFields6 {
	apiImportId?: string
	f1?: string
}
export const fieldsDef6: FormInputDef<TestFields6>[] = [
	{key: "f1", label: "", type: "text"},
	{key: "apiImportId", label: "", type: "text"},
];


describe('csvImportExample', () => {
	it('create', async () => {
		const result = await csvImportExample({
			importType: "create",
			fieldsDef: fieldsDef5
		})
		assert(result.ok)
		assert(result.res)
		assert.deepEqual(result.res, [
			["number1", "text1", "bool1", "date1", "enum1"],
			["1", "text example", "true", "2025-01-01", "one"],
			["1", "text example", "true", "2025-01-01", "one"],

		])
	})
	it('update', async () => {
		const result = await csvImportExample({
			importType: "update",
			fieldsDef: fieldsDef6
		})
		assert(result.ok)
		assert(result.res)
		assert.deepEqual(result.res, [
			["id", "f1"],
			["id1", "text example"],
			["id2", "text example"],
		])
	})
	it('upsert', async () => {
		const result = await csvImportExample({
			importType: "upsert",
			fieldsDef: fieldsDef6
		})
		assert(result.ok)
		assert(result.res)
		assert.deepEqual(result.res, [
			["apiImportId", "f1"],
			["id1", "text example"],
			["id2", "text example"],
		])
	})
})

