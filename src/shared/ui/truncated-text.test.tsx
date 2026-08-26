import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TruncatedText } from "./truncated-text";

const IDENTIFIER = "550e8400-e29b-41d4-a716-446655440000";

/**
 * jsdom performs no layout, so every element reports zero width. Overriding the two
 * measurements the component reads is what lets a test say "this line did not fit".
 */
function withMeasurements(scrollWidth: number, clientWidth: number) {
  for (const [property, value] of [
    ["scrollWidth", scrollWidth],
    ["clientWidth", clientWidth],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, property, { configurable: true, value });
  }
}

afterEach(() => {
  cleanup();
  for (const property of ["scrollWidth", "clientWidth"]) {
    Object.defineProperty(HTMLElement.prototype, property, { configurable: true, value: 0 });
  }
});

describe("TruncatedText", () => {
  it("offers the whole value when the line was cut to fit", () => {
    withMeasurements(420, 200);
    render(<TruncatedText text={IDENTIFIER} />);
    const line = screen.getByText(IDENTIFIER);

    fireEvent.focus(line);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(IDENTIFIER);
    expect(line.parentElement).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("stays silent when the whole value is already on screen", () => {
    withMeasurements(200, 200);
    render(<TruncatedText text="Layla Hassan" />);

    fireEvent.focus(screen.getByText("Layla Hassan"));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("takes a tab stop only when it has something more to say", () => {
    withMeasurements(420, 200);
    const { rerender } = render(<TruncatedText text={IDENTIFIER} />);
    expect(screen.getByText(IDENTIFIER).parentElement).toHaveAttribute("tabindex", "0");

    withMeasurements(200, 200);
    rerender(<TruncatedText text="Layla Hassan" />);
    expect(screen.getByText("Layla Hassan").parentElement).not.toHaveAttribute("tabindex");
  });

  it("adds no tab stop inside a control that already has one", () => {
    withMeasurements(420, 200);
    render(
      <button type="button">
        <TruncatedText text={IDENTIFIER} focusable={false} />
      </button>,
    );

    expect(screen.getByText(IDENTIFIER).parentElement).not.toHaveAttribute("tabindex");
  });

  it("puts the value away again when the reader leaves", () => {
    withMeasurements(420, 200);
    render(<TruncatedText text={IDENTIFIER} />);
    const line = screen.getByText(IDENTIFIER);

    fireEvent.focus(line);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(line);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
