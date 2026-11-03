import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthBoundary } from "@/features/access/auth-boundary";
import { AppearanceProvider } from "@/components/appearance-provider";
import { appearanceScript } from "@/lib/appearance-script";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Whizz Repondly", template: "%s | Whizz Repondly" },
  description: "A focused workspace for customer support performance.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  applicationName: "Whizz Repondly",
  appleWebApp: { capable: true, title: "Repondly", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /></head><body className={geist.variable}><AppearanceProvider><AuthBoundary>{children}</AuthBoundary></AppearanceProvider></body></html>;
}
