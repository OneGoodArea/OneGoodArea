import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/settings", "/compare", "/verify", "/forgot-password", "/reset-password", "/api-usage"],
      },
    ],
    sitemap: "https://www.onegoodarea.com/sitemap.xml",
  };
}
