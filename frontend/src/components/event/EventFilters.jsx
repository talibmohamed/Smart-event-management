import { Button, Input } from "@heroui/react";
import { Search, SlidersHorizontal } from "lucide-react";

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-zinc-200 bg-white/85 px-4 text-sm font-medium text-zinc-900 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-sky-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function EventFilters({
  filters,
  categories,
  cities,
  priceOptions,
  timeOptions,
  sortOptions,
  activeFilterCount,
  onFilterChange,
  onClear,
}) {
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((category) => ({ value: category, label: category })),
  ];

  const cityOptions = [
    { value: "", label: "All cities" },
    ...cities.map((city) => ({ value: city, label: city })),
  ];

  return (
    <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <SlidersHorizontal size={14} />
              Filter events
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Narrow the catalog with search, timing, price, category, and city.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300">
              {activeFilterCount} active
            </span>
            <Button
              radius="full"
              variant="bordered"
              onPress={onClear}
              className="border-zinc-200 bg-white/80 font-medium text-zinc-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            >
              Clear filters
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="md:col-span-2 xl:col-span-2">
            <Input
              type="search"
              label="Search"
              labelPlacement="outside"
              placeholder="Search title, category, address, or city..."
              value={filters.q}
              onChange={(event) => onFilterChange("q", event.target.value)}
              startContent={<Search size={16} className="text-zinc-400" />}
              radius="lg"
              classNames={{
                inputWrapper:
                  "h-12 border border-zinc-200 bg-white/85 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-sky-400/30 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08]",
                label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
              }}
            />
          </div>

          <FilterSelect
            label="Category"
            value={filters.category}
            options={categoryOptions}
            onChange={(value) => onFilterChange("category", value)}
          />

          <FilterSelect
            label="City"
            value={filters.city}
            options={cityOptions}
            onChange={(value) => onFilterChange("city", value)}
          />

          <FilterSelect
            label="Price"
            value={filters.price}
            options={priceOptions}
            onChange={(value) => onFilterChange("price", value)}
          />

          <FilterSelect
            label="Time"
            value={filters.time}
            options={timeOptions}
            onChange={(value) => onFilterChange("time", value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <FilterSelect
              label="Sort"
              value={filters.sort}
              options={sortOptions}
              onChange={(value) => onFilterChange("sort", value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
