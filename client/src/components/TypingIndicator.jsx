import React from "react";

export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-slideInLeft">
      <div className="relative bg-white rounded-lg rounded-tl-none bubble-tail-left shadow-bubble px-3 py-2.5">
        <div className="flex items-center gap-1 h-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-typingDot" style={{ animationDelay: "0s" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-typingDot" style={{ animationDelay: "0.15s" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-typingDot" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}
