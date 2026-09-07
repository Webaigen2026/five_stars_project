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
import { ChevronsUpDown, MapPin } from "lucide-react";

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

function airportMatchesQuery(airport: AirportOption, query: string) {
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

function secondaryLine(airport: AirportOption) {
  return `${airport.city} — ${airport.name}`;
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

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");

    const options: AirportOption[] = [];
    for (const [, airports] of groups) {
      options.push(...airports);
    }
    const selectedIndex = options.findIndex((airport) => airport.code === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, groups, value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveIndex((current) => {
      if (flatOptions.length === 0) {
        return 0;
      }
      return Math.min(current, flatOptions.length - 1);
    });
  }, [flatOptions, open]);

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
      const viewportPadding = 16;
      const preferredWidth = 360;
      const availableWidth = Math.max(
        0,
        window.innerWidth - viewportPadding * 2
      );
      // Popup width is independent of the compact trigger width.
      const width = Math.min(preferredWidth, availableWidth);
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - width - viewportPadding
      );
      // Prefer aligning to the trigger's left edge; clamp into the viewport.
      const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);

      setMenuPos({
        top: rect.bottom + 6,
        left,
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

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

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-airport-index="${activeIndex}"]`
    );
    active?.scrollIntoView({ block: "nearest" });
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
      const next = (current + delta + flatOptions.length) % flatOptions.length;
      return next;
    });
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
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
      if (option && option.code !== excludeCode) {
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
            className="overflow-hidden  border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
          >
            <div className="border-b border-slate-100 p-2">
              <label htmlFor={searchId} className="sr-only">
                Search airports
              </label>
              <div className="flex items-center gap-2  border border-slate-200 bg-slate-50 px-3 py-2">
                <MapPin
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="City or airport"
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendantId}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {flatOptions.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No airports match your search.
                </p>
              ) : (
                groups.map(([country, airports]) => {
                  const visible = airports.filter((airport) =>
                    airportMatchesQuery(airport, query)
                  );
                  if (visible.length === 0) {
                    return null;
                  }

                  return (
                    <div key={country} role="group" aria-label={country}>
                      <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {country}
                      </p>
                      {visible.map((airport) => {
                        const index = flatOptions.findIndex(
                          (item) => item.code === airport.code
                        );
                        const excluded = airport.code === excludeCode;
                        const isSelected = airport.code === value;
                        const isActive = index === activeIndex;

                        return (
                          <button
                            key={airport.code}
                            id={`${listboxId}-option-${airport.code}`}
                            type="button"
                            role="option"
                            data-airport-index={index}
                            aria-selected={isSelected}
                            disabled={excluded}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectAirport(airport.code)}
                            className={cn(
                              "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                              excluded && "cursor-not-allowed opacity-40",
                              !excluded && isActive && "bg-sky-50",
                              !excluded && !isActive && "hover:bg-slate-50",
                              isSelected && "bg-[#0078D2]/8"
                            )}
                          >
                            <span
                              className={cn(
                                "w-12 shrink-0 text-base font-semibold tracking-wide text-slate-950",
                                isSelected && "text-[#0078D2]"
                              )}
                            >
                              {airport.code}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-800">
                                {airport.city}
                              </span>
                              <span className="mt-0.5 block min-w-0 truncate text-xs text-slate-500">
                                {airport.name}
                              </span>
                            </span>
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
    <div ref={rootRef} className="min-w-0">
      <input type="hidden" name={name} value={value} readOnly />

      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>

      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex h-[86px] w-full min-w-0 items-center gap-3 rounded-lg border bg-white px-3.5 py-2.5 text-left transition",
          "border-slate-300 hover:border-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30",
          open && "border-[#0078D2] ring-2 ring-[#0078D2]/25"
        )}
      >
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block text-sm font-semibold leading-4 text-slate-500">
            {label}
          </span>

          {selected ? (
            <>
              <span className="mt-1 block truncate text-xl font-semibold leading-6 tracking-wide text-slate-950 sm:text-2xl sm:leading-7">
                {selected.code}
              </span>
              <span className="mt-0.5 block truncate text-sm leading-4 text-slate-600">
                {secondaryLine(selected)}
              </span>
            </>
          ) : (
            <span className="mt-2 block truncate text-base font-medium leading-6 text-slate-400">
              City or airport
            </span>
          )}
        </span>

        <ChevronsUpDown
          className="h-5 w-5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
      </button>

      {menu}
    </div>
  );
}
