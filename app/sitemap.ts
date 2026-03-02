import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/videos", "/simulador", "/campanias", "/admin"];
  const now = new Date();
  return routes.map((p) => ({
    url: `${SITE.url}${p}`,
    lastModified: now
  }));
}
