/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        wa: {
          header: "#075E54",
          headerDark: "#054C44",
          headerLight: "#128C7E",
          bg: "#ECE5DD",
          userBubble: "#DCF8C6",
          userBubbleDark: "#C7EDA5",
          tick: "#34B7F1",
          greenBtn: "#25D366",
          greenBtnHover: "#1EBE5A",
        },
      },
      boxShadow: {
        bubble: "0 1px 0.5px rgba(0,0,0,0.13)",
        iphone: "0 30px 60px -15px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.05) inset",
        card: "0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        toast: "0 10px 30px -10px rgba(0,0,0,0.3)",
      },
      keyframes: {
        typingDot: { "0%,60%,100%": { transform: "translateY(0)", opacity: "0.4" }, "30%": { transform: "translateY(-4px)", opacity: "1" } },
        flashGreen: { "0%": { backgroundColor: "#bbf7d0" }, "100%": { backgroundColor: "transparent" } },
        slideUp: { "0%": { transform: "translateY(12px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        slideInRight: { "0%": { transform: "translateX(10px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        slideInLeft: { "0%": { transform: "translateX(-10px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        toastIn: { "0%": { transform: "translateY(-120%)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        drawCheck: { "0%": { strokeDashoffset: "48" }, "100%": { strokeDashoffset: "0" } },
        drawCircle: { "0%": { strokeDashoffset: "170" }, "100%": { strokeDashoffset: "0" } },
        confettiFall: { "0%": { transform: "translateY(-100%) rotate(0deg)", opacity: "1" }, "100%": { transform: "translateY(800%) rotate(720deg)", opacity: "0" } },
        sheetUp: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "translateY(0)" } },
        pulseRing: { "0%": { transform: "scale(0.8)", opacity: "1" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
      },
      animation: {
        typingDot: "typingDot 1.2s infinite ease-in-out",
        flashGreen: "flashGreen 2s ease-out forwards",
        slideUp: "slideUp 0.25s ease-out",
        slideInRight: "slideInRight 0.22s ease-out",
        slideInLeft: "slideInLeft 0.22s ease-out",
        toastIn: "toastIn 0.3s cubic-bezier(0.2,0.8,0.2,1)",
        drawCheck: "drawCheck 0.5s ease-out 0.4s forwards",
        drawCircle: "drawCircle 0.6s ease-out forwards",
        confettiFall: "confettiFall 2.5s linear forwards",
        sheetUp: "sheetUp 0.3s cubic-bezier(0.2,0.8,0.2,1)",
        pulseRing: "pulseRing 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};
