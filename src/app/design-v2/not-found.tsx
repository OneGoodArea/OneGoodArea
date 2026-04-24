import NotFoundClient from "./404/client";

/* Next.js convention · this fires for any notFound() inside /design-v2/*
   (e.g. a /design-v2/report/unknown-id lookup fail) and for any route
   that doesn't match. Falls back on the v2 404 display. */

export default function DesignV2NotFound() {
  return <NotFoundClient />;
}
