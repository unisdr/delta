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
