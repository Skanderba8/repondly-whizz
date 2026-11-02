import { describe, expect, it } from "vitest";
import { periodRange } from "@/features/tracker/domain";

describe("work-date reporting periods", () => {
  it("keeps Saturday in the week that began the previous Sunday", () => {
    expect(periodRange("2026-10-31", "week")).toEqual({ start: "2026-10-25", end: "2026-10-31" });
  });
  it("starts a new week on Sunday even when its report arrives Monday", () => {
    expect(periodRange("2026-11-01", "week")).toEqual({ start: "2026-11-01", end: "2026-11-07" });
  });
  it("uses calendar months rather than four-week windows", () => {
    expect(periodRange("2026-11-30", "month")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(periodRange("2028-02-29", "month")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(periodRange("2026-12-31", "month")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
});
