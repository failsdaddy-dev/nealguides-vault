import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Inter } from "next/font/google";
import { APP_NAME, APPLE_ICON, FAVICON_192, FAVICON_32 } from "@/lib/brand";
import "./globals.css";

// Fonts (both SIL Open Font License 1.1). next/font downloads them at build
// time and serves them from this app, so browsers make no request to Google.
//   Barlow Semi Condensed: headings (condensed caps echo the NEALGUIDES wordmark)
//   Inter: body and interface text
const heading = Barlow_Semi_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Private asset library for Neal Guides' video editors.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  icons: {
    icon: [
      { url: FAVICON_32, sizes: "32x32", type: "image/png" },
      { url: FAVICON_192, sizes: "192x192", type: "image/png" },
    ],
    apple: APPLE_ICON,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a17",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
