import { randomBytes } from "crypto";

/**
 * Generates a CSRF (Cross-Site Request Forgery) token.
 *
 * CSRF tokens are used to prevent unauthorized requests from being made to a web application.
 * This function generates a 100-byte random string encoded in base64 format to be used as a CSRF token.
 *
 * @returns {string} A CSRF token.
 */
export function createCSRFToken(): string {
	// Generate 100 random bytes using the `randomBytes` function from the crypto module and
	// encode the random bytes in base64 format and return the result

	return randomBytes(100).toString("base64");
}
