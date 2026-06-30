import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  it("returns focus to the trigger when the dialog closes", () => {
    render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
