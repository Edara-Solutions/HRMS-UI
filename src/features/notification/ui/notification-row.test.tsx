import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { act } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { NotificationFeedItem } from "../api/notification-feed";
import { NotificationRow } from "./notification-row";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));

const testI18n = i18next.createInstance();

const LEAD_TITLE = "New lead registered";
const LEAD_BODY = "A new lead joined the pipeline and is ready for review.";

/** Where the row's text block sits in the window, so "above" and "below" are tellable apart. */
const TEXT_BLOCK = { top: 300, bottom: 340, left: 40, right: 340, width: 300, height: 40 };

const leadRow: NotificationFeedItem = {
  id: 1,
  scope: "platform",
  typeKey: "platform.lead-created",
  typeVersion: 1,
  importance: "normal",
  params: {},
  actor: { kind: "system" },
  subject: { type: "lead", publicId: "lead-1" },
  createdAt: new Date().toISOString(),
  seenAt: null,
  readAt: null,
};

/**
 * jsdom performs no layout, so every element reports zero width and an empty rect. Overriding
 * what the tooltip reads is what lets a test say "this line did not fit" and "it opened here".
 */
function withMeasurements(scrollWidth: number, clientWidth: number) {
  for (const [property, value] of [
    ["scrollWidth", scrollWidth],
    ["clientWidth", clientWidth],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, property, { configurable: true, value });
  }

  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      ...TEXT_BLOCK,
      x: TEXT_BLOCK.left,
      y: TEXT_BLOCK.top,
      toJSON: () => TEXT_BLOCK,
    }),
  });
}

function renderRow() {
  return render(
    <I18nextProvider i18n={testI18n}>
      <ul>
        <NotificationRow item={leadRow} state="settled" onActivate={vi.fn()} />
      </ul>
    </I18nextProvider>,
  );
}

/** The tooltip waits out a pointer passing through before it opens. */
function hover(element: HTMLElement) {
  fireEvent.pointerEnter(element);
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

describe("NotificationRow", () => {
  beforeAll(async () => {
    await testI18n.init({
      lng: "en",
      fallbackLng: "en",
      ns: ["notification"],
      defaultNS: "notification",
      keySeparator: false,
      interpolation: { escapeValue: false },
      resources: {
        en: {
          notification: JSON.parse(readFileSync("public/locales/en/notification.json", "utf8")),
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    for (const property of ["scrollWidth", "clientWidth"]) {
      Object.defineProperty(HTMLElement.prototype, property, { configurable: true, value: 0 });
    }
  });

  it("shows the whole notification on hover when the row clipped it", () => {
    vi.useFakeTimers();
    withMeasurements(420, 200);
    renderRow();

    hover(screen.getByText(LEAD_TITLE).parentElement as HTMLElement);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(LEAD_TITLE);
    expect(tooltip).toHaveTextContent(LEAD_BODY);
  });

  it("opens the tooltip below the notification, never over it", () => {
    vi.useFakeTimers();
    withMeasurements(420, 200);
    renderRow();

    hover(screen.getByText(LEAD_TITLE).parentElement as HTMLElement);

    expect(screen.getByRole("tooltip")).toHaveStyle({ top: `${TEXT_BLOCK.bottom + 6}px` });
  });

  it("stays silent when the whole notification is already on screen", () => {
    vi.useFakeTimers();
    withMeasurements(200, 200);
    renderRow();

    hover(screen.getByText(LEAD_TITLE).parentElement as HTMLElement);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("puts the notification away again when the pointer leaves", () => {
    vi.useFakeTimers();
    withMeasurements(420, 200);
    renderRow();

    const trigger = screen.getByText(LEAD_TITLE).parentElement as HTMLElement;
    hover(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.pointerLeave(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
