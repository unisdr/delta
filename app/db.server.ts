// TODO: for tests
// import 'dotenv/config';

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from "~/drizzle/schema"

export type Dr = NodePgDatabase<typeof schema> & { $client: any };

export let dr: Dr
let pool: any

if (process.env.DATABASE_URL){
	console.log("env.DATABASE_URL set, initing db")
	initDB()
} else {
	console.log("env.DATABASE_URL not set, waiting for initDB call from tests/all")
}

export function initDB(){
	dr = drizzle(process.env.DATABASE_URL!, {
		logger: false,
		schema
	});
	pool = dr.$client;
	if (!dr){
		throw "failed to init database"
	}
}

export function endDB(){
	pool.end()
}

