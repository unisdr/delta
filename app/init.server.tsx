import {initDB, endDB} from "./db.server"
import {initCookieStorage} from "./util/session"
import { startWebSocketServer } from "./backend.server/websocket.server"; 

export function initServer() {
	console.log("init.serve.tsx:init")
	console.log("Initing DB...")
	initDB()
	console.log("Initing cookie storage...")
	initCookieStorage();

	console.log("Starting WebSocket Server...")
	startWebSocketServer(8080);
}

export function endServer() {
	console.log("init.serve.tsx:end")
	console.log("Ending DB...")
	endDB()
}
