import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function renderSelect(onValueChange: (value: string) => void = () => {}) {
  return render(
    <Select defaultValue="b" onValueChange={onValueChange}>
      <SelectTrigger aria-label="Pick a letter">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Alpha</SelectItem>
        <SelectItem value="b">Bravo</SelectItem>
        <SelectItem value="c">Charlie</SelectItem>
      </SelectContent>
    </Select>,
  );
}

describe("Select", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the selected item's label on the trigger without opening", () => {
    renderSelect();

    expect(screen.getByLabelText(/pick a letter/i)).toHaveTextContent("Bravo");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens on click and commits the clicked option", () => {
    const onValueChange = vi.fn();
    renderSelect(onValueChange);

    fireEvent.click(screen.getByLabelText(/pick a letter/i));
    fireEvent.click(screen.getByRole("option", { name: "Charlie" }));

    expect(onValueChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("navigates with the keyboard and commits the highlighted option with Enter", () => {
    const onValueChange = vi.fn();
    renderSelect(onValueChange);

    const trigger = screen.getByLabelText(/pick a letter/i);
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // opens, highlights the current value (Bravo)
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // moves highlight to Charlie
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("c");
  });

  it("closes on Escape without committing a change", () => {
    const onValueChange = vi.fn();
    renderSelect(onValueChange);

    const trigger = screen.getByLabelText(/pick a letter/i);
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // Regression: scrolling a long options list used to bubble up to the outside-scroll
  // handler and close the dropdown mid-scroll.
  it("stays open when the listbox itself is scrolled, and only closes for outside scrolling", () => {
    renderSelect();

    fireEvent.click(screen.getByLabelText(/pick a letter/i));
    const listbox = screen.getByRole("listbox");

    fireEvent.scroll(listbox);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Charlie" })).toBeInTheDocument();

    fireEvent.scroll(document);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
