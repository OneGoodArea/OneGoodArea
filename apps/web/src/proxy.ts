export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/report(.*)",
    "/dashboard(.*)",
    "/compare(.*)",
    "/settings(.*)",
    "/api-usage(.*)",
    "/admin(.*)",
  ],
};
