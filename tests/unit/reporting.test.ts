import { describe, expect, it } from "vitest";
import { availableRange, chartBucket, comparisonScale, presetRange, reportingRangeSchema } from "@/features/tracker/reporting";

describe("unified reporting dates", () => {
  it("opens month to date and keeps prior months on their calendar boundaries", () => {
    expect(presetRange("month", "2026-11-02")).toEqual({ start: "2026-11-01", end: "2026-11-02" });
    expect(presetRange("last-month", "2027-01-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    expect(presetRange("last-month", "2028-03-01")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(presetRange("week", "2026-11-01")).toEqual({ start: "2026-11-01", end: "2026-11-01" });

  });
  it("rejects reversed dates, nonexistent dates, and unbounded custom spans", () => {
    expect(reportingRangeSchema.safeParse({ start: "2026-11-02", end: "2026-11-01" }).success).toBe(false);
    expect(reportingRangeSchema.safeParse({ start: "2026-02-30", end: "2026-03-01" }).success).toBe(false);
    expect(reportingRangeSchema.safeParse({ start: "2000-01-01", end: "2026-11-02" }).success).toBe(false);
    expect(reportingRangeSchema.safeParse({ start: "2026-07-01", end: "2026-11-02" }).success).toBe(true);
  });
  it("uses inclusive length for readable chart buckets", () => {
    expect(chartBucket({ start: "2026-07-01", end: "2026-07-31" })).toBe("day");
    expect(chartBucket({ start: "2026-07-01", end: "2026-08-01" })).toBe("week");
    expect(chartBucket({ start: "2026-01-01", end: "2026-06-29" })).toBe("week");
    expect(chartBucket({ start: "2026-01-01", end: "2026-06-30" })).toBe("month");
  });
  it("offers real available history even when an account has only manual entries", () => {
    expect(availableRange({ first_report: null, last_report: null, first_entry: "2026-08-01", last_entry: "2026-09-02", last_import: null, last_source_sent: null })).toEqual({ start: "2026-08-01", end: "2026-09-02" });
    expect(availableRange({ first_report: null, last_report: null, first_entry: null, last_entry: null, last_import: null, last_source_sent: null })).toBeNull();
  });
});

describe("manager comparison scale", () => {
  it("rescales former leaders when someone overtakes them", () => {
    expect(comparisonScale(1, [1, 10])).toEqual({ percent: 10, leader: false });
    expect(comparisonScale(10, [1, 10])).toEqual({ percent: 100, leader: true });
    expect(comparisonScale(10, [1, 10, 20])).toEqual({ percent: 50, leader: false });
  });
  it("crowns positive ties and never crowns zero or unknown values", () => {
    expect(comparisonScale(10, [10, 10, null]).leader).toBe(true);
    expect(comparisonScale(0, [0, null])).toEqual({ percent: 0, leader: false });
    expect(comparisonScale(null, [10, null])).toEqual({ percent: 0, leader: false });
  });
});

