// TODO: for tests
// import 'dotenv/config';

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "~/drizzle/schema";

export type Dr = NodePgDatabase<typeof schema> & { $client: any };

export type Tx =
  | (Parameters<(typeof dr)["transaction"]>[0] extends (tx: infer T) => any
      ? T
      : never)
  | Dr;

export let dr: Dr;
let pool: any;

export function initDB() {
  if (!process.env.DATABASE_URL) {
    throw "DATABASE_URL missing";
  }
  dr = drizzle(process.env.DATABASE_URL!, {
    logger: true,
    schema,
  });
  pool = dr.$client;
  if (!dr) {
    throw "failed to init database";
  }
}

export function endDB() {
  pool.end();
}

export async function testDbConnection() {
  pool = dr.$client;

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    // const res = await client.query('SELECT NOW()');
    // console.log('Database connected:', res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    // console.error('Database connection failed:', err);
    return false;
  }
}
