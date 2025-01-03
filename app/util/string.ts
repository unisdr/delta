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
