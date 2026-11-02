import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceNav } from "@/components/workspace-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/activity" }));

describe("workspace navigation", () => {
  it("exposes the current route to assistive technology even without a trailing slash", () => {
    render(<WorkspaceNav />);
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });
});
