interface PGError extends Error {
	code: string;
	constraint?: string;
	routine?: string;
}

// Check if the error is a unique constraint violation
export function errorIsNotUnique(e: Error, table: string, column: string): boolean {
	const pgError = e as PGError;
	return (
		pgError.code === '23505' &&
		pgError.constraint === `${table}_${column}_unique`
	);
}
