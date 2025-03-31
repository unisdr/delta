import { deepEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { 
	checkPasswordComplexity,
	PasswordErrorType,
	characterClasses,
	PasswordCharClass
} from './password_check';

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

