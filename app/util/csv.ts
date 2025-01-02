import {parse} from 'csv-parse';
import {stringify} from 'csv-stringify';

export async function parseCSV(data: string): Promise<string[][]> {
	return new Promise((resolve, reject) => {
		const parser = parse({
			delimiter: ",",
		});
		const records: string[][] = [];
		parser.on("readable", function () {
			let record;
			while ((record = parser.read()) !== null) {
				record = record.map((field: string) => field.trim())
				records.push(record);
			}
		});
		parser.on("error", function (err) {
			reject(err);
		});
		parser.on("end", function () {
			resolve(records);
		});
		parser.write(data);
		parser.end();
	});
}

export async function stringifyCSV(data: string[][]): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: string[] = [];
		const stringifier = stringify({
			delimiter: ",",
		});
		stringifier.on("readable", function () {
			let chunk;
			while ((chunk = stringifier.read()) !== null) {
				chunks.push(chunk);
			}
		});
		stringifier.on("error", function (err) {
			reject(err);
		});
		stringifier.on("end", function () {
			resolve(chunks.join(""));
		});
		data.forEach((row) => stringifier.write(row));
		stringifier.end();
	})
}


