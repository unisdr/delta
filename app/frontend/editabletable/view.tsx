import {useEffect, useState} from "react"
import {Def, DefEnum} from "~/frontend/editabletable/defs"
import {
	DataWithId,
	DataManager,
	Sort
} from "./data"
import {cloneInstance} from "~/util/object"
import {HumanEffectsTable} from "~/frontend/human_effects/defs";

interface TableProps {
	recordId: string
	table: HumanEffectsTable
	initialIds: string[]
	initialData: any[][]
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

function TableClient(props: TableProps) {

	let [localStorageKey, setLocalStorageKey] = useState(
		"table-" + props.recordId + "-" + props.table
	)

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
		}
		let d = new DataManager()
		d.init(props.defs.length, props.initialData, props.initialIds, previousUpdates)
		console.log("inited table", props.table, props.defs.length)
		return d
	}

	let [data, setData] = useState(() => initDataManager(localStorageKey))

	let [sort, setSort] = useState<Sort>({column: 0, order: "asc"})

	let [childProps, setChildProps] = useState<any>(null)

	useEffect(() => {
		console.log("useEffect, props data changed")
		let key = "table-" + props.recordId + "-" + props.table
		setLocalStorageKey(key)
		setData(initDataManager(key))
	}, [props.defs, props.initialData, props.initialIds, props.recordId, props.table])

	useEffect(() => {
		let dataUpdates = data.getUpdatesForSaving()
		let json = JSON.stringify(dataUpdates)
		localStorage.setItem(localStorageKey, json)
		console.log("saving to", localStorageKey)

		setChildProps({defs: props.defs, data: data})
	}, [data])

	const updateCell = (rowId: string, colIndex: number, value: any) => {
		console.log("updating cell", rowId, colIndex, value)
		data.updateField(rowId, colIndex, value)
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
		console.log("Saving data to server")
		let dataUpdates = data.getUpdatesForSaving()
		let json = JSON.stringify({
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
				throw `Failed to save data: ${res.error.message}`
			}
			console.log("Data successfully saved")
			await reloadData()
		} catch (error) {
			alert("Error saving data:" + error)
		}
	}

	const reloadData = async () => {
		let u = await fetch(
			'./human-effects/load?tbl=' + props.table
		).then(res => res.json())
		let d = new DataManager()
		d.init(u.defs.length, u.data, u.ids)
		d.sortByColumn(sort.column, sort.order)
		setData(d)
	}

	const handleRevert = () => {
		let d = new DataManager()
		d.init(props.defs.length, props.initialData, props.initialIds)
		setData(d)
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

	return (
		<div className="table-container">
			<TableActions onSave={handleSave} onRevert={handleRevert}
				addRowStart={addRowStart}
			/>
			<TableContent
				sort={sort}
				data={childProps.data.applyUpdates()}
				defs={childProps.defs}
				updateCell={updateCell}
				copyRow={copyRow}
				deleteRow={deleteRow}
				toggleColumnSort={toggleColumnSort}
				addRowEnd={addRowEnd}
			/>
		</div>
	)
}

interface TableContentProps {
	data: DataWithId[]
	defs: Def[]
	updateCell: (rowId: string, colIndex: number, value: any) => void
	copyRow: (rowId: string) => void
	deleteRow: (rowId: string) => void
	toggleColumnSort: (colIndex: number) => void
	sort: Sort
	addRowEnd: () => void
}

function TableContent(props: TableContentProps) {

	return (
		<table className="dts-table dts-editable-table">
			<thead>
				<tr>
					<th style={{width: "70px"}}>
					</th>
					{props.defs.map((def, index) => (
						<>
						<th
							style={{width: (def.uiColWidth || 70) + "px"}}
							className={
								props.sort.column === index
									? props.sort.order === "asc"
										? "asc"
										: "desc"
									: ""
							}
							key={index}
						>
							<a
								href="#"
								onClick={e => {
									e.preventDefault()
									props.toggleColumnSort(index)
								}}
							>
								{def.uiName}
							</a>
						</th>
						{def.type == "number" && <th style={{width: "30px"}}>%</th>}
						</>
					))}
					<th style={{width: "100px"}}>
						Actions</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Total</td>
					{props.defs.map((def, colIndex) => {
						return (
							<>
							<td key={colIndex}>
								{def.type == "number" &&
									renderInput(def, "total", "195", colIndex, props.updateCell)}
							</td>
							{def.type == "number" && <td>100%</td>}
							</>
						)
					})}
				</tr>
				{props.data.map((row) => {
					let id = row.id
					let data = row.data
					if (data.length !== props.defs.length) {
						throw new Error(`Row length does not match defs length data ${data.length} defs ${props.defs.length}`)
					}
					return (
						<tr key={id}>
							<td></td>
							{props.defs.map((def, colIndex) => {
								let t = row.from[colIndex]
								let v = row.data[colIndex]
								let className = ""
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
								// todo: this is missing key when number
								return (
									<>
									<td key={colIndex} className={className}>
										{renderInput(def, row.id, v, colIndex, props.updateCell)}
									</td>
									{def.type == "number" && <td>{Math.round(v/195*100)}%</td>}
									</>
								)
							})}
							<td className="dts-table-actions">
								<button
									onClick={() => props.copyRow(id)}

								>Copy
								</button>
								<button
									onClick={() => props.deleteRow(id)}

								>
									<img alt="Delete" src="/assets/icons/trash-alt.svg" />
								</button>
							</td>
						</tr>
					)
				})}
				<tr key="_end">
					{props.defs.map((_, colIndex) => {
						return (
							<td key={colIndex}></td>
						)
					})}
					<td className="dts-table-actions">
						<button onClick={() => props.addRowEnd()}>Add</button>
					</td>
				</tr>
			</tbody>
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
	switch (def.type) {
		case "enum": {
			let enumDef = def as DefEnum
			return (
				<select
					value={value ?? ""}
					onChange={(e) => updateCell(rowId, colIndex, e.target.value || null)}
				>
					<option key="null" value="">-</option>
					{enumDef.data.map((option) => (
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
		default:
			throw "Unknown def type"
	}
}

interface TableActionsProps {
	onSave: () => void
	onRevert: () => void
	addRowStart: () => void
}

function TableActions(props: TableActionsProps) {
	return (
		<div className="dts-table-actions dts-table-actions-main">
			<button onClick={props.addRowStart}>Add row</button>
			<button onClick={props.onSave}>Save</button>
			<button onClick={props.onRevert}>Revert</button>
		</div>
	)
}

