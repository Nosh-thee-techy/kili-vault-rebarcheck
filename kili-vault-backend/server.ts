/**
 * Kili-Vault: Earth Observation & Model Training Backend Server
 * High-performance Express API for Sentinel-2 detection & automated training.
 */
import app from "./src/app.js";
import db from "./src/repositories/db.js";
import logger from "./src/utils/logger.js";

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || "0.0.0.0";

  const server = app.listen(PORT, HOST, () => {
    logger.info(
      `Kili-Vault Earth Observation & Model Training engine running on http://${HOST}:${PORT}`,
      {
        env: process.env.NODE_ENV || "development",
        aoi: "Kilimani Ward, Nairobi",
        api_base: "/api/v1",
      },
    );
    console.log(
      `\n==================================================================`,
    );
    console.log(
      `>>> Kili-Vault Earth Observation & Model Training Engine [LIVE] <<<`,
    );
    console.log(`- Service Dashboard:  http://${HOST}:${PORT}/`);
    console.log(`- API Specification:  http://${HOST}:${PORT}/api`);
    console.log(`- Health Check:       http://${HOST}:${PORT}/health`);
    console.log(
      `- Model Status:       http://${HOST}:${PORT}/api/v1/models/status`,
    );
    console.log(
      `- Detections Feed:    http://${HOST}:${PORT}/api/v1/detections`,
    );
    console.log(
      `- GeoJSON Feed:       http://${HOST}:${PORT}/api/v1/detections/geojson`,
    );
    console.log(
      `==================================================================\n`,
    );
  });

  // Graceful shutdown
  let isShuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await db.closePool();
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error("Failed to boot Kili-Vault server", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
