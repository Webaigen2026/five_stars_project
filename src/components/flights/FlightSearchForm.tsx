"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function FlightSearchForm() {
  const router = useRouter();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departure, setDeparture] = useState("");
  const [passengers, setPassengers] = useState("1");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    if (departure) {
      params.set("departure", departure);
    }

    params.set("passengers", passengers);

    router.push(`/flights/results?${params.toString()}`);
  }

  return (
    <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
          Flight Search
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Find your next flight
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label
            htmlFor="from"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            From
          </label>

          <input
            id="from"
            name="from"
            type="text"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            placeholder="Boston"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="to"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            To
          </label>

          <input
            id="to"
            name="to"
            type="text"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="Cap-Haïtien"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="departure"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Departure
          </label>

          <input
            id="departure"
            name="departure"
            type="date"
            value={departure}
            onChange={(event) => setDeparture(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="passengers"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Passengers
          </label>

          <select
            id="passengers"
            name="passengers"
            value={passengers}
            onChange={(event) => setPassengers(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="1">1 Passenger</option>
            <option value="2">2 Passengers</option>
            <option value="3">3 Passengers</option>
            <option value="4">4 Passengers</option>
            <option value="5">5 Passengers</option>
            <option value="6">6 Passengers</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Search Flights
          </button>
        </div>
      </form>
    </div>
  );
}