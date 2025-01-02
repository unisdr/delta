// TODO: for tests
// import 'dotenv/config';

import {drizzle, NodePgDatabase} from 'drizzle-orm/node-postgres';

import * as schema from "~/drizzle/schema"


export type Dr = NodePgDatabase<typeof schema> & {$client: any};

export type Tx = (Parameters<typeof dr["transaction"]>[0] extends (tx: infer T) => any ? T : never) | Dr

export let dr: Dr
let pool: any

export function initDB() {
	if (!process.env.DATABASE_URL){
		throw "DATABASE_URL missing"
	}

	dr = drizzle(process.env.DATABASE_URL!, {
		logger: false,
		schema
	});
	pool = dr.$client;
	if (!dr) {
		throw "failed to init database"
	}
}

export function endDB() {
	pool.end()
}

