import {
	missingTable,
	injuredTable,
	deathsTable,
	affectedTable,
	displacedTable,
	humanCategoryPresenceTable,
} from "~/drizzle/schema";

export const affectedTablesAndCols = [
	{
		code: "deaths",
		table: deathsTable,
		col: deathsTable.deaths,
		presenceCol: humanCategoryPresenceTable.deaths,
		presenceTotalCol: humanCategoryPresenceTable.deathsTotal
	},
	{
		code: "injured",
		table: injuredTable,
		col: injuredTable.injured,
		presenceCol: humanCategoryPresenceTable.injured,
		presenceTotalCol: humanCategoryPresenceTable.injuredTotal
	},
	{
		code: "missing",
		table: missingTable,
		col: missingTable.missing,
		presenceCol: humanCategoryPresenceTable.missing,
		presenceTotalCol: humanCategoryPresenceTable.missingTotal
	},
	{
		code: "directlyAffected",
		table: affectedTable,
		col: affectedTable.direct,
		presenceCol: humanCategoryPresenceTable.affectedDirect,
		presenceTotalCol: humanCategoryPresenceTable.affectedDirectTotal
	},
	{
		code: "indirectlyAffected",
		table: affectedTable,
		col: affectedTable.indirect,
		presenceCol: humanCategoryPresenceTable.affectedIndirect,
		presenceTotalCol: humanCategoryPresenceTable.affectedIndirectTotal
	},
	{
		code: "displaced",
		table: displacedTable,
		col: displacedTable.displaced,
		presenceCol: humanCategoryPresenceTable.displaced,
		presenceTotalCol: humanCategoryPresenceTable.displacedTotal
	},
] as const
