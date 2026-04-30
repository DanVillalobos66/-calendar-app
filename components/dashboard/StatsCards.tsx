"use client";

export default function StatsCards({
  reservations = [],
  properties = [],
  totals = {},
  getKey,
  month,
}: any) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Total Reservas (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">Total Reservas</p>
        <p className="text-2xl font-semibold text-foreground">
          {reservations.length}
        </p>
      </div>

      {/* Días (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">Días Ocupados</p>
        <p className="text-2xl font-semibold text-foreground">
          {
            new Set(
              (Array.isArray(reservations) ? reservations : []).flatMap((r) => {
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

      {/* Noches (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">Noches</p>
        <p className="text-2xl font-semibold text-foreground">
          {reservations.reduce((acc, r) => {
            const start = new Date(r.checkIn);
            const end = new Date(r.checkOut);
            return (
              acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            );
          }, 0)}
        </p>
      </div>

      {/* Propiedades (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">Propiedades</p>
        <p className="text-2xl font-semibold text-foreground">
          {properties.length}
        </p>
      </div>

      {/* Ocupación (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">Ocupación % (mes)</p>
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
              lastDay * (new Set(reservations.map((r) => r.name)).size || 1);
            if (!totalPossible) return "0%";
            const pct = Math.round((uniqueDays.size / totalPossible) * 100);
            return `${pct}%`;
          })()}
        </p>
      </div>

      {/* ADR (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">ADR</p>
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
                acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              );
            }, 0);

            if (!nights) return "$0";
            return `$${Math.round(revenue / nights).toLocaleString()}`;
          })()}
        </p>
      </div>

      {/* Ingresos (STATS) */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <p className="text-sm text-muted-foreground">Ingresos Totales</p>
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
  );
}
