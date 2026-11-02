import type { Metadata } from "next";
import { BonusPage } from "@/features/tracker/bonus-form";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return <BonusPage kind="review" />;
}
