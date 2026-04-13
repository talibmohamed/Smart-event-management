import { Button, Input, Spinner } from "@heroui/react";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { extractApiErrorMessage } from "../../services/api";
import cityService from "../../services/cityService";

function formatCityLabel(city) {
  return [city.postal_code, city.department].filter(Boolean).join(" - ");
}

export default function CityAutocomplete({
  value,
  onChange,
  onSelectionChange,
  isSelected = false,
}) {
  const [query, setQuery] = useState(value || "");
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    let ignore = false;
    const search = query.trim();

    if (isSelected || search.length < 2) {
      setCities([]);
      setErrorMessage("");
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    setIsLoading(true);
    setErrorMessage("");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await cityService.searchCities(search);

        if (!ignore) {
          setCities(response.data.data || []);
          setIsOpen(true);
        }
      } catch (error) {
        if (!ignore) {
          setCities([]);
          setErrorMessage(extractApiErrorMessage(error, "Unable to search cities."));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [isSelected, query]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function handleInputChange(event) {
    const nextValue = event.target.value;

    setQuery(nextValue);
    setIsOpen(true);
    onChange(nextValue);
    onSelectionChange(false);
  }

  function handleSelectCity(city) {
    setQuery(city.name);
    setCities([]);
    setIsOpen(false);
    onChange(city.name);
    onSelectionChange(true);
  }

  const shouldShowResults = isOpen && !isSelected && (cities.length > 0 || errorMessage || query.trim().length >= 2);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        label="City"
        labelPlacement="outside"
        placeholder="Search city or postal code"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        radius="lg"
        startContent={<MapPin size={16} className="text-zinc-400" />}
        endContent={isLoading ? <Spinner size="sm" color="default" /> : null}
        classNames={{
          inputWrapper:
            "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
        }}
      />

      {shouldShowResults ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-zinc-950 dark:shadow-black/30">
          {errorMessage ? (
            <p className="px-3 py-2 text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
          ) : cities.length > 0 ? (
            <div className="space-y-1">
              {cities.map((city) => (
                <Button
                  key={`${city.name}-${city.postal_code}-${city.department}`}
                  type="button"
                  variant="light"
                  radius="lg"
                  onPress={() => handleSelectCity(city)}
                  className="h-auto w-full justify-start px-3 py-2 text-left data-[hover=true]:bg-zinc-100 dark:data-[hover=true]:bg-white/10"
                >
                  <span>
                    <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                      {city.name}
                    </span>
                    {formatCityLabel(city) ? (
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {formatCityLabel(city)}
                      </span>
                    ) : null}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              No supported French city found.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
