import { type Ref, useEffect, useState } from "react";
import type { State } from "react-country-state-city/dist/cjs/types/index";
import { loadCountries, loadStates } from "@/shared/ui/location-select-data";
import { LocationSelectContent } from "@/shared/ui/location-select-content";
import { Select, SelectTrigger, SelectValue } from "@/shared/ui/select";

interface StateSelectProps {
  country: string;
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  onBlur?: () => void;
  ref?: Ref<HTMLButtonElement>;
}

export function StateSelect({
  country,
  value,
  onValueChange,
  id,
  placeholder = "Select state",
  searchPlaceholder = "Search states",
  emptyMessage = "No states found",
  disabled = false,
  onBlur,
  ref,
}: StateSelectProps) {
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!country) {
      setStates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadCountries()
      .then((countries) => {
        const selectedCountry = countries.find((item) => item.name === country);
        if (!selectedCountry) return [];
        return loadStates(selectedCountry.id);
      })
      .then((nextStates) => {
        if (isActive) setStates(nextStates);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [country]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || !country || isLoading || states.length === 0}
    >
      <SelectTrigger id={id} ref={ref} onBlur={onBlur}>
        <SelectValue placeholder={isLoading ? "Loading states" : placeholder} />
      </SelectTrigger>
      <LocationSelectContent
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        options={states.map((state) => ({
          value: state.name,
          searchText: state.name,
          label: state.name,
        }))}
      />
    </Select>
  );
}
