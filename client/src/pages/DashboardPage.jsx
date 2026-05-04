import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { socket } from "../utils/socket.js";

// --- Small helpers ------------------------------------------------------

function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      setVal(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

function Sparkline({ points, height = 40 }) {
  if (!points.length) {
    return <div className="h-10 flex items-center justify-center text-[11px] text-gray-400">No data yet</div>;
  }
  const max = Math.max(1, ...points);
  const w = 200;
  const h = height;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const pathD = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25D366" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#25D366" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkFill)" />
      <path d={pathD} fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.length > 0 && <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3" fill="#25D366" />}
    </svg>
  );
}

function downloadCSV(bookings) {
  const header = ["Booking ID","Customer","Route","Date","Time","Boarding","Passengers","Bus","Fare","Status","CreatedAt"];
  const rows = bookings.map((b) => [
    b.id, b.customer, b.route, b.date, b.time, b.boarding, b.passengers ?? 1, b.busType ?? "", b.fare ?? 0, b.status ?? "", b.createdAt ?? "",
  ]);
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sctt-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const avatarColor = (s) => {
  let hash = 0;
  for (let i = 0; i < String(s).length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hues = [180, 200, 220, 150, 280, 330, 20, 50];
  return `hsl(${hues[hash % hues.length]}, 55%, 52%)`;
};

const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// --- Main component -----------------------------------------------------

export default function DashboardPage() {
  const [bookings, setBookings] = useState([]);
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const timersRef = useRef(new Map());
  const toastTimersRef = useRef(new Map());

  const flashRow = (id) => {
    setFlashIds((prev) => new Set(prev).add(id));
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev); next.delete(id); return next;
      });
      timersRef.current.delete(id);
    }, 2000);
    timersRef.current.set(id, t);
  };

  const pushToast = (booking) => {
    const tid = `t-${booking.id}-${Date.now()}`;
    setToasts((prev) => [{ tid, booking }, ...prev].slice(0, 3));
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.tid !== tid));
      toastTimersRef.current.delete(tid);
    }, 4500);
    toastTimersRef.current.set(tid, t);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bookings").then((r) => r.ok ? r.json() : []).then((data) => {
      if (!cancelled && Array.isArray(data)) setBookings(data);
    }).catch(() => {});

    const onSnapshot = (list) => { if (Array.isArray(list)) setBookings(list); };
    const onNew = (b) => {
      if (!b || !b.id) return;
      setBookings((prev) => prev.some((x) => x.id === b.id) ? prev : [b, ...prev]);
      flashRow(b.id);
      pushToast(b);
    };

    socket.on("bookings-snapshot", onSnapshot);
    socket.on("new-booking", onNew);
    return () => {
      cancelled = true;
      socket.off("bookings-snapshot", onSnapshot);
      socket.off("new-booking", onNew);
      timersRef.current.forEach((t) => clearTimeout(t));
      toastTimersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      toastTimersRef.current.clear();
    };
  }, []);

  // Metrics
  const todayStr = new Date().toDateString();
  const yesterdayDate = new Date(Date.now() - 86400000).toDateString();

  const totalRevenue = bookings.reduce((s, b) => s + (Number(b.fare) || 0), 0);
  const todayCount = bookings.filter((b) => b.createdAt && new Date(b.createdAt).toDateString() === todayStr).length;
  const yesterdayCount = bookings.filter((b) => b.createdAt && new Date(b.createdAt).toDateString() === yesterdayDate).length;
  const todayDelta = todayCount - yesterdayCount;

  const animTotal = useCountUp(bookings.length);
  const animRevenue = useCountUp(totalRevenue);
  const animToday = useCountUp(todayCount);

  // Sparkline = bookings per hour for the last 12 hours.
  const sparkData = useMemo(() => {
    const buckets = new Array(12).fill(0);
    const now = Date.now();
    bookings.forEach((b) => {
      if (!b.createdAt) return;
      const age = now - new Date(b.createdAt).getTime();
      const h = Math.floor(age / 3600000);
      if (h >= 0 && h < 12) buckets[11 - h]++;
    });
    return buckets;
  }, [bookings]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => {
        if (statusFilter !== "all" && (b.status || "").toLowerCase() !== statusFilter) return false;
        if (!q) return true;
        return [b.id, b.customer, b.route, b.boarding, b.busType, b.time]
          .some((v) => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookings, search, statusFilter]);

  const StatusBadge = ({ status }) => {
    const ok = (status || "").toLowerCase() === "confirmed";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${ok ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-gray-400"}`} />
        {status || "—"}
      </span>
    );
  };

  const MetricCard = ({ label, value, sub, icon, trend }) => (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums">{value}</div>
          {sub && <div className="mt-1 text-[11px] text-gray-500">{sub}</div>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wa-greenBtn/10 to-wa-headerLight/10 flex items-center justify-center text-lg">
          {icon}
        </div>
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
          <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" className={trend < 0 ? "rotate-180" : ""}><path d="M6 2l5 6H7v4H5V8H1z" /></svg>
          {trend >= 0 ? "+" : ""}{trend} vs yesterday
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-gray-800">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] pointer-events-none">
        {toasts.map(({ tid, booking }) => (
          <div key={tid} className="toast-card rounded-lg shadow-toast px-4 py-3 pointer-events-auto animate-toastIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-wa-greenBtn">New Booking</div>
                <div className="font-semibold text-gray-900 text-sm truncate mt-0.5">{booking.route}</div>
                <div className="text-xs text-gray-500 mt-0.5 font-mono">{booking.id} · ₹{Number(booking.fare || 0).toLocaleString("en-IN")}</div>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.tid !== tid))}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wa-greenBtn to-wa-headerLight text-white flex items-center justify-center text-xl shadow-md">🚌</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">SCTT Operator Dashboard</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="relative inline-flex">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse absolute inline-flex opacity-60" />
                      <span className="w-2 h-2 rounded-full bg-green-500 relative inline-flex" />
                    </span>
                    <span className="text-green-700 font-semibold">Live</span>
                  </span>
                  <span>·</span>
                  <span>Real-time bookings from WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCSV(filtered)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 20h14v-2H5v2zm7-18l-5 5h3v6h4v-6h3l-5-5z"/></svg>
              Export CSV
            </button>
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline">
              ← Back to Chat
            </Link>
          </div>
        </div>

        {/* Metrics + sparkline */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Bookings" value={animTotal.toLocaleString("en-IN")} icon="🎟️" />
          <MetricCard label="Total Revenue" value={`₹${animRevenue.toLocaleString("en-IN")}`} icon="💰" />
          <MetricCard
            label="Today's Bookings"
            value={animToday}
            trend={todayDelta}
            icon="📅"
          />
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Last 12 Hours</div>
                <div className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{sparkData.reduce((a, b) => a + b, 0)}</div>
                <div className="text-[11px] text-gray-500">bookings trend</div>
              </div>
            </div>
            <div className="mt-2">
              <Sparkline points={sparkData} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-3 mb-4 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <svg viewBox="0 0 24 24" width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="currentColor"><path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, customer, route, boarding…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-wa-greenBtn text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-wa-greenBtn"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <span className="text-xs text-gray-500 px-2">{filtered.length} of {bookings.length}</span>
        </div>

        {/* Table / list */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Bookings</h2>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              {bookings.length === 0 ? (
                <>No bookings yet. Go to <Link to="/" className="text-wa-greenBtn underline font-medium">chat</Link> and make one.</>
              ) : (
                <>No matches for the current filters.</>
              )}
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2.5">Booking</th>
                      <th className="text-left font-semibold px-4 py-2.5">Customer</th>
                      <th className="text-left font-semibold px-4 py-2.5">Route</th>
                      <th className="text-left font-semibold px-4 py-2.5">Travel</th>
                      <th className="text-left font-semibold px-4 py-2.5">Boarding</th>
                      <th className="text-left font-semibold px-4 py-2.5">Pax</th>
                      <th className="text-right font-semibold px-4 py-2.5">Fare</th>
                      <th className="text-left font-semibold px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((b) => (
                      <tr key={b.id} className={`${flashIds.has(b.id) ? "animate-flashGreen" : ""} hover:bg-gray-50/60 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="font-mono text-[12px] font-semibold text-gray-800">{b.id}</div>
                          <div className="text-[10px] text-gray-400">{b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: avatarColor(b.customer) }}>
                              {initials(b.customer)}
                            </div>
                            <div className="text-gray-900 font-medium text-[13px]">{b.customer}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-[13px]">{b.route}</td>
                        <td className="px-4 py-3 text-gray-700 text-[13px]">
                          <div>{b.date}</div>
                          <div className="text-[11px] text-gray-500 tabular-nums">{b.time}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-[13px]">{b.boarding}</td>
                        <td className="px-4 py-3 text-gray-700 text-[13px] tabular-nums">{b.passengers ?? 1}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">₹{Number(b.fare || 0).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map((b) => (
                  <div key={b.id} className={`${flashIds.has(b.id) ? "animate-flashGreen" : ""} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: avatarColor(b.customer) }}>
                          {initials(b.customer)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{b.customer}</div>
                          <div className="font-mono text-[10px] text-gray-500">{b.id}</div>
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-sm text-gray-700">{b.route}</div>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-3 mt-2 text-xs text-gray-600">
                      <div><span className="text-gray-400">Date:</span> {b.date}</div>
                      <div className="tabular-nums"><span className="text-gray-400">Time:</span> {b.time}</div>
                      <div><span className="text-gray-400">Boarding:</span> {b.boarding}</div>
                      <div className="text-gray-900 font-semibold tabular-nums">₹{Number(b.fare || 0).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-[11px] text-gray-400">
          SCTT Demo · WhatsApp chatbot booking console
        </div>
      </div>
    </div>
  );
}
