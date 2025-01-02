import {initDB, endDB} from "./db.server"
import {initCookieStorage} from "./util/session"

export function initServer() {
	console.log("init.serve.tsx:init")
	console.log("Initing DB...")
	initDB()
	console.log("Initing cookie storage...")
	initCookieStorage()
}

export function endServer() {
	console.log("init.serve.tsx:end")
	console.log("Ending DB...")
	endDB()
}
