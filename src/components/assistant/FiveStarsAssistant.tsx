"use client";

import {
  ArrowUp,
  Bot,
  MoreHorizontal,
  Paperclip,
  Plane,
  Sparkles,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "Hi, how can I help you with Five Stars? The more details you provide, the better.",
  },
];

function getAssistantResponse(message: string) {
  const value = message.toLowerCase();

  if (
    value.includes("flight") ||
    value.includes("fly") ||
    value.includes("ticket")
  ) {
    return "I can help you with flights. Tell me where you're traveling from, your destination, and your preferred travel date.";
  }

  if (
    value.includes("booking") ||
    value.includes("reservation") ||
    value.includes("trip")
  ) {
    return "I can help with your Five Stars booking. Tell me whether you want to find, review, or manage an existing trip.";
  }

  if (
    value.includes("cargo") ||
    value.includes("shipping") ||
    value.includes("package")
  ) {
    return "I can help with Five Stars cargo services between Haiti and the United States. Tell me what you need to send and where it is going.";
  }

  if (
    value.includes("charter") ||
    value.includes("private")
  ) {
    return "I can help with private charter services. Tell me your departure location, destination, preferred date, and approximate number of passengers.";
  }

  if (
    value.includes("baggage") ||
    value.includes("luggage") ||
    value.includes("bag")
  ) {
    return "I can help with baggage information. Tell me what you would like to know about your baggage or upcoming trip.";
  }

  if (
    value.includes("haiti") ||
    value.includes("boston") ||
    value.includes("miami") ||
    value.includes("new york")
  ) {
    return "I can help with travel between Haiti and the United States. Tell me your departure city and destination.";
  }

  return "I can help with Five Stars flights, bookings, cargo, charter services, baggage, and travel support. Tell me a little more about what you need.";
}

export default function FiveStarsAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const messagesEndRef =
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
  }, [messages, isOpen]);

  function sendMessage(rawMessage: string) {
    const cleanMessage = rawMessage.trim();

    if (!cleanMessage) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: cleanMessage,
    };

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      text: getAssistantResponse(cleanMessage),
    };

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);

    setInput("");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    sendMessage(input);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage(input);
    }
  }

  return (
    <>
      {/* =========================================================
          FLOATING LAUNCH BUTTON
      ========================================================== */}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Five Stars Assistant"
          className="
            fixed
            bottom-6
            right-6
            z-[70]

            flex
            h-14
            w-14
            items-center
            justify-center

            rounded-full

            bg-[#0078D2]
            text-white

            shadow-[0_8px_24px_rgba(15,23,42,0.16)]

            transition
            duration-200

            hover:bg-[#006bbd]

            focus-visible:outline-none
            focus-visible:ring-4
            focus-visible:ring-[#0078D2]/20
          "
        >
          <Sparkles
            size={23}
            strokeWidth={2}
          />
        </button>
      )}

      {/* =========================================================
          BACKDROP
      ========================================================== */}

      {isOpen && (
        <button
          type="button"
          aria-label="Close Five Stars Assistant"
          onClick={() => setIsOpen(false)}
          className="
            fixed
            inset-0
            z-[79]

            cursor-default

            bg-slate-950/10

            sm:bg-slate-950/15
          "
        />
      )}

      {/* =========================================================
          ASSISTANT
      ========================================================== */}

      {isOpen && (
        <aside
          role="dialog"
          aria-modal="true"
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

            sm:w-[480px]
            md:w-[500px]
            lg:w-[520px]
          "
        >
          {/* =====================================================
              HEADER
          ====================================================== */}

          <header
            className="
              flex
              h-[76px]
              shrink-0
              items-center
              justify-between

              border-b
              border-slate-200

              bg-white

              px-7
            "
          >
            <div className="flex items-center gap-3">
              <Sparkles
                size={25}
                strokeWidth={2}
                className="text-[#0078D2]"
              />

              <h2
                className="
                  text-[20px]
                  font-semibold
                  tracking-[-0.02em]
                  text-slate-900
                "
              >
                Assistant
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Assistant options"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center

                  rounded-lg

                  text-slate-500

                  transition

                  hover:bg-slate-100
                  hover:text-slate-900
                "
              >
                <MoreHorizontal
                  size={22}
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
                  h-10
                  w-10
                  items-center
                  justify-center

                  rounded-lg

                  text-slate-500

                  transition

                  hover:bg-slate-100
                  hover:text-slate-900
                "
              >
                <X
                  size={23}
                  strokeWidth={2}
                />
              </button>
            </div>
          </header>

          {/* =====================================================
              CONVERSATION
          ====================================================== */}

          <div
            className="
              assistant-conversation
              relative
              flex-1
              overflow-y-auto
            "
          >
            {/* Decorative line pattern */}

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                left-0
                right-0
                top-0
                h-[420px]
                overflow-hidden
                opacity-70
              "
            >
              <svg
                viewBox="0 0 520 420"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  <pattern
                    id="assistant-wave-pattern"
                    width="80"
                    height="16"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="
                        M -20 8
                        C 0 0,
                          20 16,
                          40 8
                        S 80 0,
                          100 8
                      "
                      fill="none"
                      stroke="#dce7f3"
                      strokeWidth="1"
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
                      offset="72%"
                      stopColor="white"
                      stopOpacity="0.65"
                    />

                    <stop
                      offset="100%"
                      stopColor="white"
                      stopOpacity="0"
                    />
                  </linearGradient>

                  <mask id="assistant-wave-mask">
                    <rect
                      width="520"
                      height="420"
                      fill="url(#assistant-wave-fade)"
                    />
                  </mask>
                </defs>

                <rect
                  width="520"
                  height="420"
                  fill="url(#assistant-wave-pattern)"
                  mask="url(#assistant-wave-mask)"
                  transform="skewY(-5)"
                />
              </svg>
            </div>

            {/* Messages */}

            <div
              className="
                relative
                z-10

                flex
                min-h-full
                flex-col

                px-7
                pb-8
                pt-7
              "
            >
              <div className="space-y-5">
                {messages.map(
                  (message, index) => {
                    const isAssistant =
                      message.role ===
                      "assistant";

                    /*
                     * First assistant greeting follows
                     * the Stripe-style large plain text.
                     */
                    if (
                      isAssistant &&
                      index === 0
                    ) {
                      return (
                        <div
                          key={message.id}
                          className="
                            max-w-[430px]

                            text-[18px]
                            font-normal
                            leading-[1.55]
                            tracking-[-0.015em]

                            text-slate-800
                          "
                        >
                          {message.text}
                        </div>
                      );
                    }

                    if (
                      message.role ===
                      "user"
                    ) {
                      return (
                        <div
                          key={message.id}
                          className="
                            flex
                            justify-end
                            pt-1
                          "
                        >
                          <div
                            className="
                              max-w-[84%]

                              rounded-[28px]

                              border-2
                              border-[#0078D2]

                              bg-white

                              px-5
                              py-3

                              text-[15px]
                              leading-6

                              text-slate-800
                            "
                          >
                            {message.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <div
                          className="
                            mt-1

                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center

                            rounded-lg

                            bg-[#edf6fc]

                            text-[#0078D2]
                          "
                        >
                          <Bot
                            size={17}
                            strokeWidth={2}
                          />
                        </div>

                        <div
                          className="
                            max-w-[82%]

                            rounded-xl

                            border
                            border-slate-200

                            bg-white

                            px-4
                            py-3

                            text-[14px]
                            leading-6

                            text-slate-700
                          "
                        >
                          {message.text}
                        </div>
                      </div>
                    );
                  }
                )}

                <div
                  ref={messagesEndRef}
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              INPUT AREA
          ====================================================== */}

          <div
            className="
              shrink-0

              bg-white

              px-6
              pb-5
              pt-3
            "
          >
            <form onSubmit={handleSubmit}>
              <div
                className="
                  relative

                  min-h-[116px]

                  rounded-[22px]

                  border-2
                  border-[#0078D2]

                  bg-white

                  px-5
                  pb-12
                  pt-4

                  shadow-[0_8px_28px_rgba(15,23,42,0.10)]

                  transition

                  focus-within:shadow-[0_10px_32px_rgba(0,120,210,0.13)]
                "
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  rows={2}
                  placeholder="Ask Five Stars about your trip..."
                  aria-label="Message Five Stars Assistant"
                  className="
                    block

                    max-h-32
                    min-h-[48px]
                    w-full

                    resize-none

                    border-0
                    bg-transparent

                    p-0

                    text-[16px]
                    leading-6

                    text-slate-900

                    outline-none

                    placeholder:text-slate-400
                  "
                />

                <div
                  className="
                    absolute
                    bottom-3
                    left-4
                    right-3

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
                      h-9
                      w-9
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
                      size={21}
                      strokeWidth={2}
                    />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send message"
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center

                      rounded-full

                      bg-[#0078D2]

                      text-white

                      transition

                      hover:bg-[#006bbd]

                      disabled:cursor-not-allowed
                      disabled:bg-slate-100
                      disabled:text-slate-400
                    "
                  >
                    <ArrowUp
                      size={20}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>
            </form>

            <p
              className="
                mt-4

                text-center
                text-[12px]
                leading-5

                text-slate-500
              "
            >
              Five Stars Assistant may make mistakes. Verify
              important travel information.
            </p>
          </div>
        </aside>
      )}
    </>
  );
}