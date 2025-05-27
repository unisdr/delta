interface TreeViewProps {
	jsonData: any;
}

export async function _getData() {
    // const resultRows = await dr.select({
	// 	id: divisionTable.id,
    //     parent_id: divisionTable.parentId,
	// 	name: divisionTable.name,
	// }).from(divisionTable)
    // .where(isNull(divisionTable.parentId))
    // .execute();

    // //resultRows.forEach(row => { console.log(`ID: ${row.id}, Name: ${row.name}`); });
    // //console.log(q1);

	// return {resultRows};

    return [
        { id: "1", name: "Pants" },
        { id: "2", name: "Jacket" },
    ]
}


export function TreeView(props: TreeViewProps) {
	return (
		<div className="treeview">
            <p><input type="radio" />tree view</p>

            <button> save </button>
		</div>
	);
}
