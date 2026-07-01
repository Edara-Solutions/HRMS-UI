import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogTitle, useDialogIds } from "./dialog";

afterEach(cleanup);

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const { titleId } = useDialogIds();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} titleId={titleId}>
        <DialogTitle id={titleId}>Settings</DialogTitle>
      </Dialog>
    </>
  );
}

describe("Dialog focus management", () => {
  it("returns focus to the trigger when the dialog closes", async () => {
    render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    // Focus returns to the trigger immediately; the panel itself stays mounted
    // briefly to play its exit transition before unmounting.
    expect(trigger).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
