import React from "react";

export default function QuickReplies({ options = [], onPick, variant = "pill" }) {
  if (!options.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1 pb-1 animate-slideUp">
      {options.map((opt) => (
        <button
          key={typeof opt === "string" ? opt : opt.value}
          onClick={() => onPick?.(typeof opt === "string" ? opt : opt.value)}
          className="group rounded-full border border-wa-greenBtn/60 text-wa-headerLight bg-white px-3.5 py-1 hover:bg-wa-greenBtn hover:text-white hover:border-wa-greenBtn text-[13px] font-medium shadow-sm active:scale-95 transition-all"
        >
          {typeof opt === "string" ? opt : opt.label}
        </button>
      ))}
    </div>
  );
}
