"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

import {
  getAirportByCode,
  getAirportsByCountry,
  type AirportOption,
} from "../../data/airports";

type AirportSelectProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  excludeCode?: string;
  required?: boolean;
  describedBy?: string;
};

function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function airportMatchesQuery(
  airport: AirportOption,
  query: string
) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    airport.code.toLowerCase().includes(normalized) ||
    airport.city.toLowerCase().includes(normalized) ||
    airport.name.toLowerCase().includes(normalized) ||
    airport.country.toLowerCase().includes(normalized)
  );
}

export default function AirportSelect({
  id,
  name,
  label,
  value,
  onChange,
  excludeCode,
  required = true,
  describedBy,
}: AirportSelectProps) {
  const listboxId = useId();
  const searchId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selected = getAirportByCode(value);

  const groups = useMemo(() => getAirportsByCountry(), []);

  const flatOptions = useMemo(() => {
    const options: AirportOption[] = [];

    for (const [, airports] of groups) {
      for (const airport of airports) {
        if (airportMatchesQuery(airport, query)) {
          options.push(airport);
        }
      }
    }

    return options;
  }, [groups, query]);

  /*
   * Reset search and active option whenever
   * the dropdown opens.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");

    const options: AirportOption[] = [];

    for (const [, airports] of groups) {
      options.push(...airports);
    }

    const selectedIndex = options.findIndex(
      (airport) => airport.code === value
    );

    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : 0
    );

    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, groups, value]);

  /*
   * Keep active index valid after filtering.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveIndex((current) => {
      if (flatOptions.length === 0) {
        return 0;
      }

      return Math.min(
        current,
        flatOptions.length - 1
      );
    });
  }, [flatOptions, open]);

  /*
   * Position dropdown directly below the trigger.
   * The dropdown uses the same width as the field.
   */
  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();

      const width = Math.min(
        rect.width,
        window.innerWidth - 24
      );

      let left = rect.left;

      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
      }

      left = Math.max(12, left);

      setMenuPos({
        top: rect.bottom + 6,
        left,
        width,
      });
    }

    updatePosition();

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [open]);

  /*
   * Close when clicking outside.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;

      if (!target) {
        return;
      }

      if (rootRef.current?.contains(target)) {
        return;
      }

      if (listRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();

        setOpen(false);

        triggerRef.current?.focus();
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  /*
   * Keep keyboard-highlighted airport visible.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const active =
      listRef.current?.querySelector<HTMLElement>(
        `[data-airport-index="${activeIndex}"]`
      );

    active?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open]);

  function selectAirport(code: string) {
    if (code === excludeCode) {
      return;
    }

    onChange(code);

    setOpen(false);

    triggerRef.current?.focus();
  }

  function moveActive(delta: number) {
    if (flatOptions.length === 0) {
      return;
    }

    setActiveIndex((current) => {
      return (
        (current + delta + flatOptions.length) %
        flatOptions.length
      );
    });
  }

  function handleTriggerKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      setOpen(true);
    }
  }

  function handleSearchKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      moveActive(1);

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      moveActive(-1);

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const option = flatOptions[activeIndex];

      if (
        option &&
        option.code !== excludeCode
      ) {
        selectAirport(option.code);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setOpen(false);

      triggerRef.current?.focus();
    }
  }

  const activeOption = flatOptions[activeIndex];

  const activeDescendantId = activeOption
    ? `${listboxId}-option-${activeOption.code}`
    : undefined;

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={`${id}-label`}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 80,
            }}
            className="
              overflow-hidden
              border
              border-slate-200
              bg-white
              shadow-[0_18px_45px_rgba(15,23,42,0.14)]
            "
          >
            {/* Airport search */}
            <div className="border-b border-slate-200 px-4 py-3">
              <label
                htmlFor={searchId}
                className="sr-only"
              >
                Search airports
              </label>

              <div className="flex h-9 items-center gap-3">
                <Search
                  className="h-4 w-4 shrink-0 text-slate-400"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <input
                  ref={searchRef}
                  id={searchId}
                  type="text"
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search city or airport"
                  aria-controls={listboxId}
                  aria-activedescendant={
                    activeDescendantId
                  }
                  className="
                    min-w-0
                    flex-1
                    bg-transparent
                    text-[14px]
                    text-slate-950
                    outline-none
                    placeholder:text-slate-400
                  "
                />
              </div>
            </div>

            {/* Airport options */}
            <div className="max-h-[300px] overflow-y-auto py-1.5">
              {flatOptions.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-[14px] font-medium text-slate-700">
                    No airports found
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-slate-500">
                    Try searching by airport code,
                    city, or airport name.
                  </p>
                </div>
              ) : (
                groups.map(([country, airports]) => {
                  const visible = airports.filter(
                    (airport) =>
                      airportMatchesQuery(
                        airport,
                        query
                      )
                  );

                  if (visible.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={country}
                      role="group"
                      aria-label={country}
                    >
                      <p
                        className="
                          px-4
                          pb-1
                          pt-3
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.16em]
                          text-slate-400
                        "
                      >
                        {country}
                      </p>

                      {visible.map((airport) => {
                        const index =
                          flatOptions.findIndex(
                            (item) =>
                              item.code ===
                              airport.code
                          );

                        const excluded =
                          airport.code === excludeCode;

                        const isSelected =
                          airport.code === value;

                        const isActive =
                          index === activeIndex;

                        return (
                          <button
                            key={airport.code}
                            id={`${listboxId}-option-${airport.code}`}
                            type="button"
                            role="option"
                            data-airport-index={index}
                            aria-selected={isSelected}
                            disabled={excluded}
                            onMouseEnter={() =>
                              setActiveIndex(index)
                            }
                            onClick={() =>
                              selectAirport(
                                airport.code
                              )
                            }
                            className={cn(
                              `
                                group
                                flex
                                w-full
                                items-center
                                gap-3
                                px-4
                                py-2.5
                                text-left
                                transition-colors
                                duration-150
                              `,
                              excluded &&
                                "cursor-not-allowed opacity-35",
                              !excluded &&
                                isActive &&
                                "bg-slate-50",
                              !excluded &&
                                !isActive &&
                                "hover:bg-slate-50"
                            )}
                          >
                            {/* Airport code */}
                            <span
                              className={cn(
                                `
                                  w-[44px]
                                  shrink-0
                                  text-[13px]
                                  font-semibold
                                  tracking-[0.05em]
                                `,
                                isSelected
                                  ? "text-[#0078D2]"
                                  : "text-slate-950"
                              )}
                            >
                              {airport.code}
                            </span>

                            {/* Airport information */}
                            <span className="min-w-0 flex-1">
                              <span
                                className="
                                  block
                                  truncate
                                  text-[14px]
                                  font-medium
                                  leading-5
                                  text-slate-900
                                "
                              >
                                {airport.city}
                              </span>

                              <span
                                className="
                                  mt-0.5
                                  block
                                  truncate
                                  text-[12px]
                                  leading-4
                                  text-slate-500
                                "
                              >
                                {airport.name}
                              </span>
                            </span>

                            {isSelected ? (
                              <Check
                                className="
                                  h-4
                                  w-4
                                  shrink-0
                                  text-[#0078D2]
                                "
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="min-w-0"
    >
      {/* Value submitted with the parent form */}
      <input
        type="hidden"
        name={name}
        value={value}
        readOnly
      />

      <span
        id={`${id}-label`}
        className="sr-only"
      >
        {label}
      </span>

      {/* Main airport field */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        onClick={() =>
          setOpen((current) => !current)
        }
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          `
            group
            flex
            h-[72px]
            w-full
            items-center
            gap-4
            border
            bg-white
            px-4
            text-left
            transition-colors
            duration-150
          `,
          open
            ? "border-[#0078D2]"
            : "border-slate-300 hover:border-slate-400",
          `
            focus-visible:outline-none
            focus-visible:border-[#0078D2]
            focus-visible:ring-1
            focus-visible:ring-[#0078D2]
          `
        )}
      >
        <span className="min-w-0 flex-1">
          {/* Field label */}
          <span
            className="
              block
              text-[11px]
              font-semibold
              leading-4
              text-slate-500
            "
          >
            {label}
          </span>

          {/* Selected airport */}
          {selected ? (
            <span className="mt-1 flex min-w-0 items-baseline gap-2">
              <span
                className="
                  shrink-0
                  text-[15px]
                  font-semibold
                  leading-5
                  tracking-[0.02em]
                  text-slate-950
                "
              >
                {selected.code}
              </span>

              <span
                className="
                  min-w-0
                  truncate
                  text-[14px]
                  font-normal
                  leading-5
                  text-slate-500
                "
              >
                {selected.city}
              </span>
            </span>
          ) : (
            <span
              className="
                mt-1
                block
                truncate
                text-[15px]
                font-normal
                leading-5
                text-slate-400
              "
            >
              City or airport
            </span>
          )}
        </span>

        <ChevronDown
          className={cn(
            `
              h-4
              w-4
              shrink-0
              text-slate-400
              transition-transform
              duration-200
              group-hover:text-slate-600
            `,
            open && "rotate-180"
          )}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </button>

      {menu}
    </div>
  );
}