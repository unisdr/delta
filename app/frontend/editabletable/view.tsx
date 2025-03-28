import {useEffect, useState} from "react"
import {Def, DefEnum} from "~/frontend/editabletable/defs"
import {
	DataWithId,
	DataManager,
	Sort,
	Group,
} from "./data"
import {cloneInstance} from "~/util/object"
import {HumanEffectsTable} from "~/frontend/human_effects/defs"
import React from 'react'
import {toStandardDate} from "~/util/date"
import {eqArr} from "~/util/array"
import {Link, useFetcher} from "@remix-run/react"
import {notifyError, notifyInfo} from "../utils/notifications"

interface TableProps {
	recordId: string
	table: HumanEffectsTable
	initialIds: string[]
	initialData: any[][]
	categoryPresence: Record<string, boolean>
	defs: Def[]
}
export function Table(props: TableProps) {
	const [isClient, setIsClient] = useState(false)
	useEffect(() => {
		setIsClient(true)
	}, [])
	if (!isClient) {
		return <p>Javascript must be enabled</p>
	}
	return <TableClient {...props} />
}

function colsFromDefs(defs: Def[]) {
	return {
		dimensions: defs.filter(d => d.role == "dimension").length,
		metrics: defs.filter(d => d.role == "metric").length,
	}
}

interface tableChildProps {
	defs: Def[]
	data: DataManager
}

interface tableError {
	code: string
	message: string
	rowId: string
}

const storageVersion = "v3"

function TableClient(props: TableProps) {
	function makeLocalStorageKey(recordId: string, table: string) {
		return `table-${recordId}-${table}-${storageVersion}`
	}

	let [localStorageKey, setLocalStorageKey] = useState(
		makeLocalStorageKey(props.recordId, props.table)
	)

	function setLocalStorageKeyFromVars(recordId: string, table: string): string{
		let key = makeLocalStorageKey(recordId, table)
		setLocalStorageKey(key)
		return key
	}

	let initDataManager = (key: string) => {
		let previousUpdates: any = {}
		console.log("loading from", key)
		let storedData = localStorage.getItem(key)
		if (storedData) {
			try {
				previousUpdates = JSON.parse(storedData)
			} catch (err) {
				console.log("Error parsing previous update data", storedData, err)
			}
			let defNames = props.defs.map(d => d.dbName)
			if (!previousUpdates.defNames || !eqArr(defNames, previousUpdates.defNames)) {
				console.warn("custom definitions for disaggregations changed, ignoring/deleting old data")
				previousUpdates = {}
			}
		}
		let d = new DataManager()
		d.init(colsFromDefs(props.defs), props.initialData, props.initialIds, previousUpdates)
		console.log("inited table", props.table, props.defs.length)
		return d
	}

	let [data, setData] = useState(() => initDataManager(localStorageKey))

	let [sort, setSort] = useState<Sort>({column: 0, order: "asc"})

	let [childProps, setChildProps] = useState<tableChildProps | null>(null)

	let [tableErrors, setTableErrors] = useState<tableError[]>([])

	let [categoryPresence, setCategoryPresence] = useState(props.categoryPresence)

	useEffect(() => {
		setCategoryPresence(props.categoryPresence)
	}, [props.categoryPresence])

	useEffect(() => {
		console.log("useEffect, props data changed")
		let key = setLocalStorageKeyFromVars(props.recordId, props.table)
		setData(initDataManager(key))
	}, [props.defs, props.initialData, props.initialIds, props.recordId, props.table])

	useEffect(() => {
		let dataUpdates = data.getUpdatesForSaving()
		dataUpdates.defNames = props.defs.map(d => d.dbName)
		let json = JSON.stringify(dataUpdates)
		localStorage.setItem(localStorageKey, json)
		console.log("saving to", localStorageKey)

		setChildProps({defs: props.defs, data: data})
	}, [data])

	const updateCell = (rowId: string, colIndex: number, value: any) => {
		console.log("updating cell", rowId, colIndex, value)
		data.updateField(rowId, colIndex, value)
		let def = props.defs[colIndex]
		if (def.role == "metric" && value) {
			setCategoryPresence(prev => ({
				...prev,
				[def.jsName]: true
			}))
		}
		setData(cloneInstance(data))
	}

	const updateTotals = (colIndex: number, value: any) => {
		data.updateTotals(colIndex, value)
		let cols = colsFromDefs(props.defs)
		let def = props.defs[cols.dimensions + colIndex]
		if (def.role == "metric" && value) {
			setCategoryPresence(prev => ({
				...prev,
				[def.jsName]: true
			}))
		}
		setData(cloneInstance(data))
	}

	const copyRow = (rowId: string) => {
		data.copyRow(rowId)
		setData(cloneInstance(data))
	}

	const deleteRow = (rowId: string) => {
		data.deleteRow(rowId)
		setData(cloneInstance(data))
	}

	const handleSave = async () => {
		reSort()
		console.log("Saving data to server")
		let dataUpdates = data.getUpdatesForSaving()
		let json = JSON.stringify({
			columns: props.defs.map(d => d.jsName),
			table: props.table,
			data: dataUpdates
		})
		try {
			let resp = await fetch('./human-effects/save', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: json,
			})
			let res = await resp.json()
			if (!res.ok) {
				if (res.errors) {
					setTableErrors(res.errors)
				} else if (res.error) {
					throw new Error(`Failed to save data on the server: ${res.error.message}`)
				} else {
					throw new Error("Unknown server error")
				}
				return
			}
			notifyInfo("Your changes have been saved on the server")
			await reloadData()
		} catch (error) {
			notifyError("Error saving changes: " + error)
		}
	}

	const reloadData = async () => {
		let u = await fetch(
			'./human-effects/load?tbl=' + props.table
		).then(res => res.json())
		let d = new DataManager()
		d.init(colsFromDefs(u.defs), u.data, u.ids)
		d.sortByColumn(sort.column, sort.order)
		setData(d)
		setTableErrors([])
	}

	const handleRevert = () => {
		let d = new DataManager()
		d.init(colsFromDefs(props.defs), props.initialData, props.initialIds)
		setData(d)
		setTableErrors([])
	}

	const handleClear = async () => {
		console.log("Clearing data")
		try {
			let resp = await fetch('./human-effects/clear?table=' + props.table, {
				method: 'POST',
			})
			let res = await resp.json()
			if (!res.ok) {
				throw `Failed to clear data on the server: ${res.error.message}`
			}
			console.log("Data successfully cleared")
			await reloadData()
		} catch (error) {
			alert("Error clearing data:" + error)
		}
	}

	const reSort = () => {
		let sort = data.getSort()
		data.sortByColumn(sort.column, sort.order)
		setData(cloneInstance(data))
	}

	const toggleColumnSort = (colIndex: number) => {
		data.toggleColumnSort(colIndex)
		setData(cloneInstance(data))
		setSort(data.getSort())
	}

	const addRowStart = () => {
		data.addRow("start")
		setData(cloneInstance(data))
	}

	const addRowEnd = () => {
		data.addRow("end")
		setData(cloneInstance(data))
	}

	if (!childProps) {
		return <p>Loading</p>
	}

	let hasDate = props.defs.some(d => d.format == "date")

	let categoryPresenceAtLeastOneYes = Object.values(categoryPresence).some(v => v)

	return (
		<div className="table-container">
			<TableCategoryPresence
				tblId={props.table}
				defs={childProps.defs}
				data={categoryPresence}
			/>
			{categoryPresenceAtLeastOneYes &&
				<>
					<h3>Numeric data</h3>
					<TableActions
						onSave={handleSave}
						onRevert={handleRevert}
						onClear={handleClear}
						addRowStart={addRowStart}
						reSort={reSort}
						csvExportUrl="./human-effects/csv-export"
						csvImportUrl={"./human-effects/csv-import?table=" + props.table}
					/>
					<TableContent
						tableErrors={tableErrors}
						sort={sort}
						totals={childProps.data.getTotals().data}
						totalsMatch={hasDate ? null : childProps.data.groupTotalsMatch()}
						data={childProps.data.applyUpdatesWithGroupKey()}
						defs={childProps.defs}
						updateTotals={updateTotals}
						updateCell={updateCell}
						copyRow={copyRow}
						deleteRow={deleteRow}
						toggleColumnSort={toggleColumnSort}
						addRowEnd={addRowEnd}
					/>
					<TableLegend />
					<Link to="/settings/human-effects-dsg">Configure Disaggregations</Link>
				</>
			}
		</div>
	)
}

function TableLegend() {
	return <div className="dts-editable-table-legend">
		<span>Cell color legend</span>
		<ul>
			<li className="dts-new-or-update">Unsaved changes</li>
			<li className="dts-warning">Totals do not match</li>
			<li className="dts-error">Errors with data</li>
		</ul>
	</div>
}

interface TableContentProps {
	totals: any[]
	totalsMatch: null | Map<string, boolean[]>
	data: Group<DataWithId>[]
	defs: Def[]
	updateCell: (rowId: string, colIndex: number, value: any) => void
	updateTotals: (colIndex: number, value: any) => void
	copyRow: (rowId: string) => void
	deleteRow: (rowId: string) => void
	toggleColumnSort: (colIndex: number) => void
	sort: Sort
	addRowEnd: () => void
	tableErrors: tableError[]
}

function TableContent(props: TableContentProps) {

	const renderHeader = () => (
		<thead>
			<tr>
				{props.defs.map((def, index) => (
					<React.Fragment key={index}>
						<th
							style={{width: (def.uiColWidth || 70) + "px"}}
							className={
								props.sort.column === index
									? props.sort.order === "asc"
										? "asc"
										: "desc"
									: ""
							}
						>
							<a
								href="#"
								onClick={(e) => {
									e.preventDefault()
									props.toggleColumnSort(index)
								}}
							>
								{def.uiName}
							</a>
						</th>
						{def.role === "metric" && <th style={{width: "30px"}}>%</th>}
					</React.Fragment>
				))}
				<th style={{width: "100px"}}>Actions</th>
			</tr>
		</thead>
	)

	const renderTotalRow = () => (
		<tbody key="totals">
			<tr>
				<td colSpan={colsFromDefs(props.defs).dimensions}>Totals</td>
				{props.defs.filter(d => d.role == "metric").map((_, colIndex) => {
					let v = props.totals[colIndex]
					return (<React.Fragment key={colIndex}>
						<td>
							<input
								type="text"
								value={v ?? ""}
								onChange={(e) => {
									let v = parseInt(e.target.value, 10)
									props.updateTotals(colIndex, isNaN(v) ? null : v)
								}}
							>
							</input>
						</td>
						{<td>100%</td>}
					</React.Fragment>)
				})}
			</tr>
		</tbody>
	)

	const columnCount = () => {
		let colCount = 0
		for (let def of props.defs) {
			if (def.role == "dimension") {
				colCount++
			} else if (def.role == "metric") {
				colCount += 2
			} else {
				console.log("unknown def type", def)
			}
		}
		colCount += 1
		return colCount
	}
	const dimCount = () => {
		let r = 0
		for (let def of props.defs) {
			if (def.role == "dimension") {
				r++
			} else {
				break
			}
		}
		return r
	}

	const renderGroupRows = () => {
		return props.data.map((group, groupI) => {
			let groupMatch: null | boolean[] = null
			if (props.totalsMatch) {
				groupMatch = props.totalsMatch.get(group.key)!
			}
			let colCount = columnCount()
			let disaggr: string[] = []
			for (let i = 0; i < group.key.length; i++) {
				let c = group.key[i]
				if (c == "1") {
					let def = props.defs[i]
					disaggr.push(def.uiName)
				}
			}
			let disaggrLabels = disaggr.join(", ")

			let errors = new Map<string, tableError>()
			for (let e of props.tableErrors) {
				errors.set(e.rowId, e)
			}
			return <tbody key={groupI} className="group">
				<tr className="spacing-row">
					<td colSpan={colCount - 1}>
						Disaggregations: {disaggrLabels || "None"}
					</td>
				</tr>
				{group.data.map((row) => {
					let id = row.id
					let data = row.data
					let error = errors.get(id) || null
					if (data.length !== props.defs.length) {
						throw new Error(
							`Row length does not match defs length data ${data.length} defs ${props.defs.length}`
						)
					}
					let rowClassName = ""
					if (error) {
						rowClassName = "dts-error"
					}

					return (
						<React.Fragment key={id}>
							{error &&
								<tr>
									<td colSpan={colCount}>
										{error.message}
									</td>
								</tr>
							}
							<tr className={rowClassName} key={id}>
								{props.defs.map((def, colIndex) => {
									let cellClassName = null
									if (error) {
										cellClassName = ""
									} else {
										if (def.role == "metric") {
											let metricIndex = colIndex - dimCount()
											if (groupMatch) {
												let m = groupMatch[metricIndex]
												if (!m) {
													cellClassName = "dts-warning"
												}
											}
										}
									}
									return renderCell(def, row, colIndex, cellClassName)
								})}
								<td className="dts-table-actions">{renderRowActions(id)}</td>
							</tr>
						</React.Fragment>
					)
				})}
				<tr className="spacing-row">
					<td colSpan={colCount}></td>
				</tr>
			</tbody>
		})
	}

	const renderCell = (def: Def, row: DataWithId, colIndex: number, className: string | null) => {
		let t = row.from[colIndex]
		let v = row.data[colIndex]
		if (className === null) {
			switch (t) {
				case "i":
					className = "dts-init"
					break
				case "u":
					className = "dts-update"
					break
				case "n":
					className = "dts-new"
					break
			}
		}
		return (
			<React.Fragment key={colIndex}>
				<td className={className}>
					{renderInput(def, row.id, v, colIndex, props.updateCell)}
				</td>
				{def.role === "metric" && <td className={className}>{totalPercV(v, colIndex)}</td>}
			</React.Fragment>
		)
	}

	const totalPercV = (v: number, colIndex: number) => {
		let n = Math.round((v / totalPerc(colIndex)) * 100)
		if (!isFinite(n)) {
			return "-"
		}
		if (n > 100) {
			return ">100%"
		} else if (n < -100) {
			return "<-100%"
		}
		return n + "%"
	}

	const totalPerc = (colIndex: number) => {
		let metricIndex = 0
		for (let [i, def] of props.defs.entries()) {
			if (i == colIndex) {
				return props.totals[metricIndex] as number
			}
			if (def.role == "metric") {
				metricIndex++
			}
		}
		throw new Error("invalid colIndex")
	}

	const renderRowActions = (id: string) => (
		<>
			<button onClick={() => props.copyRow(id)}>Copy</button>
			<button onClick={() => props.deleteRow(id)}>
				<img alt="Delete" src="/assets/icons/trash-alt.svg" />
			</button>
		</>
	)

	const renderAddRow = () => {
		let colCount = columnCount()
		return (
			<tbody key="_end">
				<tr>
					<td colSpan={colCount - 1}></td>
					<td className="dts-table-actions">
						<button onClick={() => props.addRowEnd()}>Add</button>
					</td>
				</tr>
			</tbody>
		)
	}

	return (
		<table className="dts-table dts-editable-table">
			{renderHeader()}
			{renderTotalRow()}
			{renderGroupRows()}
			{renderAddRow()}
		</table>
	)
}

function renderInput(
	def: Def,
	rowId: string,
	value: any,
	colIndex: number,
	updateCell: (rowId: string, colIndex: number, value: any) => void
) {


	switch (def.format) {
		case "enum": {
			let enumDef = def as DefEnum
			return (
				<select
					value={value ?? ""}
					onChange={(e) => updateCell(rowId, colIndex, e.target.value || null)}
				>
					<option key="null" value="">-</option>
					{enumDef.data && enumDef.data.map((option) => (
						<option key={option.key} value={option.key}>
							{option.label}
						</option>
					))}
				</select>
			)
		}
		case "number":
			return (
				<input
					type="text"
					value={value ?? ""}
					onChange={(e) => {
						let v = parseInt(e.target.value, 10)
						updateCell(rowId, colIndex, isNaN(v) ? null : v)
					}}
				/>
			)
		case "date":
			console.log("value", value, toStandardDate(value))
			return (
				<input
					type="date"
					value={toStandardDate(value) ?? ""}
					onChange={(e) => {
						let v = e.target.value
						updateCell(rowId, colIndex, v ? v : null)
					}}
				/>
			)
		default:
			throw "Unknown def type"
	}
}

interface TableActionsProps {
	onSave: () => void
	onRevert: () => void
	addRowStart: () => void
	onClear: () => void
	reSort: () => void
	csvExportUrl: string
	csvImportUrl: string
}

function TableActions(props: TableActionsProps) {
	return (
		<div className="dts-table-actions dts-table-actions-main">
			<button onClick={props.addRowStart}>Add row</button>
			<button onClick={props.reSort}>Resort</button>
			<button onClick={props.onSave}>Save</button>
			<button onClick={props.onClear}>Clear</button>
			<button onClick={props.onRevert}>Revert</button>
			<a href={props.csvExportUrl}>CSV Export</a>
			<a href={props.csvImportUrl}>CSV Import</a>
		</div>
	)
}

interface TableCategoryPresenceProps {
	tblId: HumanEffectsTable
	defs: Def[]
	data: Record<string, any>
}

function TableCategoryPresence(props: TableCategoryPresenceProps) {
	let fetcher = useFetcher()
	const [localData, setLocalData] = useState(props.data)

	useEffect(() => {
		setLocalData(props.data)
	}, [props.data])

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>, key: string) => {
		let newValue = e.target.value === "1" ? true : e.target.value === "0" ? false : null
		setLocalData(prev => ({...prev, [key]: newValue}))
		fetcher.submit(e.target.form)
	}

	return (
		<fetcher.Form method="post">
			<input type="hidden" name="tblId" value={props.tblId} />
			<h3>Category Presence</h3>
			{props.defs.filter(d => d.role == "metric").map(d => {
				let v = localData[d.jsName]
				let vStr = v === true ? "1" : v === false ? "0" : ""
				return (
					<p key={d.jsName}>
						<label>{d.uiName}&nbsp;
							<select
								name={d.jsName}
								value={vStr}
								onChange={e => handleChange(e, d.jsName)}
							>
								<option value="">Not Specified</option>
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</p>
				)
			})}
		</fetcher.Form>
	)
}




