import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransitionForm } from "./transition-form";

afterEach(cleanup);
describe("trial extension date ordering", () => {
  it.each([
    { offset: "+02:00", shift: 1, accepted: true },
    { offset: "-02:00", shift: -1, accepted: false },
  ])("compares instants when the existing expiry has $offset", ({ offset, shift, accepted }) => {
    const from = "2026-10-10T10:00";
    const instant = new Date(from);
    // An offset can reverse the lexical ordering of otherwise valid contract timestamps.
    const minimumDate = new Date(instant.getTime() + shift * 3_600_000)
      .toISOString()
      .replace("Z", offset);
    const request = vi.fn();
    render(
      <TransitionForm
        kind="extendTrial"
        disabled={false}
        request={request}
        minimumDate={minimumDate}
      />,
    );
    fireEvent.change(screen.getByLabelText("Trial end"), { target: { value: from } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Support extension" } });
    fireEvent.click(screen.getByRole("button", { name: "Extend trial" }));
    if (accepted)
      expect(request).toHaveBeenCalledWith({
        command: "extendTrial",
        body: { trialEndDate: instant.toISOString(), reason: "Support extension" },
      });
    else {
      expect(request).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    }
  });
});
