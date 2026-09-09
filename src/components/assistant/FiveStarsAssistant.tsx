"use client";

import {
  ArrowRight,
  ArrowUp,
  MoreHorizontal,
  Paperclip,
  Plane,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  buildFlightSearchParams,
  validateFlightSearch,
} from "../../lib/flight-search";

type FlightSearch = {
  ready: boolean;
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  tripType:
    | "one-way"
    | "round-trip";
  adults: number;
  seniors: number;
  children: number;
  infants: number;
};

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  flightSearch?: FlightSearch;
};

type AssistantApiResponse = {
  reply?: string;
  flightSearch?: FlightSearch;
  error?: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text:
      "Hi, how can I help you with Five Stars? The more details you provide, the better.",
  },
];

function totalTravelers(
  search: FlightSearch
) {
  return (
    search.adults +
    search.seniors +
    search.children +
    search.infants
  );
}

function formatDate(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return value;
  }

  const [, year, month, day] =
    match;

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
      )
    )
  );
}

function airportLabel(
  code: string
) {
  const labels: Record<
    string,
    string
  > = {
    BOS: "Boston",
    MIA: "Miami",
    FLL: "Fort Lauderdale",
    JFK: "New York",
    CAP: "Cap-Haïtien",
    PAP: "Port-au-Prince",
  };

  return labels[code]
    ? `${labels[code]} (${code})`
    : code;
}

function passengerLabel(
  search: FlightSearch
) {
  const parts: string[] = [];

  if (search.adults > 0) {
    parts.push(
      `${search.adults} ${
        search.adults === 1
          ? "adult"
          : "adults"
      }`
    );
  }

  if (search.seniors > 0) {
    parts.push(
      `${search.seniors} ${
        search.seniors === 1
          ? "senior"
          : "seniors"
      }`
    );
  }

  if (search.children > 0) {
    parts.push(
      `${search.children} ${
        search.children === 1
          ? "child"
          : "children"
      }`
    );
  }

  if (search.infants > 0) {
    parts.push(
      `${search.infants} ${
        search.infants === 1
          ? "infant"
          : "infants"
      }`
    );
  }

  return parts.join(", ");
}

export default function FiveStarsAssistant() {
  const router = useRouter();

  const [isOpen, setIsOpen] =
    useState(false);

  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>(
      initialMessages
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "nearest",
      }
    );
  }, [
    messages,
    isOpen,
    isLoading,
  ]);

  async function sendMessage(
    rawMessage: string
  ) {
    const cleanMessage =
      rawMessage.trim();

    if (
      !cleanMessage ||
      isLoading
    ) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: cleanMessage,
    };

    const conversation = [
      ...messages,
      userMessage,
    ];

    setMessages(conversation);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/assistant",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            messages:
              conversation.map(
                (message) => ({
                  role:
                    message.role,
                  text:
                    message.text,
                })
              ),
          }),
        }
      );

      const data =
        (await response.json()) as AssistantApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "The assistant is temporarily unavailable."
        );
      }

      if (!data.reply?.trim()) {
        throw new Error(
          "The assistant returned an empty response."
        );
      }

      const assistantMessage: Message =
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.reply.trim(),
          flightSearch:
            data.flightSearch,
        };

      setMessages(
        (current) => [
          ...current,
          assistantMessage,
        ]
      );
    } catch (error) {
      console.error(
        "Five Stars Assistant request failed:",
        error
      );

      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text:
          "I'm having trouble connecting right now. Please try again in a moment.",
      };

      setMessages(
        (current) => [
          ...current,
          errorMessage,
        ]
      );
    } finally {
      setIsLoading(false);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void sendMessage(input);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void sendMessage(input);
    }
  }

  function searchFlights(
    search: FlightSearch
  ) {
    const passengers =
      totalTravelers(search);

    if (
      !search.ready ||
      passengers < 1
    ) {
      return;
    }

    const values = {
      tripType:
        search.tripType,
      from: search.from,
      to: search.to,
      departure:
        search.departure,
      returnDate:
        search.tripType ===
        "round-trip"
          ? search.returnDate
          : "",
      passengers:
        String(passengers),
      adults:
        String(search.adults),
      seniors:
        String(search.seniors),
      children:
        String(search.children),
      infants:
        String(search.infants),
    };

    const validationError =
      validateFlightSearch(values);

    if (validationError) {
      console.error(
        "Assistant flight search validation failed:",
        validationError
      );

      return;
    }

    const params =
      buildFlightSearchParams(
        values
      );

    router.push(
      `/flights/results?${params.toString()}`
    );
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() =>
            setIsOpen(true)
          }
          aria-label="Open Five Stars Assistant"
          className="
            fixed
            bottom-6
            right-6
            z-[70]
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            bg-[#0078D2]
            text-white
            shadow-[0_6px_18px_rgba(15,23,42,0.14)]
            transition
            duration-200
            hover:bg-[#006bbd]
            hover:shadow-[0_8px_22px_rgba(15,23,42,0.18)]
            focus-visible:outline-none
            focus-visible:ring-4
            focus-visible:ring-[#0078D2]/20
          "
        >
          <Plane
            size={20}
            strokeWidth={1.9}
            className="-rotate-[18deg]"
          />
        </button>
      )}

      {isOpen && (
        <aside
          role="dialog"
          aria-modal="false"
          aria-label="Five Stars Assistant"
          className="
            fixed
            inset-y-0
            right-0
            z-[80]
            flex
            h-[100dvh]
            w-full
            flex-col
            overflow-hidden
            border-l
            border-slate-200
            bg-white
            sm:w-[360px]
            md:w-[370px]
            lg:w-[380px]
            xl:w-[390px]
            2xl:w-[400px]
          "
        >
          <header
            className="
              flex
              h-[64px]
              shrink-0
              items-center
              justify-between
              border-b
              border-slate-200
              bg-white
              px-5
            "
          >
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-md
                  bg-[#0078D2]
                  text-white
                "
              >
                <Plane
                  size={17}
                  strokeWidth={2}
                  className="-rotate-[18deg]"
                />
              </div>

              <div>
                <h2
                  className="
                    text-[16px]
                    font-semibold
                    leading-5
                    tracking-[-0.01em]
                    text-slate-900
                  "
                >
                  Assistant
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[10.5px]
                    font-medium
                    leading-4
                    text-slate-500
                  "
                >
                  Five Stars travel support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Assistant options"
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-md
                  text-slate-500
                  transition
                  hover:bg-slate-100
                  hover:text-slate-900
                "
              >
                <MoreHorizontal
                  size={19}
                  strokeWidth={2}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                aria-label="Close assistant"
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-md
                  text-slate-500
                  transition
                  hover:bg-slate-100
                  hover:text-slate-900
                "
              >
                <X
                  size={19}
                  strokeWidth={2}
                />
              </button>
            </div>
          </header>

          <div
            className="
              assistant-conversation
              relative
              flex-1
              overflow-y-auto
              bg-white
            "
          >
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                left-0
                right-0
                top-0
                h-[310px]
                overflow-hidden
                opacity-40
              "
            >
              <svg
                viewBox="0 0 470 310"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  <pattern
                    id="assistant-wave-pattern"
                    width="72"
                    height="15"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M -18 7.5 C 0 1, 18 14, 36 7.5 S 72 1, 90 7.5"
                      fill="none"
                      stroke="#dce7f3"
                      strokeWidth="0.8"
                    />
                  </pattern>

                  <linearGradient
                    id="assistant-wave-fade"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="white"
                      stopOpacity="1"
                    />

                    <stop
                      offset="62%"
                      stopColor="white"
                      stopOpacity="0.42"
                    />

                    <stop
                      offset="100%"
                      stopColor="white"
                      stopOpacity="0"
                    />
                  </linearGradient>

                  <mask id="assistant-wave-mask">
                    <rect
                      width="470"
                      height="310"
                      fill="url(#assistant-wave-fade)"
                    />
                  </mask>
                </defs>

                <rect
                  width="470"
                  height="310"
                  fill="url(#assistant-wave-pattern)"
                  mask="url(#assistant-wave-mask)"
                  transform="skewY(-4)"
                />
              </svg>
            </div>

            <div
              className="
                relative
                z-10
                flex
                min-h-full
                flex-col
                px-5
                pb-6
                pt-5
              "
            >
              <div className="space-y-4">
                {messages.map(
                  (
                    message,
                    index
                  ) => {
                    const isAssistant =
                      message.role ===
                      "assistant";

                    if (
                      isAssistant &&
                      index === 0
                    ) {
                      return (
                        <div
                          key={
                            message.id
                          }
                          className="
                            max-w-[390px]
                            pr-3
                            text-[14px]
                            font-normal
                            leading-[1.55]
                            tracking-[-0.005em]
                            text-slate-800
                          "
                        >
                          {
                            message.text
                          }
                        </div>
                      );
                    }

                    if (
                      message.role ===
                      "user"
                    ) {
                      return (
                        <div
                          key={
                            message.id
                          }
                          className="
                            flex
                            justify-end
                            py-0.5
                          "
                        >
                          <div
                            className="
                              max-w-[78%]
                              rounded-[16px]
                              bg-[#f1f5f9]
                              px-3.5
                              py-2.5
                              text-[14px]
                              font-normal
                              leading-[1.5]
                              tracking-[-0.003em]
                              text-slate-800
                            "
                          >
                            {
                              message.text
                            }
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={
                          message.id
                        }
                        className="
                          flex
                          items-start
                        "
                      >
                        <div className="max-w-[92%]">
                          <div
                            className="
                              whitespace-pre-wrap
                              rounded-[12px]
                              bg-[#f6f8fa]
                              px-3.5
                              py-3
                              text-[14px]
                              font-normal
                              leading-[1.6]
                              tracking-[-0.003em]
                              text-slate-700
                            "
                          >
                            {
                              message.text
                            }
                          </div>

                          {message
                            .flightSearch
                            ?.ready && (
                            <div
                              className="
                                mt-2
                                overflow-hidden
                                rounded-[12px]
                                border
                                border-slate-200
                                bg-white
                              "
                            >
                              <div className="px-3.5 py-3">
                                <div
                                  className="
                                    text-[12px]
                                    font-semibold
                                    uppercase
                                    tracking-[0.08em]
                                    text-slate-500
                                  "
                                >
                                  Flight
                                  search
                                </div>

                                <div
                                  className="
                                    mt-2
                                    text-[14px]
                                    font-semibold
                                    leading-5
                                    text-slate-900
                                  "
                                >
                                  {airportLabel(
                                    message
                                      .flightSearch
                                      .from
                                  )}
                                  {" → "}
                                  {airportLabel(
                                    message
                                      .flightSearch
                                      .to
                                  )}
                                </div>

                                <div
                                  className="
                                    mt-1
                                    text-[12px]
                                    leading-5
                                    text-slate-500
                                  "
                                >
                                  {formatDate(
                                    message
                                      .flightSearch
                                      .departure
                                  )}

                                  {message
                                    .flightSearch
                                    .tripType ===
                                  "round-trip"
                                    ? ` – ${formatDate(
                                        message
                                          .flightSearch
                                          .returnDate
                                      )}`
                                    : ""}

                                  {" · "}

                                  {message
                                    .flightSearch
                                    .tripType ===
                                  "round-trip"
                                    ? "Round trip"
                                    : "One way"}

                                  {" · "}

                                  {passengerLabel(
                                    message
                                      .flightSearch
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  searchFlights(
                                    message.flightSearch!
                                  )
                                }
                                className="
                                  flex
                                  w-full
                                  items-center
                                  justify-between
                                  border-t
                                  border-slate-200
                                  bg-white
                                  px-3.5
                                  py-3
                                  text-left
                                  text-[13px]
                                  font-semibold
                                  text-[#0078D2]
                                  transition
                                  hover:bg-slate-50
                                "
                              >
                                <span>
                                  Search
                                  flights
                                </span>

                                <ArrowRight
                                  size={
                                    16
                                  }
                                  strokeWidth={
                                    2
                                  }
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

                {isLoading && (
                  <div className="flex items-start">
                    <div
                      className="
                        rounded-[12px]
                        bg-[#f6f8fa]
                        px-3.5
                        py-3
                        text-[13px]
                        leading-5
                        text-slate-500
                      "
                    >
                      Thinking...
                    </div>
                  </div>
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            </div>
          </div>

          <div
            className="
              shrink-0
              border-t
              border-slate-100
              bg-white
              px-5
              pb-4
              pt-3
            "
          >
            <form
              onSubmit={
                handleSubmit
              }
            >
              <div
                className="
                  relative
                  min-h-[86px]
                  rounded-[15px]
                  border
                  border-slate-300
                  bg-white
                  px-4
                  pb-10
                  pt-3.5
                  shadow-[0_4px_16px_rgba(15,23,42,0.07)]
                  transition
                  duration-200
                  focus-within:border-[#0078D2]
                  focus-within:ring-1
                  focus-within:ring-[#0078D2]/10
                  focus-within:shadow-[0_6px_20px_rgba(15,23,42,0.09)]
                "
              >
                <textarea
                  ref={
                    textareaRef
                  }
                  value={input}
                  onChange={(
                    event
                  ) =>
                    setInput(
                      event
                        .target
                        .value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  rows={1}
                  placeholder={
                    isLoading
                      ? "Assistant is responding..."
                      : "Ask a question"
                  }
                  aria-label="Message Five Stars Assistant"
                  disabled={
                    isLoading
                  }
                  className="
                    block
                    max-h-28
                    min-h-[30px]
                    w-full
                    resize-none
                    border-0
                    bg-transparent
                    p-0
                    text-[14px]
                    font-normal
                    leading-[1.5]
                    tracking-[-0.003em]
                    text-slate-900
                    outline-none
                    placeholder:text-slate-400
                    disabled:cursor-not-allowed
                  "
                />

                <div
                  className="
                    absolute
                    bottom-2.5
                    left-2.5
                    right-2.5
                    flex
                    items-center
                    justify-between
                  "
                >
                  <button
                    type="button"
                    aria-label="Attach file"
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-700
                    "
                  >
                    <Paperclip
                      size={18}
                      strokeWidth={
                        2
                      }
                    />
                  </button>

                  <button
                    type="submit"
                    disabled={
                      !input.trim() ||
                      isLoading
                    }
                    aria-label="Send message"
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      bg-[#0078D2]
                      text-white
                      transition
                      duration-150
                      hover:bg-[#006bbd]
                      disabled:cursor-not-allowed
                      disabled:bg-slate-100
                      disabled:text-slate-400
                    "
                  >
                    <ArrowUp
                      size={17}
                      strokeWidth={
                        2
                      }
                    />
                  </button>
                </div>
              </div>
            </form>

            <p
              className="
                mt-3
                text-center
                text-[10.5px]
                leading-4
                text-slate-500
              "
            >
              Five Stars Assistant may make mistakes.
              Verify important travel information.
            </p>
          </div>
        </aside>
      )}
    </>
  );
}