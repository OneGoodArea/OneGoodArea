import { AppLoader } from "../_shared/loading-states";

/* Next.js renders this for ANY route under /dashboard/* during route
   transitions (loading.tsx cascades into nested segments). The old copy
   ("Dashboard" + "Loading reports") flashed the legacy reports name on
   every navigation between sub-pages. Title dropped to match the new
   no-AppShell-title pattern on Home + product pages; label is a neutral
   one-word pulse. */
export default function DashboardLoading() {
  return <AppLoader label="Loading" />;
}
