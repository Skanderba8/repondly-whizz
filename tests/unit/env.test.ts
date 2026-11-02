import { describe, expect, it } from "vitest";
import { parsePublicEnvironment } from "@/lib/env";

describe("public Supabase configuration", () => {
  it("accepts an HTTPS URL and publishable key", () => {
    const input = { url: "https://example.supabase.co", publishableKey: "sb_publishable_synthetic" };
    expect(parsePublicEnvironment(input)).toEqual(input);
  });

  it.each([
    {},
    { url: "https://example.supabase.co", publishableKey: "" },
    { url: "http://example.supabase.co", publishableKey: "sb_publishable_synthetic" },
    { url: "https://example.supabase.co", publishableKey: "sb_secret_do_not_expose" },
  ])("rejects missing, insecure, or privileged configuration without echoing it", (input) => {
    expect(() => parsePublicEnvironment(input)).toThrow("Set a valid Supabase HTTPS URL and publishable key");
    try {
      parsePublicEnvironment(input);
    } catch (error) {
      expect(String(error)).not.toContain("sb_secret_do_not_expose");
    }
  });
});
