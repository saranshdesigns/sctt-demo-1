import React, { useEffect, useState } from "react";

const CONFETTI_COLORS = ["#25D366", "#128C7E", "#34B7F1", "#FFC107", "#FF7043", "#AB47BC"];

export default function PaymentModal({ open, fare, onSuccess }) {
  const [phase, setPhase] = useState("processing");

  useEffect(() => {
    if (!open) {
      setPhase("processing");
      return;
    }
    setPhase("processing");
    const t1 = setTimeout(() => setPhase("success"), 1800);
    const t2 = setTimeout(() => onSuccess?.(), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, onSuccess]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:w-[340px] animate-sheetUp shadow-2xl overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {phase === "processing" ? (
          <div className="px-6 py-8 flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-wa-greenBtn animate-spin" />
              <div className="text-2xl">💳</div>
            </div>
            <div className="mt-5 text-base font-semibold text-gray-800">Processing payment</div>
            <div className="mt-1 text-xs text-gray-500">Please wait, do not close this window</div>
            {typeof fare === "number" && (
              <div className="mt-4 px-3 py-1 rounded-full bg-gray-50 text-sm font-semibold text-gray-700 tabular-nums">
                ₹{fare.toLocaleString("en-IN")}
              </div>
            )}
            <div className="mt-5 flex items-center gap-2 text-[11px] text-gray-400">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
              Secured by SCTT Pay
            </div>
          </div>
        ) : (
          <div className="relative px-6 py-8 flex flex-col items-center overflow-hidden">
            {/* Confetti */}
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 24 }).map((_, i) => {
                const left = (i * 4.1) % 100;
                const delay = (i % 8) * 0.05;
                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                const size = 6 + (i % 3) * 2;
                return (
                  <span
                    key={i}
                    className="absolute top-0 block animate-confettiFall"
                    style={{
                      left: `${left}%`,
                      width: `${size}px`,
                      height: `${size * 0.5}px`,
                      backgroundColor: color,
                      animationDelay: `${delay}s`,
                      borderRadius: "2px",
                    }}
                  />
                );
              })}
            </div>

            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg viewBox="0 0 60 60" className="w-20 h-20" aria-hidden="true">
                <circle cx="30" cy="30" r="27" fill="none" stroke="#25D366" strokeWidth="3"
                        strokeDasharray="170" strokeLinecap="round" className="animate-drawCircle" />
                <path d="M18 31 L27 40 L43 22" fill="none" stroke="#25D366" strokeWidth="4"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="48" strokeDashoffset="48"
                      className="animate-drawCheck" />
              </svg>
            </div>

            <div className="mt-4 text-lg font-bold text-wa-headerLight">Payment Successful</div>
            {typeof fare === "number" && (
              <div className="mt-1 text-xs text-gray-500 tabular-nums">
                ₹{fare.toLocaleString("en-IN")} paid via SCTT Pay
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
