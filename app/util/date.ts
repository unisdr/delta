import {date} from "drizzle-orm/mysql-core";

export function formatDate(date: Date|null): string {
	if (!date){
		return ""
	}
	return date.toISOString().split('T')[0];
}

export function toStandardDate(dateStr: string): string|null {
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
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(d); // ✅ Works in all environments
    const year = d.getFullYear();

    return format
        .replace("d", day.toString())
        .replace("MMM", month)
        .replace("yyyy", year.toString());
}