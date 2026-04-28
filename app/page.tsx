"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
export default function Home() {
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
  console.log("SUPABASE URL:", supabaseUrl);
  const [names, setNames] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  // Toast for feedback UX
  const [toast, setToast] = useState("");

  const login = async () => {
    if (!supabase) return alert("Supabase no configurado");
    await supabase.auth.signInWithOtp({ email });
    alert("Revisa tu correo 📩");
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

    const cleanTotal = (totals[key] || "").replace(/[^0-9]/g, "");
    // Do NOT overwrite if empty
    const payload: any = {
      property: r.name,
      check_in: toDate(r.checkIn),
      check_out: toDate(r.checkOut),
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
  // Save a single reservation row to supabase
  const saveRow = async (r: any) => {
    if (!supabase) return alert("Supabase no configurado");
    const key = getKey(r);

    const { error } = await supabase.from("reservations_manual").upsert(
      [
        {
          property: r.name,
          check_in: toDate(r.checkIn),
          check_out: toDate(r.checkOut),
          total: totals[key]
            ? String(totals[key]).replace(/[^0-9]/g, "")
            : null,
          guest_name: names[key] || null,
        },
      ],
      { onConflict: "property,check_in,check_out" },
    );

    if (error) {
      console.error(error);
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
          total: totals[key] || null,
          guest_name: names[key] || null,
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

  // Load user
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // Load reservations
  useEffect(() => {
    fetch("/api/ical")
      .then((res) => res.json())
      .then((data) => {
        setReservations(
          (data.events || []).filter((r: any) => r.status === "Reserved"),
        );
        const fallbackProperties = [
          "VILLAS TOH",
          "NEEA 102",
          "NEEA 103",
          "NEEA 201",
          "NEEA 202",
          "NEEA 303",
        ];
        setProperties(
          Array.from(
            new Set([...(data.properties || []), ...fallbackProperties]),
          ),
        );
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
          const key = `${normalize(row.property)}|${normalize(row.check_in)}|${normalize(row.check_out)}`;

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
  }, []);

  const monthlyIncome = Object.entries(totals).reduce(
    (acc: any, [key, value]) => {
      const [, checkIn] = key.split("|");
      const month = checkIn?.slice(0, 7);
      const amount = Number((value || "").replace(/[^0-9]/g, "") || 0);

      if (!acc[month]) acc[month] = 0;
      acc[month] += amount;

      return acc;
    },
    {},
  );

  const months = Object.keys(monthlyIncome).sort();
  const userProperties = role === "admin" ? properties : properties.slice(0, 2);

  return (
    <>
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}
      <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div
        className={`${collapsed ? "w-16" : "w-64"} bg-white text-gray-800 border-r flex flex-col transition-all duration-300`}
      >
        <div className="p-4 font-semibold text-lg border-b flex items-center justify-between">
          {!collapsed && <span>GreenState</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-black"
          >
            ☰
          </button>
        </div>

        <div
          className={`flex-1 p-2 text-sm ${collapsed ? "items-center" : ""}`}
        >
          <ul className="space-y-1">
            <li
              onClick={() => setView("informacion")}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                view === "informacion"
                  ? "bg-gray-100 text-black"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {!collapsed && "Informacion"}
            </li>

            <li
              onClick={() => setView("calendario")}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                view === "calendario"
                  ? "bg-gray-100 text-black"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {!collapsed && "Calendario"}
            </li>

            <li
              onClick={() => setView("reservations")}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                view === "reservations"
                  ? "bg-gray-100 text-black"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {!collapsed && "Reservations"}
            </li>
          </ul>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="h-14 bg-white border-b flex items-center px-6 justify-between">
          <h1 className="font-semibold text-gray-700">
            {view === "calendario"
              ? "Calendario"
              : view === "informacion"
                ? "Información"
                : "Reservations"}
          </h1>

          <div className="flex items-center gap-3">
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
              Export
            </button>

            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
              Add Reservation
            </button>
            {user ? (
              <button
                onClick={logout}
                className="text-sm bg-gray-200 px-3 py-1 rounded"
              >
                Logout
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  className="border px-2 py-1 text-sm"
                />
                <button
                  onClick={login}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 pb-20">
          <div>
            <div className="space-y-6">
              {/* CARDS */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border p-4">
                  <p className="text-sm text-gray-400">Total Reservas</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {reservations.length}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border p-4">
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
                            days.push(current.toISOString().slice(0, 10));
                            current.setDate(current.getDate() + 1);
                          }
                          return days;
                        }),
                      ).size
                    }
                  </p>
                </div>

                <div className="bg-white rounded-2xl border p-4">
                  <p className="text-sm text-gray-400">Propiedades</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {
                      new Set(
                        (Array.isArray(reservations) ? reservations : []).map(
                          (r) => r.name,
                        ),
                      ).size
                    }
                  </p>
                </div>
                <div className="bg-white rounded-2xl border p-4">
                  <p className="text-sm text-gray-400">Ingresos Totales</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    $
                    {Object.values(totals)
                      .map((v) => Number((v || "").replace(/[^0-9]/g, "") || 0))
                      .reduce((a, b) => a + b, 0)
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

                    const days = Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(today.getDate() - (6 - i));
                      return d;
                    });

                    const counts = days.map((day) => {
                      const dayStr = day.toISOString().slice(0, 10);
                      return reservations.filter((r) => {
                        return dayStr >= r.checkIn && dayStr <= r.checkOut;
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
                          style={{ height: `${(count / max) * 100}%` }}
                        />
                        <span className="text-[10px] text-gray-400 mt-1">
                          {days[i].getDate()}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* MONTHLY INCOME CHART */}
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Ingresos por mes 💰
                </h3>

                <div className="flex items-end gap-2 h-40">
                  {months.map((m, i) => {
                    const max = Math.max(
                      ...(Object.values(monthlyIncome) as number[]),
                    );
                    const value = monthlyIncome[m];

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-green-500 rounded-t"
                          style={{ height: `${(value / max) * 100}%` }}
                        />
                        <span className="text-[10px] text-gray-400 mt-1">
                          {m.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
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

                  const totalIncome = propReservations.reduce((acc, r) => {
                    const key = getKey(r);
                    const value = (totals[key] || "").replace(/[^0-9]/g, "");
                    return acc + (value ? Number(value) : 0);
                  }, 0);

                  return (
                    <div
                      key={prop}
                      className="flex justify-between items-center border-b py-3"
                    >
                      <span className="font-medium text-gray-700">{prop}</span>
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

                    return (
                      (r.name.toLowerCase().includes(search.toLowerCase()) &&
                        userProperties.includes(r.name)) ||
                      guest.includes(search.toLowerCase())
                    );
                  })
                  .map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-7 p-3 text-sm text-gray-800 border-b hover:bg-gray-100 hover:shadow-sm transition"
                    >
                      <div className="font-medium text-gray-900">{r.name}</div>
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
                            <span className="text-gray-500 text-sm">$</span>
                            <input
                              autoFocus
                              value={
                                typeof totals[getKey(r)] === "string"
                                  ? totals[getKey(r)]
                                  : ""
                              }
                              onChange={(e) => {
                                const raw = String(e.target.value || "").replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                setTotals((prev) => ({
                                  ...prev,
                                  [getKey(r)]: raw === "" ? "" : raw,
                                }));
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
                              className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                            className="flex items-center justify-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-md"
                          >
                            <span className="text-sm text-gray-800">
                              {(() => {
                                const raw = String(totals[getKey(r)] ?? "").replace(/[^0-9]/g, "");
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
                              onChange={(e) =>
                                handleNameChange(r, e.target.value)
                              }
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
                          className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
                        >
                          Save
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
                  {["lun.", "mar.", "mié.", "jue.", "vie.", "sáb.", "dom."].map(
                    (d) => (
                      <div key={d} className="text-center">
                        {d}
                      </div>
                    ),
                  )}
                </div>

                {/* CALENDARIO GRID */}
                <div className="grid grid-cols-7 gap-4 relative">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${month}-${String(day).padStart(2, "0")}`;

                    const dayReservations = reservations.filter((r) => {
                      return dateStr >= r.checkIn && dateStr <= r.checkOut;
                    });

                    return (
                      <div
                        key={day}
                        className="bg-gray-50 border border-gray-200 rounded-2xl p-3 h-28 flex flex-col justify-between"
                      >
                        <div className="text-sm font-medium text-gray-700">
                          {day}
                        </div>

                        <div className="space-y-1">
                          {dayReservations.slice(0, 2).map((r, idx) => (
                            <div
                              key={idx}
                              className={`text-[10px] px-2 py-1 rounded-full truncate ${
                                false
                                  ? "bg-gray-200 text-gray-500"
                                  : "bg-blue-50 text-blue-400"
                              }`}
                            >
                              Reservado
                            </div>
                          ))}

                          {dayReservations.length > 2 && (
                            <div className="text-[10px] text-gray-400">
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
        </div>
      </div>
    </div>
    </>
  );
}
