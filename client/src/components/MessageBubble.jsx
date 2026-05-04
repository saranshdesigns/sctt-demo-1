import React from "react";

const formatTime = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export default function MessageBubble({ from, text, timestamp, children, showTail = true }) {
  const isUser = from === "user";
  const wrapper = isUser ? "justify-end animate-slideInRight" : "justify-start animate-slideInLeft";
  const bubbleBase = "relative shadow-bubble px-2.5 py-1.5 max-w-[85%] text-[14px] text-gray-800 leading-snug";
  const bubbleColor = isUser
    ? `bg-wa-userBubble ${showTail ? "rounded-lg rounded-tr-none bubble-tail-right" : "rounded-lg"}`
    : `bg-white ${showTail ? "rounded-lg rounded-tl-none bubble-tail-left" : "rounded-lg"}`;

  return (
    <div className={`flex ${wrapper}`}>
      <div className={`${bubbleBase} ${bubbleColor}`}>
        {text && <div className="whitespace-pre-wrap break-words">{text}</div>}
        {children && <div className="mt-1.5">{children}</div>}
        <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-gray-500 leading-none">
          <span className="tabular-nums">{formatTime(timestamp)}</span>
          {isUser && (
            <svg viewBox="0 0 16 11" width="15" height="10" className="fill-wa-tick" aria-hidden="true">
              <path d="M11.071.653a.457.457 0 0 0-.304-.13.48.48 0 0 0-.35.13L4.857 6.526 2.388 4.056a.461.461 0 0 0-.653 0l-.74.74a.461.461 0 0 0 0 .654l3.524 3.524a.46.46 0 0 0 .653 0l6.642-6.642a.461.461 0 0 0 0-.653l-.743-.743z" />
              <path d="M15.071.653a.457.457 0 0 0-.304-.13.48.48 0 0 0-.35.13L8.857 6.526l-.696-.697-.74.74a.461.461 0 0 0 0 .654l1.089 1.088a.46.46 0 0 0 .653 0L15.81 2.05a.461.461 0 0 0 0-.653l-.74-.744z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
