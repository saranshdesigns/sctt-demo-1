import React, { useEffect, useRef, useState, useCallback } from "react";
import PhoneFrame from "../components/PhoneFrame.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import QuickReplies from "../components/QuickReplies.jsx";
import TypingIndicator from "../components/TypingIndicator.jsx";
import PaymentModal from "../components/PaymentModal.jsx";
import {
  STEPS,
  KNOWN_CITIES,
  POPULAR_DESTINATIONS,
  extractDestination,
  extractDateHint,
  generateSlots,
  hintFromQuickChoice,
  botReply,
  TYPING_DELAY,
} from "../utils/botLogic.js";
import { detectLanguage, localize } from "../utils/ai.js";

const LANG_BADGE = { en: "EN", hi: "हिं", gu: "ગુ", hinglish: "HI", bn: "বাং", ta: "த", te: "తె", mr: "मरा", pa: "ਪੰ", other: "?" };

let msgId = 0;
const nextId = () => `m-${++msgId}-${Date.now()}`;

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(STEPS.GREETING);
  const [context, setContext] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [copied, setCopied] = useState(false);
  const langRef = useRef("hinglish");
  const bottomRef = useRef(null);
  const initedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const pushMessage = (msg) =>
    setMessages((prev) => [...prev, { id: nextId(), timestamp: Date.now(), ...msg }]);

  // Core driver — pushes user msg (if any), shows typing, localizes reply text, pushes bot msg.
  const advance = useCallback(
    async (nextStep, { userText, ctxPatch } = {}) => {
      if (userText) pushMessage({ from: "user", text: userText });
      const mergedCtx = { ...context, ...(ctxPatch || {}) };
      if (ctxPatch) setContext(mergedCtx);

      setIsTyping(true);
      const [reply] = await Promise.all([
        (async () => {
          const base = botReply(nextStep, mergedCtx);
          const lang = langRef.current;
          if (!base.text || lang === "hinglish") return base;
          const localized = await localize(base.text, lang);
          return { ...base, text: localized };
        })(),
        new Promise((r) => setTimeout(r, TYPING_DELAY())),
      ]);

      setIsTyping(false);
      pushMessage({ from: "bot", ...reply, botStep: nextStep });
      setStep(nextStep);
    },
    [context]
  );

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    (async () => {
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, TYPING_DELAY()));
      setIsTyping(false);
      const reply = botReply(STEPS.GREETING, {});
      pushMessage({ from: "bot", ...reply, botStep: STEPS.GREETING });
      setStep(STEPS.ASK_DESTINATION);
    })();
  }, []);

  const expectsFreeText = step === STEPS.ASK_DESTINATION || step === STEPS.ASK_CUSTOM_DATE;

  const proceedFromDestination = (destination, userText, hint) => {
    if (hint) {
      const slots = generateSlots();
      advance(STEPS.SHOW_SLOTS, {
        userText,
        ctxPatch: { destination, date: hint.iso, dateLabel: hint.label, slots, skippedAskDate: true },
      });
    } else {
      advance(STEPS.ASK_DATE, { userText, ctxPatch: { destination } });
    }
  };

  const handleSendText = async () => {
    const txt = inputText.trim();
    if (!txt || isTyping) return;
    setInputText("");

    if (step === STEPS.ASK_DESTINATION) {
      const destination = extractDestination(txt);
      const hint = extractDateHint(txt);

      pushMessage({ from: "user", text: txt });

      if (!destination) {
        // Unknown city — detect language first, then ask again with known-city chips.
        setIsTyping(true);
        const detected = await detectLanguage(txt);
        langRef.current = detected;
        setLanguage(detected);
        advance(STEPS.UNKNOWN_DESTINATION, {});
        return;
      }

      setIsTyping(true);
      const detected = await detectLanguage(txt);
      langRef.current = detected;
      setLanguage(detected);
      proceedFromDestination(destination, undefined, hint);
      return;
    }

    if (step === STEPS.ASK_CUSTOM_DATE) {
      const hint = extractDateHint(txt);
      if (hint) {
        const slots = generateSlots();
        advance(STEPS.SHOW_SLOTS, { userText: txt, ctxPatch: { date: hint.iso, dateLabel: hint.label, slots } });
      } else {
        (async () => {
          pushMessage({ from: "user", text: txt });
          setIsTyping(true);
          const base = botReply("ASK_CUSTOM_DATE_RETRY", {});
          const [reply] = await Promise.all([
            langRef.current === "hinglish"
              ? Promise.resolve(base)
              : localize(base.text, langRef.current).then((t) => ({ ...base, text: t })),
            new Promise((r) => setTimeout(r, TYPING_DELAY())),
          ]);
          setIsTyping(false);
          pushMessage({ from: "bot", ...reply, botStep: STEPS.ASK_CUSTOM_DATE });
        })();
      }
    }
  };

  const handlePickDestination = (city) => {
    // City was tapped from quick-reply — no date hint.
    const destination = extractDestination(city) || city;
    proceedFromDestination(destination, city, null);
  };

  const handlePickDate = (choice) => {
    if (choice === "Custom") {
      advance(STEPS.ASK_CUSTOM_DATE, { userText: "Custom" });
      return;
    }
    const hint = hintFromQuickChoice(choice);
    const slots = generateSlots();
    advance(STEPS.SHOW_SLOTS, {
      userText: choice,
      ctxPatch: { date: hint.iso, dateLabel: hint.label, slots },
    });
  };

  const handlePickSlot = (slot) => {
    advance(STEPS.ASK_BOARDING, {
      userText: `${slot.time} · ${slot.busType} · ₹${slot.fare}`,
      ctxPatch: { slot },
    });
  };

  const handlePickBoarding = (point) => {
    advance(STEPS.ASK_PASSENGERS, { userText: point, ctxPatch: { boarding: point } });
  };

  const handlePickPassengers = (count) => {
    const n = parseInt(count, 10) || 1;
    advance(STEPS.SHOW_SUMMARY, {
      userText: `${n} passenger${n > 1 ? "s" : ""}`,
      ctxPatch: { passengers: n },
    });
  };

  const handlePay = () => {
    setShowPayment(true);
    setStep(STEPS.PAYMENT);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    const passengers = context.passengers || 1;
    const fare = context.slot.fare;
    const total = fare * passengers;
    const body = {
      customer: "Guest User",
      route: `Mumbai → ${context.destination}`,
      date: context.dateLabel || context.date,
      time: context.slot.time,
      boarding: context.boarding,
      fare: total,
      perSeat: fare,
      passengers,
      busType: context.slot.busType,
    };
    let bookingId = "SCTT-XXXXX";
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        bookingId = data.id?.startsWith("SCTT-") ? data.id : `SCTT-${data.id}`;
      }
    } catch {
      bookingId = `SCTT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    }
    advance(STEPS.CONFIRMED, { ctxPatch: { bookingId } });
  };

  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleNewBooking = () => {
    setMessages([]);
    setContext({});
    setShowPayment(false);
    setInputText("");
    msgId = 0;
    initedRef.current = false;
    setStep(STEPS.GREETING);
    // Re-run the initial greeting.
    setTimeout(() => {
      initedRef.current = true;
      (async () => {
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, TYPING_DELAY()));
        setIsTyping(false);
        const reply = botReply(STEPS.GREETING, {});
        pushMessage({ from: "bot", ...reply, botStep: STEPS.GREETING });
        setStep(STEPS.ASK_DESTINATION);
      })();
    }, 50);
  };

  // ---------- Rendered cards ----------

  const renderBotExtras = (m, isLast) => {
    if (m.slots?.length) {
      const active = step === STEPS.SHOW_SLOTS && isLast;
      return (
        <div className="flex flex-col gap-2">
          {m.slots.map((s) => (
            <button
              key={s.id}
              disabled={!active}
              onClick={() => handlePickSlot(s)}
              className="group text-left border border-gray-200 rounded-xl p-2.5 bg-white hover:border-wa-greenBtn hover:shadow-card disabled:opacity-60 disabled:cursor-default transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wa-greenBtn to-wa-headerLight text-white flex items-center justify-center text-base">🚌</div>
                  <div>
                    <div className="text-[13px] font-semibold text-gray-800 tabular-nums">{s.time}</div>
                    <div className="text-[11px] text-gray-500">{s.operator}</div>
                  </div>
                </div>
                {s.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${s.badge === "Cheapest" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{s.badge}</span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">{s.busType}</span>
                  <span className="flex items-center gap-0.5 text-amber-500">★ <span className="text-gray-700">{s.rating}</span></span>
                  <span>·</span>
                  <span>{s.duration}</span>
                </div>
                <div className="font-bold text-wa-headerLight tabular-nums text-sm">₹{s.fare}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                <div className="flex gap-1">
                  {s.amenities.map((a) => (
                    <span key={a} className="px-1 py-0.5 rounded border border-gray-200">{a}</span>
                  ))}
                </div>
                <span className={s.seatsLeft < 10 ? "text-orange-600 font-semibold" : ""}>{s.seatsLeft} seats left</span>
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (m.summary) {
      const s = m.summary;
      const active = step === STEPS.SHOW_SUMMARY && isLast;
      return (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-wa-headerLight/10 to-wa-greenBtn/10 border-b border-gray-100">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Journey</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[13px] font-semibold text-gray-800">Mumbai</span>
              <svg viewBox="0 0 24 24" width="14" height="14" className="text-wa-greenBtn" fill="currentColor"><path d="M4 12h14m0 0l-5-5m5 5l-5 5"/></svg>
              <span className="text-[13px] font-semibold text-gray-800">{s.route.split("→")[1]?.trim()}</span>
            </div>
          </div>
          <div className="p-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium text-gray-800">{s.date}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Departure</span><span className="font-medium text-gray-800 tabular-nums">{s.time}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bus</span><span className="font-medium text-gray-800">{s.busType}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Boarding</span><span className="font-medium text-gray-800">{s.boarding}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Passengers</span><span className="font-medium text-gray-800">{s.passengers}</span></div>
            <div className="flex justify-between text-gray-500"><span>Per seat</span><span className="tabular-nums">₹{s.perSeat}</span></div>
            <div className="h-px bg-gray-100 my-1.5" />
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</span>
              <span className="text-xl font-bold text-wa-headerLight tabular-nums">₹{s.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
          {m.payButton && (
            <button
              disabled={!active}
              onClick={handlePay}
              className="w-full bg-wa-greenBtn hover:bg-wa-greenBtnHover text-white font-bold py-2.5 text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM4 8h16v2H4V8zm0 8v-4h16v4H4z"/></svg>
              Pay ₹{s.total.toLocaleString("en-IN")}
            </button>
          )}
        </div>
      );
    }

    if (m.ticket) {
      const t = m.ticket;
      return (
        <div className="border-2 border-dashed border-wa-greenBtn rounded-xl bg-gradient-to-br from-white to-green-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-dashed border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-wa-greenBtn text-white flex items-center justify-center">✓</div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">E-Ticket</div>
                <div className="text-[11px] text-gray-500">Confirmed</div>
              </div>
            </div>
            <div className="text-[10px] text-gray-500">SCTT Bus</div>
          </div>
          <div className="p-3 space-y-1 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold">{t.route.split("→")[0].trim()}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" className="text-wa-greenBtn" fill="currentColor"><path d="M4 12h14m0 0l-5-5m5 5l-5 5"/></svg>
              <span className="text-[13px] font-semibold">{t.route.split("→")[1]?.trim()}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1">
              <div><div className="text-[9px] text-gray-500 uppercase">Date</div><div className="font-semibold">{t.date}</div></div>
              <div><div className="text-[9px] text-gray-500 uppercase">Time</div><div className="font-semibold tabular-nums">{t.time}</div></div>
              <div><div className="text-[9px] text-gray-500 uppercase">Boarding</div><div className="font-semibold">{t.boarding}</div></div>
              <div><div className="text-[9px] text-gray-500 uppercase">Pax</div><div className="font-semibold">{t.passengers}</div></div>
            </div>
            <div className="h-px bg-gray-200 my-1.5" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-gray-500 uppercase">Booking ID</div>
                <button onClick={() => handleCopyId(t.bookingId)} className="font-mono text-[12px] font-bold text-wa-headerLight hover:underline">
                  {t.bookingId}
                </button>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-gray-500 uppercase">Amount</div>
                <div className="font-bold text-wa-headerLight tabular-nums">₹{t.total.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-200 p-2 flex gap-1.5">
            <button onClick={() => handleCopyId(t.bookingId)} className="flex-1 text-[11px] py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-medium">
              {copied ? "✓ Copied!" : "📋 Copy ID"}
            </button>
            <button onClick={handleNewBooking} className="flex-1 text-[11px] py-1.5 rounded-lg bg-wa-greenBtn hover:bg-wa-greenBtnHover text-white font-semibold">
              + New Booking
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const lastBotMsg = [...messages].reverse().find((m) => m.from === "bot");

  const pickHandlerFor = (botStep) => {
    if (botStep === STEPS.GREETING || botStep === STEPS.UNKNOWN_DESTINATION) return handlePickDestination;
    if (botStep === STEPS.ASK_DATE) return handlePickDate;
    if (botStep === STEPS.ASK_BOARDING) return handlePickBoarding;
    if (botStep === STEPS.ASK_PASSENGERS) return handlePickPassengers;
    return () => {};
  };

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="bg-gradient-to-b from-wa-header to-wa-headerDark text-white flex items-center pt-10 pb-2 px-3 gap-2.5 shrink-0 shadow-sm">
          <button className="opacity-80 hover:opacity-100 -ml-1" aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <div className="w-9 h-9 rounded-full avatar-sheen flex items-center justify-center font-bold text-sm">S</div>
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-[14px] font-semibold truncate">SCTT Bookings</div>
            <div className="text-[11px] text-white/80">{isTyping ? "typing…" : "online"}</div>
          </div>
          <div className="text-[10px] bg-white/15 rounded-full px-2 py-0.5 font-semibold tracking-wide" title={`Detected language: ${language}`}>
            {LANG_BADGE[language] || language.toUpperCase()}
          </div>
          <button className="opacity-80 hover:opacity-100" aria-label="Video call">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>
          <button className="opacity-80 hover:opacity-100" aria-label="Call">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
          </button>
          <button className="opacity-80 hover:opacity-100" aria-label="More">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 wa-doodle overflow-y-auto scrollbar-thin p-3 space-y-1.5">
          {messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const showTail = !prev || prev.from !== m.from;
            const isLast = idx === messages.length - 1;
            return (
              <MessageBubble key={m.id} from={m.from} text={m.text} timestamp={m.timestamp} showTail={showTail}>
                {m.from === "bot" && renderBotExtras(m, isLast)}
              </MessageBubble>
            );
          })}

          {isTyping && <TypingIndicator />}

          {!isTyping && lastBotMsg?.buttons && messages[messages.length - 1]?.id === lastBotMsg.id && (
            <div className="pt-1">
              <QuickReplies options={lastBotMsg.buttons} onPick={pickHandlerFor(lastBotMsg.botStep)} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div className="shrink-0 bg-[#F0F0F0] px-2 py-2 flex items-end gap-1.5 border-t border-gray-200">
          <div className="flex-1 bg-white rounded-3xl flex items-center pl-3 pr-1 py-1 shadow-sm">
            <button className="text-gray-500 hover:text-wa-headerLight mr-1" aria-label="Emoji" tabIndex={-1}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 17.5c-2.3 0-4.3-1.4-5.1-3.5h10.2c-.8 2.1-2.8 3.5-5.1 3.5z"/></svg>
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              disabled={!expectsFreeText || isTyping}
              placeholder={
                step === STEPS.ASK_DESTINATION || step === STEPS.UNKNOWN_DESTINATION
                  ? "Destination city…"
                  : step === STEPS.ASK_CUSTOM_DATE
                  ? "Type a date (e.g. 14th May)"
                  : "Tap an option above"
              }
              className="flex-1 py-1.5 text-[14px] focus:outline-none placeholder:text-gray-400 disabled:bg-transparent disabled:text-gray-400 bg-transparent"
            />
            <button className="text-gray-500 hover:text-wa-headerLight px-1" aria-label="Attach" tabIndex={-1}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5z"/></svg>
            </button>
            <button className="text-gray-500 hover:text-wa-headerLight px-1" aria-label="Camera" tabIndex={-1}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
            </button>
          </div>
          <button
            onClick={handleSendText}
            disabled={isTyping || (expectsFreeText && !inputText.trim())}
            className="shrink-0 w-11 h-11 rounded-full bg-wa-greenBtn hover:bg-wa-greenBtnHover text-white flex items-center justify-center shadow-md disabled:opacity-50 active:scale-90 transition-all"
            aria-label={inputText.trim() ? "Send" : "Voice"}
          >
            {inputText.trim() ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
            )}
          </button>
        </div>

        <PaymentModal open={showPayment} fare={(context.slot?.fare || 0) * (context.passengers || 1)} onSuccess={handlePaymentSuccess} />
      </div>
    </PhoneFrame>
  );
}
