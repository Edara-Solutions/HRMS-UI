import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type ToastRequest, useToastStore } from "../model/toast-store";
import { NotificationToaster } from "./notification-toaster";

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock, post: apiPostMock },
}));

const testI18n = i18next.createInstance();

const infoToast: ToastRequest = { typeKey: "platform.lead-created" };
const successToast: ToastRequest = {
  typeKey: "company.role-assigned",
  params: { roleName: "Payroll Manager" },
};
const warningToast: ToastRequest = { typeKey: "platform.conversion-requested" };
const dangerToast: ToastRequest = { ...infoToast, tone: "danger" };

/** The exit motion runs before the toast leaves the stack, so every removal costs 120ms more. */
const EXIT_MS = 120;

function renderToaster() {
  return render(
    <I18nextProvider i18n={testI18n}>
      <NotificationToaster />
    </I18nextProvider>,
  );
}

function showToast(request: ToastRequest) {
  act(() => useToastStore.getState().showToast(request));
}

function advanceBy(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/**
 * Two ticks, not one: the expiring toast re-renders before it schedules its exit motion, so a
 * single `advanceTimersByTime` spanning both would run past the exit timer before it exists.
 */
function advanceToRemoval(ms: number) {
  advanceBy(ms);
  advanceBy(EXIT_MS);
}

function toastStack() {
  return screen.getByRole("list");
}

describe("NotificationToaster", () => {
  beforeAll(async () => {
    await testI18n.init({
      lng: "en",
      fallbackLng: "en",
      ns: ["notification"],
      defaultNS: "notification",
      interpolation: { escapeValue: false },
      resources: {
        en: {
          notification: JSON.parse(readFileSync("public/locales/en/notification.json", "utf8")),
        },
      },
    });
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [], earlierCount: 0 });
  });

  it("announces arrivals through a polite live region and labels the dismiss control", () => {
    renderToaster();
    showToast(infoToast);

    expect(screen.getByRole("region", { name: "Recent notifications" })).toBeInTheDocument();
    expect(toastStack()).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("New lead registered")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });

  it("dismisses info and success toasts after 5s", () => {
    renderToaster();
    showToast(infoToast);
    showToast(successToast);

    advanceBy(4_999);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    advanceToRemoval(1);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("holds a warning toast for 7s", () => {
    renderToaster();
    showToast(warningToast);

    advanceBy(6_999);
    expect(screen.getByText("Conversion request submitted")).toBeInTheDocument();

    advanceToRemoval(1);
    expect(screen.queryByText("Conversion request submitted")).not.toBeInTheDocument();
  });

  it("keeps a danger toast until it is dismissed by hand", () => {
    renderToaster();
    showToast(dangerToast);

    advanceBy(60_000);
    expect(screen.getByText("New lead registered")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    advanceBy(EXIT_MS);

    expect(screen.queryByText("New lead registered")).not.toBeInTheDocument();
  });

  it("shows at most three toasts and folds the rest into the earlier pill", () => {
    renderToaster();

    for (let index = 0; index < 5; index += 1) {
      showToast(warningToast);
    }

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("+2 earlier")).toBeInTheDocument();
  });

  it("drops the earlier pill once the stack has emptied", () => {
    renderToaster();

    for (let index = 0; index < 4; index += 1) {
      showToast(infoToast);
    }

    expect(screen.getByText("+1 earlier")).toBeInTheDocument();

    advanceToRemoval(5_000);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText("+1 earlier")).not.toBeInTheDocument();
  });

  it("pauses the dismiss clock while the pointer rests on the stack", () => {
    renderToaster();
    showToast(infoToast);

    advanceBy(3_000);
    fireEvent.pointerOver(toastStack());

    advanceBy(30_000);
    expect(screen.getByText("New lead registered")).toBeInTheDocument();

    fireEvent.pointerOut(toastStack());

    advanceBy(1_900);
    expect(screen.getByText("New lead registered")).toBeInTheDocument();

    advanceToRemoval(100);
    expect(screen.queryByText("New lead registered")).not.toBeInTheDocument();
  });

  it("dismisses without touching the server — dismiss is not read", () => {
    renderToaster();
    showToast(infoToast);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    advanceBy(EXIT_MS);

    expect(apiGetMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("ignores a type key the catalog mirror does not know", () => {
    renderToaster();
    showToast({ typeKey: "platform.not-in-the-mirror" });

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
