import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gmc-surabaya.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/katalog", "/blog", "/kontak", "/pengiriman-garansi", "/lacak"],
        disallow: ["/admin", "/admin/*", "/checkout"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
