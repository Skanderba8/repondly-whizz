import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthBoundary } from "@/features/access/auth-boundary";
import { AppearanceProvider } from "@/components/appearance-provider";
import { appearanceScript } from "@/lib/appearance-script";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Whizz Repondly", template: "%s | Whizz Repondly" },
  description: "A focused workspace for customer support performance.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /></head><body className={geist.variable}><AppearanceProvider><AuthBoundary>{children}</AuthBoundary></AppearanceProvider></body></html>;
}
