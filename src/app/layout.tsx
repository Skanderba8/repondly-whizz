import type { Metadata } from "next";
import "./globals.css";
import { AuthBoundary } from "@/features/access/auth-boundary";

export const metadata: Metadata = {
  title: { default: "Whizz Repondly", template: "%s | Whizz Repondly" },
  description: "A focused workspace for customer support performance.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthBoundary>{children}</AuthBoundary></body></html>;
}
