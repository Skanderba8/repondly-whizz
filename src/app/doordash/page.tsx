import type { Metadata } from "next";
import { BonusPage } from "@/features/tracker/bonus-form";

export const metadata: Metadata = { title: "DoorDash" };

export default function DoorDashPage() {
  return <BonusPage kind="doordash" />;
}
