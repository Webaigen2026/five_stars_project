import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type FlightSearch = {
  ready: boolean;
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  tripType: "one-way" | "round-trip";
  adults: number;
  seniors: number;
  children: number;
  infants: number;
};

type AssistantResult = {
  reply: string;
  flightSearch: FlightSearch;
};

const ALLOWED_AIRPORTS = new Set([
  "BOS",
  "MIA",
  "FLL",
  "JFK",
  "CAP",
  "PAP",
]);

const DATE_ONLY_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

/**
 * Five Stars currently operates between Haiti and the United States.
 *
 * The assistant uses America/New_York because the Five Stars website
 * primarily serves the Haiti / U.S. East Coast travel market.
 */
function getCurrentDateContext() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(now);

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value ?? "";

  const isoDate =
    `${year}-${month}-${day}`;

  const readableDate =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "America/New_York",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(now);

  return {
    isoDate,
    readableDate,
    year,
  };
}

function buildSystemPrompt() {
  const {
    isoDate,
    readableDate,
    year,
  } = getCurrentDateContext();

  return `
You are the Five Stars Assistant, the official travel-support assistant for Five Stars.

Five Stars provides passenger travel, flight assistance, cargo services,
private charter services, booking support, baggage guidance, and travel
support involving Haiti and the United States.

CURRENT DATE

Today is ${readableDate}.
Today's ISO date is ${isoDate}.
The current year is ${year}.

Use this current date when interpreting relative or incomplete travel dates.

SUPPORTED FIVE STARS AIRPORTS

United States:
- BOS — Boston Logan International Airport — Boston
- MIA — Miami International Airport — Miami
- FLL — Fort Lauderdale-Hollywood International Airport — Fort Lauderdale
- JFK — John F. Kennedy International Airport — New York

Haiti:
- CAP — Cap-Haïtien International Airport — Cap-Haïtien
- PAP — Toussaint Louverture International Airport — Port-au-Prince

AIRPORT RULES

Only these airport codes are supported:

BOS
MIA
FLL
JFK
CAP
PAP

Never invent an airport code.

Use these mappings:

Boston = BOS
Miami = MIA
Fort Lauderdale = FLL
New York = JFK
Port-au-Prince = PAP
Cap-Haïtien = CAP

If the customer says only "Haiti", do NOT automatically choose PAP.

Ask whether they want:

Port-au-Prince (PAP)

or

Cap-Haïtien (CAP)

If the customer says "New York", Five Stars currently supports JFK.

FLIGHT SEARCH INFORMATION

For a flight search, collect:

1. Departure airport
2. Destination airport
3. Departure date
4. Trip type
5. Return date if round-trip
6. Passenger information

PASSENGER CATEGORIES

Supported passenger categories are:

- adults
- seniors
- children
- infants

If the customer says:

"2 adults"

then use:

adults = 2
seniors = 0
children = 0
infants = 0

If the customer says only:

"2 passengers"

and provides no age/category information, treat them as 2 adults unless
the conversation indicates otherwise.

The total number of travelers must be between 1 and 9.

DATE RULES

Convert clear dates into YYYY-MM-DD.

Use today's date (${isoDate}) when interpreting dates.

If the customer provides a month and day without a year:

- Prefer the next occurrence of that month/day that is today or in the future.
- Do not choose a date in the past.
- If that month/day has already passed this year, use the next year.
- If the meaning is genuinely ambiguous, ask the customer to clarify.

Examples:

If today were September 8, 2026:
"September 11" would mean 2026-09-11.

If today were September 12, 2026:
"September 11" would normally mean 2027-09-11.

Relative dates must also use the current date.

Examples:

"tomorrow" means the calendar day after today.

"next week" should not be converted to an arbitrary exact day if the
customer has not identified a specific day. Ask which day they prefer.

"next month" alone is not an exact travel date. Ask the customer for the
specific travel date.

Do not accept a departure date before ${isoDate}.

For round-trip travel, the return date must be the same as or later than
the departure date.

TRIP TYPE RULES

Recognize normal customer wording.

Examples:

"one way"
"one-way"
"just going there"

can mean one-way when clearly stated.

"round trip"
"round-trip"
"return trip"

can mean round-trip when clearly stated.

If trip type is not known, ask the customer.

FLIGHT SEARCH READY RULES

Set flightSearch.ready to true ONLY when ALL required information is known:

- departure airport is valid
- destination airport is valid
- departure and destination are different
- departure date is valid
- trip type is known
- return date is known when round-trip
- passenger count is known
- total travelers is between 1 and 9

If anything required is missing:

flightSearch.ready = false

Preserve information already collected.

For unknown string values use an empty string.

For unknown passenger categories use 0.

Ask only for information that is still missing.

Do not repeatedly ask for information the customer already provided.

When flightSearch.ready is true:

- tell the customer their flight search is ready
- keep the reply brief because the website will show a separate flight-search card
- tell them to select Search flights below
- do not unnecessarily repeat every trip detail in the reply

A good completed reply is:

"Your flight search is ready. Review the details below, then select Search flights."

Do NOT say that you do not have access to the Five Stars flight-search system.

The website will use the structured flightSearch information returned by you
to open the existing Five Stars flight-results system.

IMPORTANT LIVE-DATA RULES

You are collecting search criteria.

You are NOT determining actual flight availability.

Never invent or claim:

- available flights
- schedules
- departure times
- arrival times
- fares
- ticket prices
- seat availability
- booking confirmations
- reservation information
- baggage allowances
- cargo prices
- charter availability
- refunds
- company policies

The Five Stars application performs the actual flight search after the
customer selects Search flights.

BOOKING AND SECURITY RULES

Never claim a booking, cancellation, payment, refund, or reservation has
been completed unless the actual Five Stars system explicitly confirms it.

Never request:

- passwords
- full payment card numbers
- CVVs
- authentication codes
- security credentials

OTHER FIVE STARS SERVICES

For cargo requests, gather relevant shipment information without inventing
an official quote.

For private charter requests, gather departure location, destination,
travel date, and passenger count without inventing availability or price.

If a customer asks something unrelated to Five Stars travel services,
politely redirect them to Five Stars travel assistance.

CONVERSATION RULES

Use the entire conversation.

Remember information from earlier messages.

If the customer corrects information, always use the newest information.

Ask only for missing information.

Keep responses concise, professional, and friendly.

IMPORTANT OUTPUT WRITING RULE

The reply field must contain plain text only.

Do NOT use Markdown.

Do NOT use:
- **
- ##
- backticks
- markdown tables
- markdown headings
- markdown bold formatting

Simple plain-text lines are allowed.

Do not pretend you have access to systems that have not actually been provided.
`;
}

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,

  properties: {
    reply: {
      type: "string",
    },

    flightSearch: {
      type: "object",
      additionalProperties: false,

      properties: {
        ready: {
          type: "boolean",
        },

        from: {
          type: "string",
        },

        to: {
          type: "string",
        },

        departure: {
          type: "string",
        },

        returnDate: {
          type: "string",
        },

        tripType: {
          type: "string",
          enum: [
            "one-way",
            "round-trip",
          ],
        },

        adults: {
          type: "integer",
          minimum: 0,
          maximum: 9,
        },

        seniors: {
          type: "integer",
          minimum: 0,
          maximum: 9,
        },

        children: {
          type: "integer",
          minimum: 0,
          maximum: 9,
        },

        infants: {
          type: "integer",
          minimum: 0,
          maximum: 9,
        },
      },

      required: [
        "ready",
        "from",
        "to",
        "departure",
        "returnDate",
        "tripType",
        "adults",
        "seniors",
        "children",
        "infants",
      ],
    },
  },

  required: [
    "reply",
    "flightSearch",
  ],
} as const;

function isRealCalendarDate(
  value: string
) {
  if (
    !DATE_ONLY_PATTERN.test(value)
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  );
}

function normalizePassengerCount(
  value: unknown
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      9,
      Math.trunc(value)
    )
  );
}

function normalizeFlightSearch(
  search: FlightSearch
): FlightSearch {
  const {
    isoDate,
  } = getCurrentDateContext();

  const from =
    typeof search.from ===
    "string"
      ? search.from
          .trim()
          .toUpperCase()
      : "";

  const to =
    typeof search.to ===
    "string"
      ? search.to
          .trim()
          .toUpperCase()
      : "";

  const departure =
    typeof search.departure ===
    "string"
      ? search.departure.trim()
      : "";

  const returnDate =
    typeof search.returnDate ===
    "string"
      ? search.returnDate.trim()
      : "";

  const tripType =
    search.tripType ===
    "round-trip"
      ? "round-trip"
      : "one-way";

  const adults =
    normalizePassengerCount(
      search.adults
    );

  const seniors =
    normalizePassengerCount(
      search.seniors
    );

  const children =
    normalizePassengerCount(
      search.children
    );

  const infants =
    normalizePassengerCount(
      search.infants
    );

  const totalPassengers =
    adults +
    seniors +
    children +
    infants;

  const validFrom =
    ALLOWED_AIRPORTS.has(
      from
    );

  const validTo =
    ALLOWED_AIRPORTS.has(
      to
    );

  const validRoute =
    validFrom &&
    validTo &&
    from !== to;

  const validDeparture =
    isRealCalendarDate(
      departure
    ) &&
    departure >= isoDate;

  const validReturn =
    tripType === "one-way" ||
    (
      isRealCalendarDate(
        returnDate
      ) &&
      validDeparture &&
      returnDate >= departure
    );

  const validPassengers =
    totalPassengers >= 1 &&
    totalPassengers <= 9;

  const ready =
    Boolean(search.ready) &&
    validRoute &&
    validDeparture &&
    validReturn &&
    validPassengers;

  return {
    ready,

    from: validFrom
      ? from
      : "",

    to: validTo
      ? to
      : "",

    departure,

    returnDate:
      tripType ===
      "round-trip"
        ? returnDate
        : "",

    tripType,

    adults,
    seniors,
    children,
    infants,
  };
}

function cleanReply(
  value: string
) {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

export async function POST(
  request: Request
) {
  try {
    if (
      !process.env
        .OPENAI_API_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const messages: ChatMessage[] =
      Array.isArray(
        body?.messages
      )
        ? body.messages
        : [];

    const validMessages =
      messages
        .filter(
          (
            message
          ): message is ChatMessage =>
            (
              message?.role ===
                "user" ||
              message?.role ===
                "assistant"
            ) &&
            typeof message?.text ===
              "string" &&
            message.text
              .trim()
              .length > 0
        )
        .slice(-20);

    if (
      validMessages.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "A message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const openai =
      new OpenAI({
        apiKey:
          process.env
            .OPENAI_API_KEY,
      });

    const conversation =
      validMessages.map(
        (message) => ({
          role: message.role,
          content:
            message.text.trim(),
        })
      );

    const response =
      await openai.responses.create(
        {
          model:
            "gpt-5.6-luna",

          instructions:
            buildSystemPrompt(),

          input:
            conversation,

          max_output_tokens:
            700,

          text: {
            format: {
              type:
                "json_schema",

              name:
                "five_stars_assistant",

              strict: true,

              schema:
                OUTPUT_SCHEMA,
            },
          },
        }
      );

    const output =
      response.output_text?.trim();

    if (!output) {
      return NextResponse.json(
        {
          error:
            "The assistant did not return a response.",
        },
        {
          status: 502,
        }
      );
    }

    let result:
      AssistantResult;

    try {
      result =
        JSON.parse(
          output
        ) as AssistantResult;
    } catch (
      parseError
    ) {
      console.error(
        "Five Stars Assistant returned invalid JSON:",
        output,
        parseError
      );

      return NextResponse.json(
        {
          error:
            "The assistant returned an invalid response.",
        },
        {
          status: 502,
        }
      );
    }

    if (
      typeof result.reply !==
        "string" ||
      !result.flightSearch
    ) {
      console.error(
        "Five Stars Assistant returned incomplete structured data:",
        result
      );

      return NextResponse.json(
        {
          error:
            "The assistant returned incomplete data.",
        },
        {
          status: 502,
        }
      );
    }

    const flightSearch =
      normalizeFlightSearch(
        result.flightSearch
      );

    const reply =
      cleanReply(
        result.reply
      );

    if (!reply) {
      return NextResponse.json(
        {
          error:
            "The assistant returned an empty response.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(
      {
        reply,
        flightSearch,
      }
    );
  } catch (error) {
    console.error(
      "Five Stars Assistant API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The Five Stars Assistant is temporarily unavailable.",
      },
      {
        status: 500,
      }
    );
  }
}