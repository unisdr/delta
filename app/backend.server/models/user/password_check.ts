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

