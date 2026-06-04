import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://adamklockars.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/tic-tac-toe",
    "/collage",
    "/side-scroller",
    "/flying-pig",
    "/swole-mate",
  ];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
