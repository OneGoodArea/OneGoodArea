/* AR-821: long-running amenities refresh daemon.

   Wraps runAmenitiesRefresh in an infinite loop sleeping sweepIntervalMs
   between sweeps. Entry point for `npm run refresh:amenities:daemon -w
   @onegoodarea/api` (the container + Render worker service). */

import { runAmenitiesRefreshDaemon } from "./amenities";
import { logger } from "../../tracking/structured-logger";

runAmenitiesRefreshDaemon().catch((err) => {
  logger.error("[refresh:amenities:daemon] fatal", err);
  process.exit(1);
});
