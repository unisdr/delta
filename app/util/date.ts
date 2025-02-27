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
	const month = new Intl.DateTimeFormat("en-US", {month: "short"}).format(d); // ✅ Works in all environments
	const year = d.getFullYear();

	return format
		.replace("d", day.toString())
		.replace("MMM", month)
		.replace("yyyy", year.toString());
}
