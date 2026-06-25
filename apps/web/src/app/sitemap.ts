import type { MetadataRoute } from "next";

const AREA_SLUGS = [
  "london",
  "manchester",
  "cardiff",
  "liverpool",
  "glasgow",
  "belfast",
  "edinburgh",
  "birmingham",
  "leeds",
  "bristol",
  "sheffield",
  "nottingham",
  "brighton",
  "southampton",
  "portsmouth",
  "reading",
  "bath",
  "exeter",
  "plymouth",
  "cambridge",
  "norwich",
  "leicester",
  "derby",
  "wolverhampton",
  "preston",
  "newcastle",
  "sunderland",
  "hull",
  "york",
  "swansea",
  "coventry",
  "stoke",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.onegoodarea.com";

  const areaPages: MetadataRoute.Sitemap = AREA_SLUGS.map((slug) => ({
    url: `${baseUrl}/area/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...areaPages,
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/business`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
