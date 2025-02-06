import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {errorsToCodes, FormInputDef} from "./form"
import {validateFromMap, validateFromJson, validateRes} from "./form_validate"

interface TestType {
	k1: string
	k2: number
	k3: boolean
	k4: string
	k5: Date
	k6: string
}

function runTestCommon(args: {
	name: string;
	defs: FormInputDef<TestType>[];
	data: any;
	expectedOk: boolean;
	expectedData: Partial<TestType> | null;
	expectedCodes?: Partial<Record<keyof TestType, string[]>>;
	formError?: string[];
	allowPartial?: boolean;
	checkUnknownFields?: boolean;
	validator: (data: any, defs: FormInputDef<TestType>[], allowPartial: boolean, checkUnknownFields: boolean) => validateRes<TestType>;
}) {
	it(`${args.name} (allowPartial: ${args.allowPartial || false})`, () => {
		const res = args.validator(
			args.data,
			args.defs,
			args.allowPartial ?? false,
			args.checkUnknownFields ?? true
		);

		assert.equal(res.ok, args.expectedOk, `Test "${args.name}" failed at OK check`);

		if (args.expectedOk) {
			assert.deepEqual(
				res.ok ? res.resOk : res.data,
				args.expectedData,
				`Test "${args.name}" failed at data comparison`
			);
		} else {
			for (const key of Object.keys(args.expectedCodes || {}) as (keyof TestType)[]) {
				const codes = errorsToCodes(res.errors.fields?.[key]);
				assert.deepEqual(
					codes,
					args.expectedCodes![key],
					`Test "${args.name}" failed for key "${key}"`
				);
			}
			if (args.formError) {
				assert.deepEqual(errorsToCodes(res.errors.form), args.formError);
			}
		}
	});
}


describe("validateFromMap", function () {

	const runTest = function (
		args: Omit<Parameters<typeof runTestCommon>[0], 'validator'>
	) {
		runTestCommon({
			...args,
			validator: validateFromMap,
		});
	};

	runTest({
		name: "validates required text field",
		defs: [{key: "k1", type: "text", required: true, label: ""}],
		data: {k1: "value1"},
		expectedOk: true,
		expectedData: {k1: "value1"},
	})

	runTest({
		name: "required text field must not be empty",
		defs: [{key: "k1", type: "text", required: true, label: ""}],
		data: {k1: ""},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k1: ["required"]},
	})

	runTest({
		name: "detects missing required text field",
		defs: [{key: "k1", type: "text", required: true, label: ""}],
		data: {},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k1: ["required"]},
	})

	runTest({
		name: "handles missing non-required text field",
		defs: [{key: "k1", type: "text", label: ""}],
		data: {},
		expectedOk: true,
		expectedData: {},
	})

	runTest({
		name: "when allowPartial is set skips required field validation",
		allowPartial: true,
		defs: [{key: "k1", type: "text", required: true, label: ""}],
		data: {},
		expectedOk: true,
		expectedData: {},
	})

	runTest({
		name: "when allowPartial is true, does not add mising fields to results",
		allowPartial: true,
		defs: [{key: "k1", type: "text", label: ""}],
		data: {},
		expectedOk: true,
		expectedData: {},
	})

	runTest({
		name: "when checkUnknownFields is true, error is returned on unknown field",
		checkUnknownFields: true,
		defs: [],
		data: {"k1": "v1"},
		expectedOk: false,
		expectedData: {},
		formError: ["unknown_field"],
	})

	runTest({
		name: "handles number field",
		defs: [{key: "k2", type: "number", required: true, label: ""}],
		data: {k2: "123"},
		expectedOk: true,
		expectedData: {k2: 123},
	})

	runTest({
		name: "handles boolean field - on",
		defs: [{key: "k3", type: "bool", label: "Boolean Field"}],
		data: {k3: "on"},
		expectedOk: true,
		expectedData: {k3: true},
	})

	runTest({
		name: "handles boolean field - true",
		defs: [{key: "k3", type: "bool", label: "Boolean Field"}],
		data: {k3: "true"},
		expectedOk: true,
		expectedData: {k3: true},
	})

	runTest({
		name: "handles boolean field - off",
		defs: [{key: "k3", type: "bool", label: "Boolean Field"}],
		data: {k3: "off"},
		expectedOk: true,
		expectedData: {k3: false},
	})

	runTest({
		name: "handles boolean field - false",
		defs: [{key: "k3", type: "bool", label: "Boolean Field"}],
		data: {k3: "false"},
		expectedOk: true,
		expectedData: {k3: false},
	})


	runTest({
		name: "handles date field",
		defs: [{key: "k5", type: "date", required: true, label: "Date Field"}],
		data: {k5: "2024-12-31"},
		expectedOk: true,
		expectedData: {k5: new Date("2024-12-31")},
	})

	runTest({
		name: "handles enum field with valid value",
		defs: [
			{
				key: "k6",
				type: "enum",
				required: true,
				label: "Enum Field",
				enumData: [
					{key: "opt1", label: ""},
					{key: "opt2", label: ""},
				],
			},
		],
		data: {k6: "opt1"},
		expectedOk: true,
		expectedData: {k6: "opt1"},
	})

	runTest({
		name: "handles enum field with invalid value",
		defs: [
			{
				key: "k6",
				type: "enum",
				required: true,
				label: "Enum Field",
				enumData: [
					{key: "opt1", label: ""},
					{key: "opt2", label: ""},
				],
			},
		],
		data: {k6: "invalid"},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k6: ["unknown_enum_value"]},
	})
})

describe("validateFromJson", function () {

	const runTest = function (
		args: Omit<Parameters<typeof runTestCommon>[0], 'validator'>
	) {
		runTestCommon({
			...args,
			validator: validateFromJson,
		});
	};

	runTest({
		name: "validates required text field",
		defs: [{key: "k1", type: "text", required: true, label: "Field 1"}],
		data: {k1: "value1"},
		expectedOk: true,
		expectedData: {k1: "value1"},
	})

	runTest({
		name: "returns error for unknown field",
		defs: [{key: "k1", type: "text", required: true, label: "Field 1"}],
		data: {k1: "value1", unknownField: "unexpected"},
		expectedOk: false,
		expectedData: null,
		formError: ["unknown_field"],
		allowPartial: true,
	})

	runTest({
		name: "validates required text field, invalid type",
		defs: [{key: "k1", type: "text", required: true, label: "Field 1"}],
		data: {k1: 1},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k1: ["invalid_type"]},
	})

	runTest({
		name: "detects missing required text field",
		defs: [{key: "k1", type: "text", required: true, label: "Field 1"}],
		data: {},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k1: ["required"]},
	})

	runTest({
		name: "handles number field",
		defs: [{key: "k2", type: "number", required: true, label: "Number Field"}],
		data: {k2: 123},
		expectedOk: true,
		expectedData: {k2: 123},
	})

	runTest({
		name: "handles number field, invalid type",
		defs: [{key: "k2", type: "number", required: true, label: "Number Field"}],
		data: {k2: "abc"},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k2: ["invalid_type"]},
	})

	runTest({
		name: "handles boolean field",
		defs: [{key: "k3", type: "bool", label: "Boolean Field"}],
		data: {k3: true},
		expectedOk: true,
		expectedData: {k3: true},
	})

	runTest({
		name: "handles date field",
		defs: [{key: "k5", type: "date", required: true, label: "Date Field"}],
		data: {k5: "2024-12-31T00:00:00.000Z"},
		expectedOk: true,
		expectedData: {k5: new Date("2024-12-31T00:00:00.000Z")},
	})

	runTest({
		name: "handles date field, invalid format",
		defs: [{key: "k5", type: "date", required: true, label: "Date Field"}],
		data: {k5: "invalid-date"},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k5: ["invalid_date_format"]},
	})

	runTest({
		name: "handles enum field with valid value",
		defs: [
			{
				key: "k6",
				type: "enum",
				required: true,
				label: "Enum Field",
				enumData: [
					{key: "opt1", label: ""},
					{key: "opt2", label: ""},
				],
			},
		],
		data: {k6: "opt1"},
		expectedOk: true,
		expectedData: {k6: "opt1"},
	})

	runTest({
		name: "handles enum field with invalid value",
		defs: [
			{
				key: "k6",
				type: "enum",
				required: true,
				label: "Enum Field",
				enumData: [
					{key: "opt1", label: ""},
					{key: "opt2", label: ""},
				],
			},
		],
		data: {k6: "invalid"},
		expectedOk: false,
		expectedData: null,
		expectedCodes: {k6: ["unknown_enum_value"]},
	})
})
