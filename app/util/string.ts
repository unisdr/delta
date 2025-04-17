export function stringToBoolean(value: string): boolean {
	const truthyValues = ['true', '1'];
	return truthyValues.includes(value.toLowerCase());
};

export function stripTags(original: string): string {
	return original.replace(/(<([^>]+)>)/gi, "");
} 

export function capitalizeFirstLetter(str: string): string {
	if (!str) {
		return str
	}
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export function lowercaseFirstLetter(str: string): string {
	if (!str) {
		return str
	}
	return str.charAt(0).toLowerCase() + str.slice(1)
}

export function stripHTML(html: string): string {
	// Use a regular expression to strip HTML tags
	const text = html.replace(/<[^>]*>/g, ""); 
	
	// Remove tabs and extra spaces
	return text.replace(/\t/g, "").trim();
} 