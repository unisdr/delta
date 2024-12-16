import fs from 'fs';
import path from 'path';
import {initDB, endDB} from '~/db.server';
import '~/backend.server/models/all_test.ts'
import '~/frontend/all_test.ts'
import { before, after } from 'node:test';

function splitInto2(str: string, delimiter: string): [string, string] {
	const index = str.indexOf(delimiter);
	if (index === -1) {
		return [str, ""]
	}
	return [str.substring(0, index), str.substring(index + delimiter.length)];
}

function removeQuotes(str: string) {
	if (str.startsWith('"') && str.endsWith('"')) {
		return str.slice(1, -1);
	}
	return str;
}

export function loadEnvFile(type: string) {
	const file = `.env.${type}`;
	const fullPath = path.resolve(process.cwd(), file);

	if (fs.existsSync(fullPath)) {
		const content = fs.readFileSync(fullPath, 'utf8');
		
		content.split('\n').forEach(line => {
			const [k, v] = splitInto2(line, "=")
			if (!k || !v){
				return
			}
			process.env[k] = removeQuotes(v.trim())
			console.log("kv", k, v);
		});
		
		console.log(`Loaded env vars from ${file}`);
	} else {
		console.warn(`File ${file} not found`);
	}
}

loadEnvFile("test")

before(async () => {
	console.log("initing test db")
	initDB()
});

after(async () => {
	console.log("ending test db")
	endDB()
});



