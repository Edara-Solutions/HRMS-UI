import { type Ref, useEffect, useState } from "react";
import type { Country } from "react-country-state-city/dist/cjs/types/index";
import { LocationSelectContent } from "@/shared/ui/location-select-content";
import { loadCountries } from "@/shared/ui/location-select-data";
import { Select, SelectTrigger, SelectValue } from "@/shared/ui/select";

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  onBlur?: () => void;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

export function CountrySelect({
  value,
  onValueChange,
  id,
  placeholder = "Select country",
  searchPlaceholder = "Search countries",
  emptyMessage = "No countries found",
  disabled = false,
  onBlur,
  ref,
  className,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    loadCountries()
      .then((nextCountries) => {
        if (isActive) setCountries(nextCountries);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading || countries.length === 0}
    >
      <SelectTrigger id={id} ref={ref} onBlur={onBlur} className={className}>
        <SelectValue placeholder={isLoading ? "Loading countries" : placeholder} />
      </SelectTrigger>
      <LocationSelectContent
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        options={countries.map((country) => ({
          value: country.name,
          searchText: country.name,
          label: (
            <span className="flex min-w-0 items-center gap-2">
              {country.emoji && (
                <span className="stdropdown-flag shrink-0" aria-hidden="true">
                  {country.emoji}
                </span>
              )}
              <span className="truncate">{country.name}</span>
            </span>
          ),
        }))}
      />
    </Select>
  );
}
