"use client";

export default function Calendar({
  reservations,
  month,
  setMonth,
  selectedDate,
  setSelectedDate,
  names,
  getKey,
  propertyColors,
}: any) {
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
          {new Date(month + "-01").toLocaleString("es-MX", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-border px-3 py-1.5 rounded-lg text-sm bg-muted text-foreground"
        >
          <option value="2026-04">Abril 2026</option>
          <option value="2026-05">Mayo 2026</option>
          <option value="2026-06">Junio 2026</option>
        </select>
      </div>

      {/* WEEK DAYS */}
      <div className="grid grid-cols-7 text-xs text-muted-foreground mb-3 px-2">
        {["lun.", "mar.", "mié.", "jue.", "vie.", "sáb.", "dom."].map((d) => (
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

          const dayReservations = reservations.filter((r: any) => {
            return dateStr >= r.checkIn && dateStr <= r.checkOut;
          });

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(dateStr)}
              className={`bg-muted border border-border rounded-2xl p-3 h-32 flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition cursor-pointer ${
                dateStr === todayStr ? "border-blue-500 bg-blue-50" : ""
              } ${selectedDate === dateStr ? "ring-2 ring-blue-400" : ""}`}
            >
              <div className="text-sm font-medium text-foreground">
                {day}
              </div>

              <div className="space-y-1">
                {dayReservations.slice(0, 2).map((r: any, idx: number) => (
                  <div
                    key={idx}
                    title={`${r.name} - ${
                      names[getKey(r)] || "Guest"
                    } (${r.checkIn} → ${r.checkOut})`}
                    className={`text-[10px] px-2 py-1 rounded-full truncate ${
                      propertyColors[r.name] || "bg-muted text-foreground"
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
  );
}