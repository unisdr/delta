import {dr} from '~/db.server';
import {commonPasswordsTable} from '~/drizzle/schema';
import { eq } from 'drizzle-orm';



// Password rules
// - at least 12 characters long
// - different from initial password
// - not same as the username
// - character classes
// two of the following required
// Character classes
// upper case letters
// lower case letters
// numbers
// punctuation marks
// - not based on words in any language or simple patters
// prevent reuse of previous five passwords

export async function isCommonPassword(password: string) {

	const tableCheck = await dr.select().from(commonPasswordsTable).limit(1);
	if (tableCheck.length === 0) {
		throw new Error("Common passwords table was not imported");
	}

	const result = await dr
		.select()
		.from(commonPasswordsTable)
		.where(eq(commonPasswordsTable.password, password))
		.limit(1);

	return result.length > 0;
}

export enum PasswordCharClass {
	Uppercase = "UPPERCASE",
	Lowercase = "LOWERCASE",
	Digit = "DIGIT",
	Punctuation = "PUNCTUATION",
}

type PasswordCharClasses = Set<PasswordCharClass>

function hasLowerCase(str: string) {
	return str.toUpperCase() != str;
}

function hasUpperCase(str: string) {
	return str.toLowerCase() != str;
}

export function characterClasses(password: string): PasswordCharClasses {
	const res: PasswordCharClasses = new Set();
	if (hasLowerCase(password)) {
		res.add(PasswordCharClass.Lowercase);
	}
	if (hasUpperCase(password)) {
		res.add(PasswordCharClass.Uppercase);
	}
	if (/[0-9]/.test(password)) {
		res.add(PasswordCharClass.Digit);
	}
	// !@#$%^&*()+=\`{}[]:";'< >?,./
	if (/[!@#$%^&*()+=\\`{}\[\]:";'< >?,.\/]/.test(password)) {
		res.add(PasswordCharClass.Punctuation);
	}
	return res
}

export enum PasswordErrorType {
	Empty = "EMPTY",
	TooShort = "TOO_SHORT",
	InsufficientCharacterClasses = "INSUFFICIENT_CHARACTER_CLASSES",
}

export interface PasswordCompexity {
	error: PasswordErrorType | null
	characterClasses: PasswordCharClasses
}

export function checkPasswordComplexity(password: string): PasswordCompexity {
	let res: PasswordCompexity = {
		error: null,
		characterClasses: characterClasses(password),
	}
	if (password === "") {
		res.error = PasswordErrorType.Empty;
		return res
	}
	if (password.length < 12) {
		res.error = PasswordErrorType.TooShort;
		return res
	}
	if (res.characterClasses.size < 2) {
		res.error = PasswordErrorType.InsufficientCharacterClasses
		return res
	}
	return res;
}

