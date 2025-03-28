import {
	missingTable,
	injuredTable,
	deathsTable,
	affectedTable,
	displacedTable,
	humanCategoryPresenceTable,
} from "~/drizzle/schema";

export const affectedTablesAndCols = [
	{code: "deaths", table: deathsTable, col: deathsTable.deaths, presenceCol: humanCategoryPresenceTable.deaths},
	{code: "injured", table: injuredTable, col: injuredTable.injured, presenceCol: humanCategoryPresenceTable.injured},
	{code: "missing", table: missingTable, col: missingTable.missing, presenceCol: humanCategoryPresenceTable.missing},
	{code: "directlyAffected", table: affectedTable, col: affectedTable.direct, presenceCol: humanCategoryPresenceTable.affectedDirect},
	{code: "indirectlyAffected", table: affectedTable, col: affectedTable.indirect, presenceCol: humanCategoryPresenceTable.affectedIndirect},
	{code: "displaced", table: displacedTable, col: displacedTable.displaced, presenceCol: humanCategoryPresenceTable.displaced},
] as const
