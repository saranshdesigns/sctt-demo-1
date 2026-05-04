import React from "react";

export default function PhoneFrame({ children }) {
  return (
    <>
      <div className="md:hidden h-screen w-screen">{children}</div>

      <div className="hidden md:flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-neutral-100 to-slate-200 p-6">
        <div className="relative" style={{ width: "390px", height: "820px" }}>
          {/* Side buttons (pure decoration) */}
          <div className="absolute -left-1 top-28 w-1 h-10 rounded-l bg-neutral-700" />
          <div className="absolute -left-1 top-44 w-1 h-16 rounded-l bg-neutral-700" />
          <div className="absolute -left-1 top-64 w-1 h-16 rounded-l bg-neutral-700" />
          <div className="absolute -right-1 top-40 w-1 h-24 rounded-r bg-neutral-700" />

          {/* Outer bezel */}
          <div
            className="relative w-full h-full bg-neutral-900 rounded-[54px] p-[10px] shadow-iphone"
            style={{ boxShadow: "0 30px 60px -15px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.05) inset" }}
          >
            {/* Inner screen */}
            <div className="relative w-full h-full bg-white rounded-[44px] overflow-hidden">
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-30" />
              {/* Status bar with time + battery */}
              <div className="absolute top-0 left-0 right-0 h-12 z-20 flex items-center justify-between px-7 pt-1 pointer-events-none">
                <div className="text-[13px] font-semibold text-white tabular-nums">9:41</div>
                <div className="flex items-center gap-1 text-white">
                  <svg viewBox="0 0 18 12" width="16" height="11" fill="currentColor" aria-hidden="true">
                    <rect x="0" y="8" width="3" height="4" rx="0.5" />
                    <rect x="4.5" y="6" width="3" height="6" rx="0.5" />
                    <rect x="9" y="3" width="3" height="9" rx="0.5" />
                    <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
                  </svg>
                  <svg viewBox="0 0 18 12" width="16" height="11" fill="currentColor" aria-hidden="true">
                    <path d="M9 2.5c2.5 0 4.5 1 6 2.5l1.2-1.2A10.5 10.5 0 0 0 9 1 10.5 10.5 0 0 0 1.8 3.8L3 5A8.5 8.5 0 0 1 9 2.5zM9 6.5c1.5 0 2.8.5 3.8 1.4l1.1-1.1A6.5 6.5 0 0 0 9 5a6.5 6.5 0 0 0-4.9 1.8l1.1 1.1A5 5 0 0 1 9 6.5zM9 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                  </svg>
                  <div className="flex items-center">
                    <div className="w-5 h-2.5 border border-white rounded-sm relative">
                      <div className="absolute inset-0.5 bg-white rounded-[1px]" />
                    </div>
                    <div className="w-0.5 h-1 bg-white rounded-r ml-0.5" />
                  </div>
                </div>
              </div>
              {/* Content */}
              <div className="relative w-full h-full">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
