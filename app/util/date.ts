// month 1-12
export function getMonthName(month: number) {
	const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
	return monthNames[month - 1]
}

export function formatDate(date: Date | null): string {
	if (!date) {
		return ""
	}
	return date.toISOString().split('T')[0];
}

export function formatDateTimeUTC(date: Date | null): string {
	if (!date) {
		return ""
	}
	const year = date.getUTCFullYear()
	const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
	const day = date.getUTCDate().toString().padStart(2, '0')
	const hours = date.getUTCHours().toString().padStart(2, '0')
	const minutes = date.getUTCMinutes().toString().padStart(2, '0')
	return year + "-" + month + "-" + day + " " + hours + ":" + minutes + " UTC"
}

export function formatDateTimeNonUTC(date: Date | null): string {
	if (!date) {
		return ""
	}
	const year = date.getFullYear()
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const day = date.getDate().toString().padStart(2, '0')
	const hours = date.getHours().toString().padStart(2, '0')
	const minutes = date.getMinutes().toString().padStart(2, '0')
	const offset = date.getTimezoneOffset()
	const offsetHours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
	const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0')
	const sign = offset <= 0 ? '+' : '-';
	return year + "-" + month + "-" + day + " " + hours + ":" + minutes + " " + sign + offsetHours + ":" + offsetMinutes
}

export function formatForDateTimeInput(date: Date | null): string {
	if (!date) {
		return ""
	}
	const isoString = date.toISOString();
	return isoString.slice(0, 16);
}

export function toStandardDate(dateStr: string): string | null {
	if (!dateStr) return null
	let d = new Date(dateStr)
	if (isNaN(d.getTime())) return null
	return d.toISOString().split("T")[0]
}

export function formatDateDisplay(date: Date | string | null, format: string = "d MMM yyyy"): string {
	if (!date) return "";

	// Convert string to Date if necessary
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "Invalid Date";

	const day = d.getDate();
	const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
	const monthNum = d.getMonth() + 1; // JavaScript months are 0-indexed
	const year = d.getFullYear();

	// Format the date according to the specified format
	return format
		.replace("dd", day.toString().padStart(2, '0')) // Padded day (01-31)
		.replace("d", day.toString()) // Unpadded day (1-31)
		.replace("MM", monthNum.toString().padStart(2, '0')) // Padded month (01-12)
		.replace("M", monthNum.toString()) // Unpadded month (1-12)
		.replace("MMM", month) // Month abbreviation (Jan, Feb, etc.)
		.replace("yyyy", year.toString());
}

export function isDateLike(input: string): boolean {
	const regex = /^(\d{1,2})\s([A-Za-z]+)\s(\d{4})$/;
	return regex.test(input);
}

export function convertToISODate(input: string): string | null {
	const regex = /^(\d{1,2})\s([A-Za-z]+)\s(\d{4})$/;
	const months: { [key: string]: string } = {
		jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
		jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
		january: "01", february: "02", march: "03", april: "04", june: "06",
		july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
	};

	const match = input.toLowerCase().match(regex);
	if (match) {
		const day = match[1].padStart(2, "0"); // Ensure two-digit day
		const month = months[match[2].toLowerCase()]; // Convert month name to number
		const year = match[3];

		if (month) {
			return `${year}-${month}-${day}`;
		}
	}
	return null;
}
