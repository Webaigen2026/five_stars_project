import { db } from "../src/prisma/db";

const flights = [
  {
    code: "SJ101",
    airline: "StarJet",
    aircraft: "Airbus A320",

    origin: "Boston",
    originCode: "BOS",

    destination: "Cap-Haïtien",
    destinationCode: "CAP",

    departureTime: "2026-09-10T08:30:00-04:00",
    arrivalTime: "2026-09-10T12:15:00-04:00",

    durationMinutes: 225,

    // Stored in cents
    price: 32900,

    totalSeats: 180,
    availableSeats: 12,

    status: "SCHEDULED",
  },

  {
    code: "SJ205",
    airline: "StarJet",
    aircraft: "Airbus A320",

    origin: "Boston",
    originCode: "BOS",

    destination: "Cap-Haïtien",
    destinationCode: "CAP",

    departureTime: "2026-09-10T14:00:00-04:00",
    arrivalTime: "2026-09-10T17:45:00-04:00",

    durationMinutes: 225,

    price: 37900,

    totalSeats: 180,
    availableSeats: 7,

    status: "SCHEDULED",
  },

  {
    code: "SJ311",
    airline: "StarJet",
    aircraft: "Boeing 737-800",

    origin: "Miami",
    originCode: "MIA",

    destination: "Port-au-Prince",
    destinationCode: "PAP",

    departureTime: "2026-09-10T10:15:00-04:00",
    arrivalTime: "2026-09-10T12:20:00-04:00",

    durationMinutes: 125,

    price: 24900,

    totalSeats: 189,
    availableSeats: 18,

    status: "SCHEDULED",
  },

  {
    code: "SJ402",
    airline: "StarJet",
    aircraft: "Boeing 737-800",

    origin: "Fort Lauderdale",
    originCode: "FLL",

    destination: "Cap-Haïtien",
    destinationCode: "CAP",

    departureTime: "2026-09-10T07:45:00-04:00",
    arrivalTime: "2026-09-10T10:05:00-04:00",

    durationMinutes: 140,

    price: 26900,

    totalSeats: 189,
    availableSeats: 9,

    status: "SCHEDULED",
  },

  {
    code: "SJ505",
    airline: "StarJet",
    aircraft: "Airbus A320",

    origin: "New York",
    originCode: "JFK",

    destination: "Port-au-Prince",
    destinationCode: "PAP",

    departureTime: "2026-09-10T09:20:00-04:00",
    arrivalTime: "2026-09-10T13:10:00-04:00",

    durationMinutes: 230,

    price: 34900,

    totalSeats: 180,
    availableSeats: 15,

    status: "SCHEDULED",
  },
];

async function main() {
  try {
    console.log("Seeding StarJet flights...");

    for (const flight of flights) {
      const existingFlight = await db.orm.public.Flight
        .where({
          code: flight.code,
        })
        .first();

      if (existingFlight) {
        console.log(`Skipping ${flight.code} — already exists.`);
        continue;
      }

      await db.orm.public.Flight.create(flight);

      console.log(`Created ${flight.code}`);
    }

    console.log("Flight seed complete.");
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error("Failed to seed flights:");
  console.error(error);
  process.exit(1);
});
