"use client";

import {
  ArrowRight,
  ArrowUp,
  CircleHelp,
  Headphones,
  MoreHorizontal,
  Paperclip,
  Plane,
  RotateCcw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
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
  tripType: "one-way" | "round-trip";
  adults: number;
  seniors: number;
  children: number;
  infants: number;
};

type Attachment = {
  name: string;
  size: number;
  type: string;
};

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  flightSearch?: FlightSearch;
  attachment?: Attachment;
};

type AssistantApiResponse = {
  reply?: string;
  flightSearch?: FlightSearch;
  error?: string;
};

const INITIAL_MESSAGE =
  "Welcome to Five Stars. What can I help you with today?";

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: INITIAL_MESSAGE,
  },
];

const suggestedQuestions = [
  "Finding a flight",
  "Managing a booking",
  "Baggage & travel info",
  "Cargo & charter services",
];

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx";

function totalTravelers(search: FlightSearch) {
  return (
    search.adults +
    search.seniors +
    search.children +
    search.infants
  );
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
      )
    )
  );
}

function airportLabel(code: string) {
  const labels: Record<string, string> = {
    BOS: "Boston",
    MIA: "Miami",
    FLL: "Fort Lauderdale",
    JFK: "New York",
    CAP: "Cap-Haïtien",
    PAP: "Port-au-Prince",
  };

  return labels[code] ? `${labels[code]} (${code})` : code;
}

function passengerLabel(search: FlightSearch) {
  const parts: string[] = [];

  if (search.adults > 0) {
    parts.push(
      `${search.adults} ${
        search.adults === 1 ? "adult" : "adults"
      }`
    );
  }

  if (search.seniors > 0) {
    parts.push(
      `${search.seniors} ${
        search.seniors === 1 ? "senior" : "seniors"
      }`
    );
  }

  if (search.children > 0) {
    parts.push(
      `${search.children} ${
        search.children === 1 ? "child" : "children"
      }`
    );
  }

  if (search.infants > 0) {
    parts.push(
      `${search.infants} ${
        search.infants === 1 ? "infant" : "infants"
      }`
    );
  }

  return parts.join(", ");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FiveStarsAssistant() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [attachmentError, setAttachmentError] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);
  const menuRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [isMenuOpen]);

  function restartConversation() {
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: INITIAL_MESSAGE,
      },
    ]);
    setInput("");
    setSelectedFile(null);
    setAttachmentError("");
    setIsMenuOpen(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function openHelp() {
    setIsMenuOpen(false);
    setInput("What can you help me with?");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function openContactSupport() {
    setIsMenuOpen(false);
    router.push("/contact");
  }

  function handleAttachmentClick() {
    setAttachmentError("");
    fileInputRef.current?.click();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setSelectedFile(null);
      setAttachmentError(
        "Please choose a file smaller than 10 MB."
      );
      return;
    }

    setAttachmentError("");
    setSelectedFile(file);
  }

  async function sendMessage(rawMessage: string) {
    const cleanMessage = rawMessage.trim();

    if (
      (!cleanMessage && !selectedFile) ||
      isLoading
    ) {
      return;
    }

    /*
      IMPORTANT:
      The current /api/assistant route accepts text messages.
      The selected attachment is displayed and associated with
      the user's message here, but its binary contents are NOT
      sent to OpenAI yet. That requires a small server-route
      update so files can be processed safely.
    */
    const attachment = selectedFile
      ? {
          name: selectedFile.name,
          size: selectedFile.size,
          type:
            selectedFile.type ||
            "application/octet-stream",
        }
      : undefined;

    const textForConversation =
      cleanMessage ||
      (attachment
        ? `I attached a file named ${attachment.name}.`
        : "");

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: textForConversation,
      attachment,
    };

    const conversation = [
      ...messages,
      userMessage,
    ];

    setMessages(conversation);
    setInput("");
    setSelectedFile(null);
    setAttachmentError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/assistant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversation.map(
              (message) => ({
                role: message.role,
                text: message.text,
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

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: data.reply.trim(),
        flightSearch: data.flightSearch,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(
        "Five Stars Assistant request failed:",
        error
      );

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
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

  function searchFlights(search: FlightSearch) {
    const passengers = totalTravelers(search);

    if (!search.ready || passengers < 1) {
      return;
    }

    const values = {
      tripType: search.tripType,
      from: search.from,
      to: search.to,
      departure: search.departure,
      returnDate:
        search.tripType === "round-trip"
          ? search.returnDate
          : "",
      passengers: String(passengers),
      adults: String(search.adults),
      seniors: String(search.seniors),
      children: String(search.children),
      infants: String(search.infants),
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
      buildFlightSearchParams(values);

    router.push(
      `/flights/results?${params.toString()}`
    );
  }

  const showSuggestions =
    messages.length === 1 && !isLoading;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Five Stars Assistant"
          className="fixed bottom-6 right-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-[#0078D2] text-white shadow-[0_6px_18px_rgba(15,23,42,0.14)] transition duration-200 hover:bg-[#006bbd] hover:shadow-[0_8px_22px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0078D2]/20"
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
          className="fixed inset-y-0 right-0 z-[80] flex h-[100dvh] w-full flex-col overflow-hidden border-l border-slate-200 bg-white sm:w-[360px] md:w-[370px] lg:w-[380px] xl:w-[390px] 2xl:w-[400px]"
        >
          <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0078D2] text-white">
                <Plane
                  size={17}
                  strokeWidth={2}
                  className="-rotate-[18deg]"
                />
              </div>

              <div>
                <h2 className="text-[16px] font-semibold leading-5 tracking-[-0.01em] text-slate-900">
                  Assistant
                </h2>
                <p className="mt-0.5 text-[10.5px] font-medium leading-4 text-slate-500">
                  Five Stars travel support
                </p>
              </div>
            </div>

            <div
              ref={menuRef}
              className="relative flex items-center gap-0.5"
            >
              <button
                type="button"
                onClick={() =>
                  setIsMenuOpen(
                    (current) => !current
                  )
                }
                aria-label="Assistant options"
                aria-expanded={isMenuOpen}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${
                  isMenuOpen ? "bg-slate-100" : ""
                }`}
              >
                <MoreHorizontal
                  size={19}
                  strokeWidth={2}
                />
              </button>

              {isMenuOpen && (
                <div className="absolute right-9 top-10 z-[100] w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_38px_rgba(15,23,42,0.14)]">
                  <button
                    type="button"
                    onClick={openHelp}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <CircleHelp
                      size={17}
                      strokeWidth={1.9}
                    />
                    Help & FAQs
                  </button>

                  <button
                    type="button"
                    onClick={openContactSupport}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <Headphones
                      size={17}
                      strokeWidth={1.9}
                    />
                    Contact support
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={restartConversation}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <RotateCcw
                      size={17}
                      strokeWidth={1.9}
                    />
                    Restart conversation
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsOpen(false);
                }}
                aria-label="Close assistant"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X
                  size={19}
                  strokeWidth={2}
                />
              </button>
            </div>
          </header>

          <div className="assistant-conversation relative flex-1 overflow-y-auto bg-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-0 h-[310px] overflow-hidden opacity-40"
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

            <div className="relative z-10 flex min-h-full flex-col px-5 pb-6 pt-5">
              <div className="space-y-4">
                {messages.map(
                  (message, index) => {
                    const isAssistant =
                      message.role === "assistant";

                    if (
                      isAssistant &&
                      index === 0
                    ) {
                      return (
                        <div
                          key={message.id}
                          className="max-w-[390px] pr-3 text-[14px] font-normal leading-[1.55] tracking-[-0.005em] text-slate-800"
                        >
                          {message.text}
                        </div>
                      );
                    }

                    if (
                      message.role === "user"
                    ) {
                      return (
                        <div
                          key={message.id}
                          className="flex justify-end py-0.5"
                        >
                          <div className="max-w-[78%] rounded-[16px] bg-[#f1f5f9] px-3.5 py-2.5 text-[14px] font-normal leading-[1.5] tracking-[-0.003em] text-slate-800">
                            {message.attachment && (
                              <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2 text-[11px] text-slate-600">
                                <Paperclip
                                  size={14}
                                  strokeWidth={2}
                                />
                                <span className="min-w-0 truncate">
                                  {
                                    message
                                      .attachment
                                      .name
                                  }
                                </span>
                              </div>
                            )}
                            {message.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        className="flex items-start"
                      >
                        <div className="max-w-[92%]">
                          <div className="whitespace-pre-wrap rounded-[12px] bg-[#f6f8fa] px-3.5 py-3 text-[14px] font-normal leading-[1.6] tracking-[-0.003em] text-slate-700">
                            {message.text}
                          </div>

                          {message.flightSearch
                            ?.ready && (
                            <div className="mt-2 overflow-hidden rounded-[12px] border border-slate-200 bg-white">
                              <div className="px-3.5 py-3">
                                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                  Flight search
                                </div>

                                <div className="mt-2 text-[14px] font-semibold leading-5 text-slate-900">
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

                                <div className="mt-1 text-[12px] leading-5 text-slate-500">
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
                                    message.flightSearch
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
                                className="flex w-full items-center justify-between border-t border-slate-200 bg-white px-3.5 py-3 text-left text-[13px] font-semibold text-[#0078D2] transition hover:bg-slate-50"
                              >
                                <span>
                                  Search flights
                                </span>
                                <ArrowRight
                                  size={16}
                                  strokeWidth={2}
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

                {showSuggestions && (
                  <div className="pt-1">
                    <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      You can ask me about
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map(
                        (question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() =>
                              void sendMessage(
                                question
                              )
                            }
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-[11.5px] font-medium leading-4 text-slate-700 transition hover:border-[#0078D2]/30 hover:bg-[#0078D2]/[0.03] hover:text-[#0078D2]"
                          >
                            {question}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-start">
                    <div className="rounded-[12px] bg-[#f6f8fa] px-3.5 py-3 text-[13px] leading-5 text-slate-500">
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-4 pt-3">
            <form onSubmit={handleSubmit}>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile && (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#0078D2]">
                      <Paperclip
                        size={16}
                        strokeWidth={2}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-slate-700">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setAttachmentError("");
                    }}
                    aria-label="Remove attachment"
                    className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
                  >
                    <X
                      size={15}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              )}

              {attachmentError && (
                <p className="mb-2 text-[10.5px] font-medium text-rose-600">
                  {attachmentError}
                </p>
              )}

              <div className="relative min-h-[86px] rounded-[15px] border border-slate-300 bg-white px-4 pb-10 pt-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.07)] transition duration-200 focus-within:border-[#0078D2] focus-within:ring-1 focus-within:ring-[#0078D2]/10 focus-within:shadow-[0_6px_20px_rgba(15,23,42,0.09)]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    isLoading
                      ? "Assistant is responding..."
                      : "Ask Five Stars Assistant"
                  }
                  aria-label="Message Five Stars Assistant"
                  disabled={isLoading}
                  className="block max-h-28 min-h-[30px] w-full resize-none border-0 bg-transparent p-0 text-[14px] font-normal leading-[1.5] tracking-[-0.003em] text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />

                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleAttachmentClick}
                    disabled={isLoading}
                    aria-label="Attach file"
                    title="Attach file"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Paperclip
                      size={18}
                      strokeWidth={2}
                    />
                  </button>

                  <button
                    type="submit"
                    disabled={
                      (!input.trim() &&
                        !selectedFile) ||
                      isLoading
                    }
                    aria-label="Send message"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0078D2] text-white transition duration-150 hover:bg-[#006bbd] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <ArrowUp
                      size={17}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>
            </form>

            <p className="mt-3 text-center text-[10.5px] leading-4 text-slate-500">
              Your journey, supported by Five Stars every step of the way.
            </p>
          </div>
        </aside>
      )}
    </>
  );
}
