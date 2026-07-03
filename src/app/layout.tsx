import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheRaw — Self-Hosted Raw File Storage & CDN API | Cloudflare R2",
  description: "A blazing-fast, self-hosted file hosting platform powered by Cloudflare R2. Upload, manage, and serve raw files instantly through clean API endpoints — like your own private GitHub Raw + S3, with zero egress fees.",
  keywords: ["raw file hosting", "cloudflare r2", "self-hosted cdn", "file storage api", "raw url", "asset hosting", "next.js file manager"],
  openGraph: {
    title: "TheRaw — Self-Hosted Raw File Storage & CDN API",
    description: "Upload, manage, and serve raw files instantly through clean API endpoints. Powered by Cloudflare R2 with zero egress fees.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
