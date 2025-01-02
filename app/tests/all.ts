import fs from 'fs';
import path from 'path';
import {initServer, endServer} from '~/init.server';
import '~/backend.server/all_test'
import '~/frontend/all_test'
import {before, after} from 'node:test';


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
			if (!k || !v) {
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
	try {
		initServer()
	} catch (err) {
		console.log(err)
		process.exit(1)
	}
});

after(async () => {
	endServer()
});



