"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState("reservations");
  const [reservations, setReservations] = useState<any[]>([]);
  const [properties, setProperties] = useState<string[]>([]);
  const [month, setMonth] = useState("2026-04");
  const [collapsed, setCollapsed] = useState(false);

  const [totals, setTotals] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (supabaseUrl && supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    } else {
      console.error("❌ Supabase no configurado correctamente");
      return null;
    }
  }, [supabaseUrl, supabaseKey]);
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase ENV missing:", supabaseUrl, supabaseKey);
  }
  const [names, setNames] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Dark mode state
  const [dark, setDark] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  // Toast for feedback UX
  const [toast, setToast] = useState("");
  const [debounceTimers, setDebounceTimers] = useState<Record<string, any>>({});

  const login = async () => {
    if (!supabase) return alert("Supabase no configurado");
    if (!email || !password) return alert("Faltan datos");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error.message);
      alert("Error: " + error.message);
    }
  };

  const register = async () => {
    if (!supabase) return alert("Supabase no configurado");
    if (!email || !password) return alert("Faltan datos");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Revisa tu correo para confirmar tu cuenta 📩");
    }
  };

  const logout = async () => {
    if (!supabase) return alert("Supabase no configurado");
    await supabase.auth.signOut();
    setUser(null);
  };

  const role = user?.email === "admin@demo.com" ? "admin" : "viewer";

  const normalize = (v: any) => String(v || "").trim();
  const getKey = (r: any) =>
    `${normalize(r.name)}|${normalize(r.checkIn).slice(0, 10)}|${normalize(r.checkOut).slice(0, 10)}`;

  // Airbnb reservation normalizer (stricter)
  const normalizeAirbnb = (r: any) => {
    // Use status already parsed from API
    if (r.status !== "Reserved") return null;

    return {
      name: r.name,
      checkIn: (r.checkIn || "").slice(0, 10),
      checkOut: (r.checkOut || "").slice(0, 10),
      total: r.total || "",
      status: "Reserved",
      channel: "Airbnb",
    };
  };

  // Clean iCal data: dedupe, remove invalid, stricter filtering
  const cleanIcalData = (events: any[]) => {
    const map = new Map();

    events.forEach((r) => {
      const normalized = normalizeAirbnb(r);

      // ❌ skip non-reservations
      if (!normalized) return;

      // ❌ skip invalid dates
      if (!normalized.checkIn || !normalized.checkOut) return;

      const start = new Date(normalized.checkIn);
      const end = new Date(normalized.checkOut);

      const key = `${normalized.name}|${normalized.checkIn}|${normalized.checkOut}`;

      map.set(key, normalized);
    });

    return Array.from(map.values());
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return `$${Number(num).toLocaleString()}`;
  };

  const handleTotalChange = (r: any, value: string) => {
    const key = getKey(r);
    const raw = value.replace(/[^0-9]/g, "");
    setTotals((prev) => ({ ...prev, [key]: raw }));
  };

  const handleNameChange = (r: any, value: string) => {
    const key = getKey(r);
    setNames((prev) => ({ ...prev, [key]: value }));
  };

  const toDate = (d: string) => {
    if (!d) return null;
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return d;
    }
  };
  // Auto-save a single reservation row to supabase
  const autoSaveRow = async (r: any) => {
    if (!supabase) return alert("Supabase no configurado");
    const key = getKey(r);
    setSaving((prev) => ({ ...prev, [key]: true }));

    const cleanTotal = (totals[key] || r.total || "").replace(/[^0-9]/g, "");
    // Do NOT overwrite if empty
    const payload: any = {
      property: r.name,
      check_in: toDate(r.checkIn),
      check_out: toDate(r.checkOut),
      user_id: user?.id,
    };
    if (cleanTotal) payload.total = cleanTotal;
    if (names[key]) payload.guest_name = names[key];

    const { error } = await supabase
      .from("reservations_manual")
      .upsert(payload, { onConflict: "property,check_in,check_out" });

    setSaving((prev) => ({ ...prev, [key]: false }));

    if (error) {
      console.error(error);
    }
  };

  const debouncedSave = (r: any) => {
    const key = getKey(r);

    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
    }

    const timer = setTimeout(() => {
      autoSaveRow(r);
    }, 800);

    setDebounceTimers((prev) => ({ ...prev, [key]: timer }));
  };
  // Save a single reservation row to supabase
  const saveRow = async (r: any) => {
    if (!supabase) return alert("Supabase no configurado");
    if (!user?.id) return alert("Usuario no autenticado");
    const key = getKey(r);
    setSaving((prev) => ({ ...prev, [key]: true }));

    const { error } = await supabase.from("reservations_manual").upsert(
      [
        {
          property: r.name,
          check_in: toDate(r.checkIn),
          check_out: toDate(r.checkOut),
          user_id: user.id,
          total:
            totals[key] || r.total
              ? String(totals[key] || r.total).replace(/[^0-9]/g, "")
              : null,
          guest_name: names[key] || null,
        },
      ],
      { onConflict: "property,check_in,check_out" },
    );

    setSaving((prev) => ({ ...prev, [key]: false }));

    if (error) {
      console.error(error);
      setSaving((prev) => ({ ...prev, [key]: false }));
      alert(error.message);
    } else {
      // Restore success feedback as toast
      setToast("Guardado ✅");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const saveAll = async () => {
    if (!supabase) return alert("Supabase no configurado");
    const rows: any[] = [];

    reservations.forEach((r) => {
      const key = getKey(r);

      if (totals[key] || names[key]) {
        rows.push({
          property: r.name,
          check_in: toDate(r.checkIn),
          check_out: toDate(r.checkOut),
          user_id: user?.id,
        });
      }
    });

    if (rows.length === 0) return alert("Nada que guardar");

    const { error } = await supabase
      .from("reservations_manual")
      .upsert(rows, { onConflict: "property,check_in,check_out" });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      alert("Guardado correctamente ✅");
    }
  };

  // Load user + listen auth changes
  useEffect(() => {
    if (!supabase) return;

    // 🔥 Force login screen always (ignore existing session)
    supabase.auth.signOut();
    setUser(null);
    setLoadingAuth(false);

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      },
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Load reservations
  useEffect(() => {
    fetch("/api/ical")
      .then((res) => res.json())
      .then((data) => {
        const raw = data.events || [];

        const cleaned = cleanIcalData(raw);

        setReservations(cleaned);
        console.log("CLEANED RESERVATIONS:", cleaned);
        setProperties(data.properties || []);
      })
      .catch(() => {
        console.error("Error loading iCal data");
      });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const loadFromDB = async () => {
      if (!supabase) return;
      const { data } = await supabase.from("reservations_manual").select("*");
      console.log("DB DATA:", data);
      if (data) {
        const totalsObj: any = {};
        const namesObj: any = {};

        data.forEach((row: any) => {
          const key = `${normalize(row.property)}|${normalize(row.check_in).slice(0, 10)}|${normalize(row.check_out).slice(0, 10)}`;

          if (row.total) {
            totalsObj[key] = String(row.total);
          }
          if (row.guest_name) namesObj[key] = row.guest_name;
        });

        setTotals((prev) => ({ ...prev, ...totalsObj }));
        setNames((prev) => ({ ...prev, ...namesObj }));
      }
    };

    loadFromDB();
  }, [user]);
  const propertyColors: Record<string, string> = {
    "VILLAS TOH": "bg-blue-500 text-white",
    "NEEA 102": "bg-green-500 text-white",
    "NEEA 103": "bg-purple-500 text-white",
    "NEEA 201": "bg-orange-500 text-white",
    "NEEA 202": "bg-pink-500 text-white",
    "NEEA 303": "bg-indigo-500 text-white",
  };
  const monthlyIncome = reservations.reduce((acc: any, r: any) => {
    const key = getKey(r);
    const checkIn = normalize(r.checkIn);
    const month = checkIn?.slice(0, 7);

    const raw = totals[key] || "";
    const amount = raw ? Number(String(raw).replace(/[^0-9]/g, "")) : 0;

    if (!acc[month]) acc[month] = 0;
    acc[month] += amount;

    return acc;
  }, {});

  const months = Object.keys(monthlyIncome).sort();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const userProperties = role === "admin" ? properties : properties.slice(0, 2);

  // ---------- COMPONENTS ----------

  // Sidebar and Header replaced by shadcn sidebar layout below

  // ---------- END COMPONENTS ----------

  return (
    <div>
      {loadingAuth ? (
        <div className="min-h-screen flex items-center justify-center">
          Cargando...
        </div>
      ) : !user ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              GreenState Login 🔐
            </h2>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full border px-3 py-2 rounded mb-3"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
            />

            <button
              onClick={isRegister ? register : login}
              className="w-full bg-green-600 text-white py-2 rounded mb-3"
            >
              {isRegister ? "Crear cuenta" : "Iniciar sesión"}
            </button>

            <p
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-gray-400 text-center cursor-pointer"
            >
              {isRegister
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿No tienes cuenta? Regístrate"}
            </p>
          </div>
        </div>
      ) : (
        <>
          {toast && (
            <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow">
              {toast}
            </div>
          )}
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <SidebarInset className="flex-1 bg-gray-100">
              {/* HEADER */}
              <header className="flex h-16 items-center gap-2 px-4 border-b bg-white">
                <SidebarTrigger className="-ml-1" />

                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Inicio</span>
                  <span className="font-semibold text-gray-700">
                    {view === "documentacion" ? "Documentación" : "Reservations"}
                  </span>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="border rounded px-3 py-1 text-sm"
                  />
                  <button
                    onClick={() => setDark(!dark)}
                    className="text-xs px-2 py-1 border rounded"
                  >
                    {dark ? "Light" : "Dark"}
                  </button>
                  <button
                    onClick={logout}
                    className="text-sm bg-gray-200 px-3 py-1 rounded"
                  >
                    Logout
                  </button>
                </div>
              </header>

              {/* CONTENT */}
              <div className="p-6 overflow-y-auto flex-1 pb-20">
                {view === "reservations" && (
                  <div>
                    <div className="space-y-6">
                      {/* CARDS */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">
                            Total Reservas
                          </p>
                          <p className="text-2xl font-semibold text-gray-800">
                            {reservations.length}
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">Días Ocupados</p>
                          <p className="text-2xl font-semibold text-gray-800">
                            {
                              new Set(
                                (Array.isArray(reservations)
                                  ? reservations
                                  : []
                                ).flatMap((r) => {
                                  const days = [];
                                  let current = new Date(r.checkIn);
                                  const end = new Date(r.checkOut);
                                  while (current <= end) {
                                    days.push(
                                      current.toISOString().slice(0, 10),
                                    );
                                    current.setDate(current.getDate() + 1);
                                  }
                                  return days;
                                }),
                              ).size
                            }
                          </p>
                        </div>

                        {/* NOCHES CARD */}
                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">Noches</p>
                          <p className="text-2xl font-semibold text-gray-800">
                            {reservations.reduce((acc, r) => {
                              const start = new Date(r.checkIn);
                              const end = new Date(r.checkOut);
                              return (
                                acc +
                                (end.getTime() - start.getTime()) /
                                  (1000 * 60 * 60 * 24)
                              );
                            }, 0)}
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">Propiedades</p>
                          <p className="text-2xl font-semibold text-gray-800">
                            {properties.length}
                          </p>
                        </div>

                        {/* SaaS Occupancy % card */}
                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">
                            Ocupación % (mes)
                          </p>
                          <p className="text-2xl font-semibold text-indigo-600">
                            {(() => {
                              const daysInMonth = new Date(month + "-01");
                              const lastDay = new Date(
                                daysInMonth.getFullYear(),
                                daysInMonth.getMonth() + 1,
                                0,
                              ).getDate();

                              const uniqueDays = new Set<string>();
                              reservations.forEach((r) => {
                                let d = new Date(r.checkIn);
                                const end = new Date(r.checkOut);
                                while (d <= end) {
                                  const ds = d.toISOString().slice(0, 10);
                                  if (ds.startsWith(month)) uniqueDays.add(ds);
                                  d.setDate(d.getDate() + 1);
                                }
                              });

                              const totalPossible =
                                lastDay *
                                (new Set(reservations.map((r) => r.name))
                                  .size || 1);
                              if (!totalPossible) return "0%";
                              const pct = Math.round(
                                (uniqueDays.size / totalPossible) * 100,
                              );
                              return `${pct}%`;
                            })()}
                          </p>
                        </div>

                        {/* ADR CARD */}
                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">ADR</p>
                          <p className="text-2xl font-semibold text-blue-600">
                            {(() => {
                              const paid = reservations.filter((r) => {
                                const key = getKey(r);
                                return totals[key];
                              });

                              const revenue = paid.reduce((acc, r) => {
                                const key = getKey(r);
                                return acc + Number(totals[key] || 0);
                              }, 0);

                              const nights = paid.reduce((acc, r) => {
                                const start = new Date(r.checkIn);
                                const end = new Date(r.checkOut);
                                return (
                                  acc +
                                  (end.getTime() - start.getTime()) /
                                    (1000 * 60 * 60 * 24)
                                );
                              }, 0);

                              if (!nights) return "$0";
                              return `$${Math.round(revenue / nights).toLocaleString()}`;
                            })()}
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition">
                          <p className="text-sm text-gray-400">
                            Ingresos Totales
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            $
                            {reservations
                              .reduce((acc, r) => {
                                const key = getKey(r);
                                const raw = totals[key] || "";
                                const amount = raw
                                  ? Number(String(raw).replace(/[^0-9]/g, ""))
                                  : 0;
                                return acc + amount;
                              }, 0)
                              .toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* GRAFICA SIMPLE */}
                      <div className="bg-white rounded-2xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Ocupación (visual)
                        </h3>

                        <div className="flex items-end gap-2 h-32">
                          {(() => {
                            const today = new Date();

                            const days = Array.from({ length: 7 }).map(
                              (_, i) => {
                                const d = new Date();
                                d.setDate(today.getDate() - (6 - i));
                                return d;
                              },
                            );

                            const counts = days.map((day) => {
                              const dayStr = day.toISOString().slice(0, 10);
                              return reservations.filter((r) => {
                                return (
                                  dayStr >= r.checkIn && dayStr <= r.checkOut
                                );
                              }).length;
                            });

                            const max = Math.max(...counts, 1);

                            return counts.map((count, i) => (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center"
                              >
                                <div
                                  className="w-full bg-blue-500 rounded-t"
                                  style={{
                                    height:
                                      count > 0
                                        ? `${(count / max) * 100}%`
                                        : "6px",
                                    minHeight: count > 0 ? "20px" : "6px",
                                  }}
                                />
                                <span className="text-[10px] text-gray-400 mt-1">
                                  {days[i].getDate()}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* SaaS Revenue Trend (line-style visual) */}
                      <div className="bg-white rounded-2xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Tendencia ingresos 📈
                        </h3>

                        <div className="flex items-end gap-2 h-40">
                          {months.map((m, i) => {
                            const value = monthlyIncome[m] || 0;
                            const max = Math.max(
                              ...Object.values(monthlyIncome),
                              1,
                            );
                            const height = (value / max) * 100;

                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center"
                              >
                                <div
                                  className="w-full bg-purple-500 rounded-t"
                                  style={{
                                    height: `${height}%`,
                                    minHeight: "6px",
                                  }}
                                />
                                <span className="text-[10px] text-gray-400 mt-1">
                                  {new Date(m + "-01").toLocaleString("es-MX", {
                                    month: "short",
                                  })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* MONTHLY INCOME DASHBOARD */}
                      <div className="bg-white rounded-2xl border p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Ingresos por mes 💰
                          </h3>
                          <span className="text-xs text-gray-400">
                            Vista mensual
                          </span>
                        </div>

                        {months.length === 0 && (
                          <div className="text-center text-gray-400 text-sm py-10">
                            No hay ingresos registrados 📉
                          </div>
                        )}

                        {months.length > 0 &&
                          (() => {
                            const values = Object.values(
                              monthlyIncome,
                            ) as number[];
                            // Normalize and cap the chart scale
                            const rawMax = Math.max(...values, 1);

                            // Round max to a cleaner scale (Airbnb style)
                            let max;
                            if (rawMax <= 500000) {
                              max = 500000;
                            } else if (rawMax <= 1000000) {
                              max = 1000000;
                            } else {
                              max = Math.ceil(rawMax / 500000) * 500000;
                            }

                            return (
                              <div className="relative h-64">
                                {/* GRID LINES */}
                                <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-300">
                                  {[100, 75, 50, 25, 0].map((p) => (
                                    <div
                                      key={p}
                                      className="border-t border-gray-200 relative"
                                    >
                                      <span className="absolute -top-2 left-0">
                                        $
                                        {Math.round(
                                          max * (p / 100),
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* BARS */}
                                <div className="absolute inset-0 flex items-end gap-6 pt-4">
                                  {months.map((m, i) => {
                                    const value = monthlyIncome[m] || 0;
                                    const height = (value / max) * 100;

                                    return (
                                      <div
                                        key={i}
                                        className="flex-1 flex flex-col items-center group"
                                      >
                                        <div
                                          className="w-full max-w-[40px] bg-green-500 rounded-lg shadow-md transition-all duration-300 hover:bg-green-600"
                                          style={{
                                            height:
                                              value > 0 ? `${height}%` : "6px",
                                            minHeight:
                                              value > 0 ? "30px" : "6px",
                                          }}
                                        />

                                        <span className="text-xs text-gray-500 mt-2">
                                          {new Date(m + "-01").toLocaleString(
                                            "es-MX",
                                            {
                                              month: "short",
                                            },
                                          )}
                                        </span>

                                        <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition">
                                          ${value.toLocaleString()}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                      </div>

                      {/* SaaS Top Property Ranking */}
                      <div className="bg-white rounded-2xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Top propiedades 🏆
                        </h3>

                        {Array.from(new Set(reservations.map((r) => r.name)))
                          .map((prop) => {
                            const propReservations = reservations.filter(
                              (r) => r.name === prop,
                            );

                            const revenue = propReservations.reduce(
                              (acc, r) => {
                                const key = getKey(r);
                                return acc + Number(totals[key] || 0);
                              },
                              0,
                            );

                            return {
                              prop,
                              revenue,
                              count: propReservations.length,
                            };
                          })
                          .sort((a, b) => b.revenue - a.revenue)
                          .slice(0, 5)
                          .map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between py-2 border-b text-sm"
                            >
                              <span className="font-medium text-gray-700">
                                {item.prop}
                              </span>
                              <span className="text-gray-500">
                                ${item.revenue.toLocaleString()} · {item.count}{" "}
                                reservas
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* MULTI PROPIEDADES */}
                      <div className="bg-white rounded-2xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Propiedades
                        </h3>

                        {[
                          "VILLAS TOH",
                          "NEEA 102",
                          "NEEA 103",
                          "NEEA 201",
                          "NEEA 202",
                          "NEEA 303",
                        ].map((prop) => {
                          const propReservations = reservations.filter(
                            (r) => r.name === prop,
                          );

                          const totalIncome = propReservations.reduce(
                            (acc, r) => {
                              const key = getKey(r);
                              const raw = totals[key] || "";
                              const amount = raw
                                ? Number(String(raw).replace(/[^0-9]/g, ""))
                                : 0;
                              return acc + amount;
                            },
                            0,
                          );

                          return (
                            <div
                              key={prop}
                              className="flex justify-between items-center border-b py-3"
                            >
                              <span className="font-medium text-gray-700">
                                {prop}
                              </span>
                              <span className="text-sm text-gray-500">
                                {propReservations.length} reservas · $
                                {totalIncome.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="bg-white rounded-lg border">
                        {/* TABLE HEADER */}
                        <div className="grid grid-cols-7 text-sm font-medium text-gray-700 border-b p-3">
                          <div>Guest</div>
                          <div>Check-in</div>
                          <div>Check-out</div>
                          <div>Channel</div>
                          <div className="text-center">Total</div>
                          <div className="text-center">Nombre</div>
                          <div>Status</div>
                        </div>

                        {/* DYNAMIC ROWS */}
                        {reservations
                          .sort(
                            (a, b) =>
                              new Date(a.checkIn).getTime() -
                              new Date(b.checkIn).getTime(),
                          )
                          .filter((r) => {
                            const key = getKey(r);
                            const guest = (names[key] || "").toLowerCase();
                            const searchText = search.toLowerCase();

                            const matchesProperty =
                              r.name.toLowerCase().includes(searchText) &&
                              userProperties.includes(r.name);

                            const matchesGuest = guest.includes(searchText);

                            return matchesProperty || matchesGuest;
                          })
                          .map((r, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-7 p-3 text-sm text-gray-800 border-b hover:bg-gray-100 hover:shadow-sm transition"
                            >
                              <div className="font-medium text-gray-900">
                                {r.name}
                              </div>
                              <div>{r.checkIn}</div>
                              <div>{r.checkOut}</div>
                              <div>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    r.channel === "Website"
                                      ? "bg-orange-100 text-orange-600"
                                      : "bg-blue-100 text-blue-600"
                                  }`}
                                >
                                  {r.channel}
                                </span>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                {editing[getKey(r)] ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 text-sm">
                                      $
                                    </span>
                                    <input
                                      autoFocus
                                      value={
                                        typeof totals[getKey(r)] === "string"
                                          ? totals[getKey(r)]
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const raw = String(
                                          e.target.value || "",
                                        ).replace(/[^0-9]/g, "");
                                        setTotals((prev) => ({
                                          ...prev,
                                          [getKey(r)]: raw === "" ? "" : raw,
                                        }));

                                        debouncedSave(r);
                                      }}
                                      onBlur={() => {
                                        // delay to allow typing stability
                                        setTimeout(() => {
                                          setEditing((prev) => ({
                                            ...prev,
                                            [getKey(r)]: false,
                                          }));
                                        }, 150);
                                      }}
                                      placeholder="   "
                                      className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-800 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                  </div>
                                ) : (
                                  <div
                                    onClick={() =>
                                      setEditing((prev) => ({
                                        ...prev,
                                        [getKey(r)]: true,
                                      }))
                                    }
                                    className="flex items-center justify-center cursor-pointer hover:bg-gray-200 px-2 py-1 rounded-md transition"
                                  >
                                    <span className="text-sm font-semibold text-green-600">
                                      {(() => {
                                        const raw = String(
                                          totals[getKey(r)] ?? r.total ?? "",
                                        ).replace(/[^0-9]/g, "");
                                        if (!raw) return "";
                                        const num = parseInt(raw, 10);
                                        if (isNaN(num)) return "";
                                        return `$${num.toLocaleString()}`;
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-center items-center">
                                {editingName[getKey(r)] ? (
                                  <>
                                    <input
                                      autoFocus
                                      value={names[getKey(r)] || ""}
                                      onChange={(e) => {
                                        handleNameChange(r, e.target.value);
                                        debouncedSave(r);
                                      }}
                                      onBlur={() =>
                                        setEditingName((prev) => ({
                                          ...prev,
                                          [getKey(r)]: false,
                                        }))
                                      }
                                      placeholder="Nombre"
                                      className="w-28 bg-white border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </>
                                ) : (
                                  <span
                                    onClick={() =>
                                      setEditingName((prev) => ({
                                        ...prev,
                                        [getKey(r)]: true,
                                      }))
                                    }
                                    className="w-28 text-center text-sm text-gray-700 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-md"
                                  >
                                    {names[getKey(r)] || "---"}
                                  </span>
                                )}
                              </div>
                              {saving[getKey(r)] && (
                                <span className="text-[10px] text-gray-400">
                                  Guardando...
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    r.status === "Reserved"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {r.status}
                                </span>
                                <button
                                  onClick={() => saveRow(r)}
                                  disabled={saving[getKey(r)]}
                                  className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  {saving[getKey(r)] ? "..." : "Guardar"}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6">
                          <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">
                            {new Date(month + "-01").toLocaleString("es-MX", {
                              month: "long",
                              year: "numeric",
                            })}
                          </h2>

                          <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="border border-gray-200 px-3 py-1.5 rounded-lg text-sm bg-gray-50"
                          >
                            <option value="2026-04">Abril 2026</option>
                            <option value="2026-05">Mayo 2026</option>
                            <option value="2026-06">Junio 2026</option>
                          </select>
                        </div>

                        {/* WEEK DAYS */}
                        <div className="grid grid-cols-7 text-xs text-gray-400 mb-3 px-2">
                          {[
                            "lun.",
                            "mar.",
                            "mié.",
                            "jue.",
                            "vie.",
                            "sáb.",
                            "dom.",
                          ].map((d) => (
                            <div key={d} className="text-center">
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* CALENDARIO GRID */}
                        <div className="grid grid-cols-7 gap-6 relative">
                          {Array.from({ length: 30 }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${month}-${String(day).padStart(2, "0")}`;

                            const dayReservations = reservations.filter((r) => {
                              return (
                                dateStr >= r.checkIn && dateStr <= r.checkOut
                              );
                            });

                            return (
                              <div
                                key={day}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`bg-gray-50 border border-gray-200 rounded-2xl p-3 h-32 flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition cursor-pointer ${
                                  dateStr === todayStr
                                    ? "border-blue-500 bg-blue-50"
                                    : ""
                                } ${
                                  selectedDate === dateStr
                                    ? "ring-2 ring-blue-400"
                                    : ""
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-700">
                                  {day}
                                </div>

                                <div className="space-y-1">
                                  {dayReservations.slice(0, 2).map((r, idx) => (
                                    <div
                                      key={idx}
                                      title={`${r.name} - ${names[getKey(r)] || "Guest"} (${r.checkIn} → ${r.checkOut})`}
                                      className={`text-[10px] px-2 py-1 rounded-full truncate hover:scale-105 transition ${
                                        propertyColors[r.name] ||
                                        "bg-gray-200 text-gray-700"
                                      }`}
                                    >
                                      {r.name} · {names[getKey(r)] || "Guest"}
                                    </div>
                                  ))}

                                  {dayReservations.length > 2 && (
                                    <div className="text-[10px] text-blue-500 font-medium">
                                      +{dayReservations.length - 2} más
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {view === "documentacion" && (
                  <div className="grid grid-cols-3 gap-6">
                    <div
                      onClick={() => router.push("/documentacion/neea")}
                      className="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-800">
                        NEEA
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        Documentación de propiedades NEEA
                      </p>
                    </div>

                    <div
                      onClick={() => router.push("/documentacion/toh")}
                      className="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-800">
                        Villas TOH
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        Documentación Villas TOH
                      </p>
                    </div>

                    <div
                      onClick={() => router.push("/documentacion/puebla")}
                      className="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-800">
                        Puebla
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        Documentación Puebla
                      </p>
                    </div>
                  </div>
                )}
              </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </>
      )}
    </div>
  );
}
