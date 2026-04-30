// =====================
// MAIN PAGE COMPONENT
// =====================
"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/app-sidebar";
import { Sun, Moon } from "lucide-react";

import StatsCards from "@/components/dashboard/StatsCards";

import OccupancyChart from "@/components/dashboard/charts/OccupancyChart";
import RevenueTrendChart from "@/components/dashboard/charts/RevenueTrendChart";
import MonthlyIncomeChart from "@/components/dashboard/charts/MonthlyIncomeChart";
import TopPropertiesChart from "@/components/dashboard/charts/TopPropertiesChart";
import PropertiesList from "@/components/dashboard/charts/PropertiesList";

import ReservationsTable from "@/components/dashboard/ReservationsTable";

import Calendar from "@/components/dashboard/Calendar";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
export default function Home() {
  const router = useRouter();
  // =====================
  // STATE MANAGEMENT
  // =====================
  const [search, setSearch] = useState("");
  const [view, setView] = useState("reservations");
  const [reservations, setReservations] = useState<any[]>([]);
  const [properties, setProperties] = useState<string[]>([]);
  const [month, setMonth] = useState("2026-04");
  const [collapsed, setCollapsed] = useState(false);

  const [totals, setTotals] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  // =====================
  // SUPABASE CONFIG
  // =====================
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
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  // Toast for feedback UX
  const [toast, setToast] = useState("");
  const [debounceTimers, setDebounceTimers] = useState<Record<string, any>>({});

  // =====================
  // AUTH FUNCTIONS
  // =====================
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

  // =====================
  // HELPERS & UTILITIES
  // =====================
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

  // =====================
  // AUTH EFFECTS
  // =====================
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

  // =====================
  // DATA FETCHING
  // =====================
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
  // =====================
  // CALCULATIONS & DERIVED DATA
  // =====================
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

  // =====================
  // UI RENDER
  // =====================
  return (
    <div className="min-h-screen bg-background text-foreground">
      {loadingAuth ? (
        <div className="min-h-screen flex items-center justify-center">
          Cargando...
        </div>
      ) : !user ? (
        <>
          {/* ===================== LOGIN UI ===================== */}
          <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground p-6">
            <div className="flex w-full max-w-sm flex-col gap-6">
              {/* LOGO */}
              <div className="flex items-center gap-2 self-center font-medium text-foreground">
                <div className="flex size-6 items-center justify-center rounded-md bg-green-600 text-white">
                  🌿
                </div>
                GreenState
              </div>

              {/* CARD */}
              <div className="bg-card rounded-2xl shadow-md border border-border p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Bienvenido 👋
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Inicia sesión para continuar
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    className="w-full border border-border bg-muted text-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-card transition"
                  />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full border border-border bg-muted text-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-card transition"
                  />

                  <button
                    onClick={isRegister ? register : login}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    {isRegister ? "Crear cuenta" : "Iniciar sesión"}
                  </button>

                  <p
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-xs text-muted-foreground text-center cursor-pointer hover:text-foreground transition"
                  >
                    {isRegister
                      ? "¿Ya tienes cuenta? Inicia sesión"
                      : "¿No tienes cuenta? Regístrate"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {toast && (
            <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow">
              {toast}
            </div>
          )}
          {/* ===================== DASHBOARD LAYOUT ===================== */}
          <SidebarProvider>
            <div className="group/sidebar-wrapper flex min-h-screen w-full">
              <AppSidebar view={view} setView={setView} />
              <SidebarInset className="flex flex-1 flex-col bg-background text-foreground transition-all duration-200 md:ml-[var(--sidebar-width)] peer-data-[state=collapsed]:md:ml-[var(--sidebar-width-icon)]">
                {/* HEADER */}
                <header className="flex h-16 items-center gap-2 px-6 border-b border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 text-card-foreground shadow-sm">
                  <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md" />

                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Inicio
                    </span>
                    <span className="font-semibold text-foreground">
                      {view === "documentacion"
                        ? "Documentación"
                        : "Reservations"}
                    </span>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="border border-border/60 bg-muted/60 text-foreground rounded-full px-4 py-1.5 text-sm backdrop-blur focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      onClick={() => setDark(!dark)}
                      className={`relative flex items-center w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${
                        dark ? "bg-muted" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                          dark
                            ? "translate-x-6 bg-card"
                            : "translate-x-0 bg-card"
                        }`}
                      >
                        {dark ? (
                          <Moon className="w-4 h-4 text-foreground" />
                        ) : (
                          <Sun className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </button>
                    <button
                      onClick={logout}
                      className="text-sm px-4 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/60 text-foreground hover:bg-muted/80 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Logout
                    </button>
                  </div>
                </header>

                {/* CONTENT */}
                <div className="flex-1 p-6 overflow-y-auto pb-20 space-y-6">
                  {view === "reservations" && (
                    <div>
                      <div className="space-y-6">
                        {/* ===================== STATS ===================== */}
                        <StatsCards
                          reservations={reservations}
                          properties={properties}
                          totals={totals}
                          getKey={getKey}
                          month={month}
                        />

                        {/* ===================== CHARTS ===================== */}
                        <OccupancyChart reservations={reservations} />

                        <RevenueTrendChart
                          months={months}
                          monthlyIncome={monthlyIncome}
                        />

                        <MonthlyIncomeChart
                          months={months}
                          monthlyIncome={monthlyIncome}
                        />

                        <TopPropertiesChart
                          reservations={reservations}
                          totals={totals}
                          getKey={getKey}
                        />

                        <PropertiesList
                          reservations={reservations}
                          totals={totals}
                          getKey={getKey}
                        />
                      </div>
                      <div className="mt-6">
                        {/* ===================== RESERVATIONS TABLE ===================== */}
                        <ReservationsTable
                          reservations={reservations}
                          search={search}
                          names={names}
                          totals={totals}
                          editing={editing}
                          editingName={editingName}
                          saving={saving}
                          getKey={getKey}
                          setEditing={setEditing}
                          setEditingName={setEditingName}
                          setTotals={setTotals}
                          handleNameChange={handleNameChange}
                          debouncedSave={debouncedSave}
                          saveRow={saveRow}
                          userProperties={userProperties}
                        />
                      </div>

                      <div className="mt-6">
                        {/* ===================== CALENDAR ===================== */}
                        <Calendar
                          reservations={reservations}
                          month={month}
                          setMonth={setMonth}
                          selectedDate={selectedDate}
                          setSelectedDate={setSelectedDate}
                          names={names}
                          getKey={getKey}
                          propertyColors={propertyColors}
                        />
                      </div>
                    </div>
                  )}

                  {view === "documentacion" && (
                    <>
                      {/* ===================== DOCUMENTATION VIEW ===================== */}
                      <div className="grid grid-cols-3 gap-6">
                        <div
                          onClick={() => router.push("/documentacion/neea")}
                          className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <h3 className="text-lg font-semibold text-foreground">
                            NEEA
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            Documentación de propiedades NEEA
                          </p>
                        </div>

                        <div
                          onClick={() => router.push("/documentacion/toh")}
                          className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <h3 className="text-lg font-semibold text-foreground">
                            Villas TOH
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            Documentación Villas TOH
                          </p>
                        </div>

                        <div
                          onClick={() => router.push("/documentacion/puebla")}
                          className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <h3 className="text-lg font-semibold text-foreground">
                            Puebla
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            Documentación Puebla
                          </p>
                        </div>
                      </div>
                    </>
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
