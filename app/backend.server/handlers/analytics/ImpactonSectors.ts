import { fetchSectorImpactData } from "~/backend.server/models/analytics/ImpactonSectors";

interface TimeSeriesRow {
  year: number;
  damage: number;
  loss: number;
}

export const getImpactOnSector = async (sectorId: number) => {
  try {
    // Fetch the sector impact data
    const { eventCount, totalDamage, totalLoss, timeSeries } =
      await fetchSectorImpactData(sectorId);

    // Transform the time series data for charts
    const eventsOverTime = timeSeries.map((row: TimeSeriesRow) => ({
      year: row.year,
      count: row.damage + row.loss, // Aggregate damage and loss
    }));

    const damageOverTime = timeSeries.map((row: TimeSeriesRow) => ({
      year: row.year,
      amount: row.damage,
    }));

    const lossOverTime = timeSeries.map((row: TimeSeriesRow) => ({
      year: row.year,
      amount: row.loss,
    }));

    // Return the transformed data
    return {
      eventCount,
      totalDamage,
      totalLoss,
      eventsOverTime,
      damageOverTime,
      lossOverTime,
    };
  } catch (error) {
    console.error("Error fetching sector impact data:", error);
    throw new Error("Failed to fetch sector impact data");
  }
};
