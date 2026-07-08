import { GetCountries, GetState } from "react-country-state-city/dist/cjs/index.js";
import type { Country, State } from "react-country-state-city/dist/cjs/types/index";

let countryPromise: Promise<Country[]> | undefined;

export function loadCountries(): Promise<Country[]> {
  countryPromise ??= GetCountries().catch(() => []);
  return countryPromise;
}

export function loadStates(countryId: number): Promise<State[]> {
  return GetState(countryId).catch(() => []);
}
