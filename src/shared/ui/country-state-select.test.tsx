import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountrySelect } from "@/shared/ui/country-select";
import { StateSelect } from "@/shared/ui/state-select";

const locationDataMocks = vi.hoisted(() => ({
  loadCountries: vi.fn(),
  loadStates: vi.fn(),
}));

vi.mock("@/shared/ui/location-select-data", () => locationDataMocks);

function CountrySelectExample() {
  const [country, setCountry] = useState("");

  return (
    <div>
      <label htmlFor="country-select">Country</label>
      <CountrySelect id="country-select" value={country} onValueChange={setCountry} />
    </div>
  );
}

function StateSelectExample({ country = "Egypt" }: { country?: string }) {
  const [state, setState] = useState("");

  return (
    <div>
      <label htmlFor="state-select">State</label>
      <StateSelect id="state-select" country={country} value={state} onValueChange={setState} />
    </div>
  );
}

describe("location selects", () => {
  beforeEach(() => {
    locationDataMocks.loadCountries.mockResolvedValue([
      { id: 65, name: "Egypt", emoji: "EG" },
      { id: 233, name: "United States", emoji: "US" },
    ]);
    locationDataMocks.loadStates.mockResolvedValue([
      { id: 3235, name: "Cairo Governorate" },
      { id: 3236, name: "Alexandria Governorate" },
    ]);
  });

  afterEach(() => {
    cleanup();
    locationDataMocks.loadCountries.mockReset();
    locationDataMocks.loadStates.mockReset();
  });

  it("can be used as a country-only select", async () => {
    render(<CountrySelectExample />);

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText(/^country$/i));
    fireEvent.change(screen.getByLabelText(/search countries/i), { target: { value: "uni" } });

    expect(await screen.findByRole("option", { name: /United States/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Egypt/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /United States/ }));

    expect(screen.getByLabelText(/^country$/i)).toHaveTextContent("United States");
    expect(locationDataMocks.loadStates).not.toHaveBeenCalled();
  });

  it("renders country flags with spacing beside the country name", async () => {
    render(<CountrySelectExample />);

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).not.toBeDisabled());
    fireEvent.click(screen.getByLabelText(/^country$/i));

    const option = await screen.findByRole("option", { name: /Egypt/ });
    const label = option.querySelector(".items-center.gap-2");

    expect(label).not.toBeNull();
    expect(option).toHaveTextContent("EG");
    expect(option).toHaveTextContent("Egypt");
  });

  it("loads state options from the selected country", async () => {
    render(<StateSelectExample />);

    await waitFor(() => expect(locationDataMocks.loadStates).toHaveBeenCalledWith(65));
    await waitFor(() => expect(screen.getByLabelText(/^state$/i)).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText(/^state$/i));
    fireEvent.change(screen.getByLabelText(/search states/i), { target: { value: "alex" } });

    expect(
      await screen.findByRole("option", { name: "Alexandria Governorate" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Cairo Governorate" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Alexandria Governorate" }));

    expect(screen.getByLabelText(/^state$/i)).toHaveTextContent("Alexandria Governorate");
  });

  it("keeps state disabled until a country is available", async () => {
    render(<StateSelectExample country="" />);

    expect(screen.getByLabelText(/^state$/i)).toBeDisabled();
    expect(locationDataMocks.loadCountries).not.toHaveBeenCalled();
    expect(locationDataMocks.loadStates).not.toHaveBeenCalled();
  });
});
