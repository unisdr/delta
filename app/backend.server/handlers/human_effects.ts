import {
	HumanEffectsTableFromString,
	HumanEffectTablesDefs,
} from "~/frontend/human_effects/defs";
import {
	get,
	categoryPresenceSet,
	categoryPresenceGet,
	categoryPresenceDeleteAll,
	totalGroupGet,
	totalGroupSet,
	calcTotalForGroup,
	setTotal,
	getTotalPresenceTable,
	getTotalDsgTable,
	setTotalPresenceTable
} from '~/backend.server/models/human_effects'
import { PreviousUpdatesFromJson } from "~/frontend/editabletable/data";
import { ETError, GroupError } from "~/frontend/editabletable/validate";
import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import {
	create,
	update,
	deleteRows,
	validate,
	defsForTable,
	clearData,
} from "~/backend.server/models/human_effects";
import { eqArr } from "~/util/array";
import { dr } from "~/db.server";

export async function loadData(
	recordId: string | undefined,
	tblStr: string,
	countryAccountsId: string
) {
	if (!recordId) {
		throw new Error("no record id");
	}
	let tblId: HumanEffectsTable;
	if (!tblStr) {
		tblId = "Deaths";
	} else {
		tblId = HumanEffectsTableFromString(tblStr);
	}
	const defs = await defsForTable(dr, tblId);
	let res = await get(dr, tblId, recordId, countryAccountsId, defs);
	res = res!;
	if (!res.ok) {
		throw res.error;
	}
	let categoryPresence = await categoryPresenceGet(dr, recordId, countryAccountsId, tblId, defs)
	let categoryPresenceTotals = await getTotalPresenceTable(dr, tblId, recordId, defs)
	//let dsgTotals = await getTotalDsgTable(dr, tblId, recordId, defs)
	let totalGroupFlags = await totalGroupGet(dr, recordId, tblId)

	return {
		tblId: tblId,
		tbl: HumanEffectTablesDefs.find((t) => t.id == tblId)!,
		recordId,
		defs: defs,
		ids: res.ids,
		data: res.data,
		categoryPresence,
		totalGroupFlags,
		totals: categoryPresenceTotals,
		//dsgTotals
	}
}

interface Req {
	table: HumanEffectsTable;
	columns?: string[];
	data: PreviousUpdatesFromJson;
}

function convertUpdatesToIdsAndData(
	updates: Record<string, Record<number, any>>,
	cols: number
): { ids: string[]; data: any[][] } {
	let ids: string[] = [];
	let data: any[][] = [];
	if (updates) {
		for (let id in updates) {
			ids.push(id);
			let row = Array(cols).fill(undefined);
			for (let colIndex in updates[id]) {
				row[colIndex] = updates[id][colIndex];
			}
			data.push(row);
		}
	}
	return { ids, data };
}

export async function saveHumanEffectsData(req: Request, recordId: string, countryAccountsId: string) {
	let d: Req;
	try {
		d = (await req.json()) as Req;
	} catch {
		return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
	}
	if (!recordId) {
		throw new Error("no record id");
	}
	let defs = await defsForTable(dr, d.table)
	let expectedCols = defs.map(d => d.jsName)

	if (!d.data) {
		return Response.json({ ok: false, error: `no data passed` }, { status: 400 })
	}

	if (d.data.deletes || d.data.updates || d.data.newRows) {
		if (!d.columns) {
			return Response.json({ ok: false, error: `when passing data, columns are also required: ${expectedCols}` }, { status: 400 })
		}
		if (!eqArr(d.columns, expectedCols)) {
			return Response.json({ ok: false, error: `columns passed do not match expected: ${expectedCols} got ${d.columns}` }, { status: 400 })
		}
	}

	try {
		let dataModified = false;


		await dr.transaction(async (tx) => {
			if (d.data.totalGroupFlags !== undefined) {
				if (d.data.totalGroupFlags === "invalid") {
					throw "Server error, invalid totalGroup (should be checked in frontend)"
				}
				/*
				console.log('Updating totalGroup:', {
					recordId,
					table: d.table,
					totalGroup: d.data.totalGroup
				});*/
				await totalGroupSet(tx, recordId, d.table, d.data.totalGroupFlags)
			}
			if (d.data.deletes) {
				let res = await deleteRows(tx, d.table, d.data.deletes)
				if (!res.ok) {
					throw res.error
				}
				dataModified = true;
			}
			if (d.data.updates) {
				let data2 = convertUpdatesToIdsAndData(d.data.updates, defs.length)
				let res = await update(tx, d.table, defs, data2.ids, data2.data, false)
				if (!res.ok) {
					throw res.error
				}
				dataModified = true;
			}
			let idMap = new Map<string, string>()
			if (d.data.newRows) {
				let ids: string[] = []
				let data: any[][] = []
				for (let [id, row] of Object.entries(d.data.newRows)) {
					ids.push(id)
					data.push(row)
				}
				let res = await create(tx, d.table, recordId, defs, data, false)
				if (!res.ok) {
					if (res.error) {
						throw res.error
					} else {
						throw new Error("unknown create error")
					}
				} else {
					for (let [i, id] of res.ids.entries()) {
						idMap.set(id, ids[i])
					}
					dataModified = true;
				}
			}

			if (d.data.totalGroupFlags) {
				// Automatically calculate total option
				let res = await calcTotalForGroup(tx, d.table, recordId, defs, d.data.totalGroupFlags)
				//console.log("calcTotalForGroup", d.data.totalGroupFlags, d.table, recordId, "defs", defs.map(d => d.dbName), "res", res)
				if (!res.ok) {
					throw new ETError("total_group_error", res.error?.message || "unknown error")
				}
				await setTotal(tx, d.table, recordId, defs, res.totals)
			} else {
				// Manually calculate total option
				// make sure that presence table total is the same as in the dsg table (row with all nulls)
				let totals = await getTotalDsgTable(tx, d.table, recordId, defs)
				//console.log("updating total in presence table to match the value from dsg table", totals)
				await setTotalPresenceTable(tx, d.table, recordId, defs, totals)
			}

			let res = await validate(tx, d.table, recordId, countryAccountsId, defs)
			if (!res.ok) {
				if (res.tableError) {
					throw res.tableError
				} else if (res.groupErrors){
					throw res.groupErrors[0]
				} else if (res.rowErrors) {
					for (let e of res.rowErrors) {
						let idTemp = idMap.get(e.rowId)
						if (idTemp) {
							e.rowId = idTemp
						}
					}
					throw res.rowErrors
				} else {
					throw new Error("unknown validate error")
				}
			}
			if (dataModified) {
				// Get current data to determine category presence
				const currentData = await get(tx, d.table, recordId, countryAccountsId, defs);
				if (currentData.ok) {
					// Calculate category presence based on current data
					const categoryPresence: Record<string, boolean> = {};

					// First, initialize all metric fields to true
					for (const def of defs) {
						if (def.role === 'metric' && def.jsName) {
							// Use the JavaScript name for the presence flag (categoryPresenceSet will map to DB column)
							categoryPresence[def.jsName] = true;
						}
					}

					// Check each row for each metric field
					for (const row of currentData.data) {
						const rowData = row as unknown as Record<string, any>;
						for (const def of defs) {
							if (def.role === 'metric' && def.jsName && rowData[def.jsName] != null) {
								// If we find any non-null value, set presence to true
								categoryPresence[def.jsName] = false;
							}
						}
					}

					/*
					// Debug log the presence data being sent
					console.log('Updating category presence:', {
						recordId,
						table: d.table,
						presence: categoryPresence,
						data: currentData.data
					});*/

					// Update category presence
					await categoryPresenceSet(tx, recordId, d.table, defs, categoryPresence);
				}
			}
		})
	} catch (e) {
		if (Array.isArray(e)) {
			return Response.json({ ok: false, errors: e })
		} else if (e instanceof ETError || e instanceof GroupError) {
			return Response.json({ ok: false, error: e })
		} else {
			console.log("unknown human_effects.save error", e)
			throw e
		}
	}
	return Response.json({ ok: true });
}

export async function clear(tableIdStr: string, recordId: string) {
	if (!recordId) {
		throw new Error("no record id");
	}
	let table: HumanEffectsTable | null = null;
	try {
		table = HumanEffectsTableFromString(tableIdStr);
	} catch (e) {
		return Response.json({ ok: false, error: String(e) });
	}
	try {
		await dr.transaction(async (tx) => {
			let res = await clearData(tx, table!, recordId);
			if (!res.ok) {
				throw res.error;
			}
		});
	} catch (e) {
		if (e instanceof ETError) {
			return Response.json({ ok: false, error: e })
		} else {
			throw e;
		}
	}
	return Response.json({ ok: true });
}

export async function deleteAllData(recordId: string) {
	if (!recordId) {
		throw new Error("no record id");
	}
	for (let def of HumanEffectTablesDefs) {
		let r = await clear(def.id, recordId);
		if (!r.ok) {
			return r;
		}
	}
	await categoryPresenceDeleteAll(dr, recordId);
	return Response.json({ ok: true });
}
