import { deepEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { 
	checkPasswordComplexity,
	isCommonPassword,
	PasswordErrorType,
	characterClasses,
	PasswordCharClass
} from './password';
import assert from 'node:assert';
import {testPrismaClient} from '~/tests/db';

describe('isCommonPassword', async () => {
	const db = testPrismaClient()
	const fn = isCommonPassword
	describe('no data', async () => {
		await db.commonPasswords.deleteMany()
		it("no data", async () => {
		await assert.rejects(
			async () => {
				await fn(db, "abc")
			},
			{
				name: 'Error',
				message: 'common passwords table was not imported',
			},
		);
		});
	})
	describe('with data', async () => {
		await db.commonPasswords.deleteMany()
		await db.commonPasswords.createMany({
			data: [
				{password: "abc"},
			]
		})
		it("no data", async () => {
			assert.equal(await fn(db, "abc"), true)
		});
		it("common", async () => {
			assert.equal(await fn(db, "abc"), true)
		});
		it("not common", async () => {
			assert.equal(await fn(db, "abcd"), false)
		});
	});
});

describe('characterClasses', () => {
	const fn = characterClasses;
	it('empty password', async () => {
		deepEqual(fn(""), new Set());
	});
	it('lowercase', async () => {
		deepEqual(fn("a"), new Set([PasswordCharClass.Lowercase]));
		deepEqual(fn("α"), new Set([PasswordCharClass.Lowercase]));
	});
	it('uppercase', async () => {
		deepEqual(fn("A"), new Set([PasswordCharClass.Uppercase]));
		deepEqual(fn("Ψ"), new Set([PasswordCharClass.Uppercase]));
	});
	it('digit', async () => {
		deepEqual(fn("1"), new Set([PasswordCharClass.Digit]));
	});
	it('punctuation', async () => {
		deepEqual(fn("."), new Set([PasswordCharClass.Punctuation]));
	});
})

describe('checkPasswordComplexity', () => {
	const fn = checkPasswordComplexity
	it('empty password', async () => {
		deepEqual(fn(""), {error: PasswordErrorType.Empty, characterClasses: new Set()});
	});
	it('valid', async () => {
		deepEqual(fn("]ARi3w.kOi3j"), {error: null, characterClasses: new Set([
			PasswordCharClass.Digit,
			PasswordCharClass.Lowercase,
			PasswordCharClass.Uppercase,
			PasswordCharClass.Punctuation,
		])});
	});
	it('too short', async () => {
		deepEqual(fn("]ARi3w.kOi3"), {error: PasswordErrorType.TooShort, characterClasses: new Set([
			PasswordCharClass.Digit,
			PasswordCharClass.Lowercase,
			PasswordCharClass.Uppercase,
			PasswordCharClass.Punctuation,
		])});
	});
	it('character classes', async () => {
		deepEqual(fn("123456789012"), {error: PasswordErrorType.InsufficientCharacterClasses, characterClasses: new Set([PasswordCharClass.Digit])});
	});
});

