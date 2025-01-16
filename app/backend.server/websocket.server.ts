import { WebSocketServer } from "ws";
import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import { eventTable, disasterEventTable } from "~/drizzle/schema";

/**
 * Starts a WebSocket server on the specified port.
 * @param port - The port number on which to start the WebSocket server.
 */
export function startWebSocketServer(port: number) {
  const wss = new WebSocketServer({ port });

  console.log(`WebSocket Server started on ws://localhost:${port}`);

  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");

    // Handle incoming messages from clients
    ws.on("message", (message) => {
      console.log(`Received message: ${message}`);
    });

    const fetchData = async () => {
      try {
        const [events, damage, losses, recovery, eventsOverTime, damageOverTime, lossesOverTime, recoveryOverTime] = await Promise.all([
          dr.select({ count: sql`COUNT(*)` }).from(eventTable),
          dr.select({ damage: sql`SUM(effects_total_usd)` }).from(disasterEventTable),
          dr.select({ losses: sql`SUM(subtotal_losses_usd)` }).from(disasterEventTable),
          dr.select({ recovery: sql`SUM(recovery_needs_total_usd)` }).from(disasterEventTable),
          dr.execute(
            sql`SELECT EXTRACT(YEAR FROM start_date_utc) as year, COUNT(*) as count FROM ${eventTable} GROUP BY year`
          ),
          dr.execute(
            sql`SELECT EXTRACT(YEAR FROM start_date_utc) as year, SUM(effects_total_usd) as value FROM ${disasterEventTable} GROUP BY year`
          ),
          dr.execute(
            sql`SELECT EXTRACT(YEAR FROM start_date_utc) as year, SUM(subtotal_losses_usd) as value FROM ${disasterEventTable} GROUP BY year`
          ),
          dr.execute(
            sql`SELECT EXTRACT(YEAR FROM start_date_utc) as year, SUM(recovery_needs_total_usd) as value FROM ${disasterEventTable} GROUP BY year`
          ),
        ]);

        ws.send(
          JSON.stringify({
            events: events[0]?.count || 0,
            eventsOverTime: eventsOverTime.rows,
            damage: damage[0]?.damage || 0,
            damageOverTime: damageOverTime.rows,
            losses: losses[0]?.losses || 0,
            lossesOverTime: lossesOverTime.rows,
            recovery: recovery[0]?.recovery || 0,
            recoveryOverTime: recoveryOverTime.rows,
          })
        );
      } catch (error) {
        console.error("Error fetching data from the database:", error);
      }
    };

    const interval = setInterval(fetchData, 10000);

    // Clear interval when the client disconnects
    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
      clearInterval(interval);
    });

    // Handle connection errors
    ws.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
      clearInterval(interval);
    });
  });

  // Handle server errors
  wss.on("error", (error: Error) => {
    console.error("WebSocket Server error:", error);
  });
}