// TODO: for tests
// import 'dotenv/config';

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "~/drizzle/schema";

import { eq } from "drizzle-orm";

import {
  disasterEventTable,
  hazardEventTable,
  disasterRecordsTable,
} from "~/drizzle/schema";
import {
  sectorEventRelationTable,
  sectorHazardRelationTable,
  sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";

export type Dr = NodePgDatabase<typeof schema> & { $client: any };

export type Tx =
  | (Parameters<(typeof dr)["transaction"]>[0] extends (tx: infer T) => any
      ? T
      : never)
  | Dr;

export let dr: Dr;
let pool: any;

export function initDB() {
  if (!process.env.DATABASE_URL) {
    throw "DATABASE_URL missing";
  }
  dr = drizzle(process.env.DATABASE_URL!, {
    logger: false,
    schema,
  });
  pool = dr.$client;
  if (!dr) {
    throw "failed to init database";
  }
}

export function endDB() {
  pool.end();
}

// Calls the initialization at the start of the module to ensure database connectivity
initDB();

// Automatically links a sector to a disaster event when a new disaster event is inserted.
async function insertDisasterEventWithRelations(values: {
  sectorId?: number;
  id: string;
  hazardEventId: string;
  [key: string]: any;
}) {
  try {
    const { sectorId, ...restValues } = values;

    // Ensure sectorId is defined or handle it accordingly
    if (sectorId === undefined) {
      throw new Error("sectorId is required");
    }

    // Insert the disaster event and get the returned ID
    const result = await dr
      .insert(disasterEventTable)
      .values({ ...restValues, sectorId })
      .returning({ id: disasterEventTable.id });
    const disasterEventId = result[0].id;

    if (disasterEventId) {
      // Insert the relation in sectorEventRelationTable
      await dr.insert(sectorEventRelationTable).values({
        sectorId,
        disasterEventId,
      });
      console.log(
        `Auto-linked Sector ${sectorId} to Disaster Event ${disasterEventId}`
      );
    }
  } catch (error) {
    console.error(
      `Error inserting disaster event with id ${values.id} and auto-linking sectorId ${values.sectorId}:`,
      error
    );
  }
}

// Automatically links a sector to a hazard event when a new hazard event is inserted.
async function insertHazardEventWithRelations(values: {
  sectorId?: number;
  id: string;
  hazardId: string;
  [key: string]: any;
}) {
  try {
    const { sectorId, ...restValues } = values;

    // Ensure sectorId is defined or handle it accordingly
    if (sectorId === undefined) {
      throw new Error("sectorId is required");
    }

    // Insert the hazard event and get the returned ID
    const result = await dr
      .insert(hazardEventTable)
      .values({ ...restValues, sectorId })
      .returning({ id: hazardEventTable.id });
    const hazardEventId = result[0].id;

    if (hazardEventId) {
      // Insert the relation in sectorHazardRelationTable
      await dr.insert(sectorHazardRelationTable).values({
        sectorId,
        hazardEventId,
      });
      console.log(
        `Auto-linked Sector ${sectorId} to Hazard Event ${hazardEventId}`
      );
    }
  } catch (error) {
    console.error(
      `Error inserting hazard event with id ${values.id} and auto-linking sectorId ${values.sectorId}:`,
      error
    );
  }
}

// Automatically links a sector to a disaster record when a new disaster record is inserted.
async function insertDisasterRecordWithRelations(values: {
  sectorId?: number;
  id: string;
  disasterEventId: string;
  [key: string]: any;
}) {
  try {
    // Insert the disaster record and get the returned ID
    const result = await dr
      .insert(disasterRecordsTable)
      .values(values)
      .returning({ id: disasterRecordsTable.id });
    const disasterRecordId = result[0].id;

    if (values.sectorId && disasterRecordId) {
      // Insert the relation in sectorDisasterRecordsRelationTable
      await dr.insert(sectorDisasterRecordsRelationTable).values({
        sectorId: values.sectorId,
        disasterRecordId,
      });
      console.log(
        `Auto-linked Sector ${values.sectorId} to Disaster Record ${disasterRecordId}`
      );
    }
  } catch (error) {
    console.error(
      "Error inserting disaster record and auto-linking sector:",
      error
    );
  }
}

// Update functions
async function updateDisasterEventWithRelations(values: {
  sectorId?: number;
  id: string;
  hazardEventId: string;
  [key: string]: any;
}) {
  try {
    // Update the disaster event
    await dr
      .update(disasterEventTable)
      .set(values)
      .where(eq(disasterEventTable.id, values.id));

    // Update the relation in sectorEventRelationTable
    if (values.sectorId) {
      await dr
        .update(sectorEventRelationTable)
        .set({ sectorId: values.sectorId })
        .where(eq(sectorEventRelationTable.disasterEventId, values.id));
      console.log(`Updated sector relation for Disaster Event ${values.id}`);
    }
  } catch (error) {
    console.error(
      "Error updating disaster event and auto-linking sector:",
      error
    );
  }
}

async function updateHazardEventWithRelations(values: {
  sectorId?: number;
  id: string;
  hazardId: string;
  [key: string]: any;
}) {
  try {
    // Update the hazard event
    await dr
      .update(hazardEventTable)
      .set(values)
      .where(eq(hazardEventTable.id, values.id));

    // Update the relation in sectorHazardRelationTable
    if (values.sectorId) {
      await dr
        .update(sectorHazardRelationTable)
        .set({ sectorId: values.sectorId })
        .where(eq(sectorHazardRelationTable.hazardEventId, values.id));
      console.log(`Updated sector relation for Hazard Event ${values.id}`);
    }
  } catch (error) {
    console.error(
      "Error updating hazard event and auto-linking sector:",
      error
    );
  }
}

async function updateDisasterRecordWithRelations(values: {
  sectorId?: number;
  id: string;
  disasterEventId: string;
  [key: string]: any;
}) {
  try {
    // Update the disaster record
    await dr
      .update(disasterRecordsTable)
      .set(values)
      .where(eq(disasterRecordsTable.id, values.id));

    // Update the relation in sectorDisasterRecordsRelationTable
    if (values.sectorId) {
      await dr
        .update(sectorDisasterRecordsRelationTable)
        .set({ sectorId: values.sectorId })
        .where(
          eq(sectorDisasterRecordsRelationTable.disasterRecordId, values.id)
        );
      console.log(`Updated sector relation for Disaster Record ${values.id}`);
    }
  } catch (error) {
    console.error(
      "Error updating disaster record and auto-linking sector:",
      error
    );
  }
}

// Delete functions
async function deleteDisasterEventWithRelations(id: string) {
  try {
    // Delete the disaster event
    await dr.delete(disasterEventTable).where(eq(disasterEventTable.id, id));

    // Delete the relation in sectorEventRelationTable
    await dr
      .delete(sectorEventRelationTable)
      .where(eq(sectorEventRelationTable.disasterEventId, id));
    console.log(`Deleted sector relation for Disaster Event ${id}`);
  } catch (error) {
    console.error(
      "Error deleting disaster event and auto-linking sector:",
      error
    );
  }
}

async function deleteHazardEventWithRelations(id: string) {
  try {
    // Delete the hazard event
    await dr.delete(hazardEventTable).where(eq(hazardEventTable.id, id));

    // Delete the relation in sectorHazardRelationTable
    await dr
      .delete(sectorHazardRelationTable)
      .where(eq(sectorHazardRelationTable.hazardEventId, id));
    console.log(`Deleted sector relation for Hazard Event ${id}`);
  } catch (error) {
    console.error(
      "Error deleting hazard event and auto-linking sector:",
      error
    );
  }
}

async function deleteDisasterRecordWithRelations(id: string) {
  try {
    // Delete the disaster record
    await dr
      .delete(disasterRecordsTable)
      .where(eq(disasterRecordsTable.id, id));

    // Delete the relation in sectorDisasterRecordsRelationTable
    await dr
      .delete(sectorDisasterRecordsRelationTable)
      .where(eq(sectorDisasterRecordsRelationTable.disasterRecordId, id));
    console.log(`Deleted sector relation for Disaster Record ${id}`);
  } catch (error) {
    console.error(
      "Error deleting disaster record and auto-linking sector:",
      error
    );
  }
}
