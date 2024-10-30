import * as schema from "./drizzle/schema"

// TODO: for tests
// import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';


export const dr = drizzle(process.env.DATABASE_URL!, { schema });

