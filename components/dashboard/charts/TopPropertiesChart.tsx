"use client";

export default function TopPropertiesChart({
  reservations,
  totals,
  getKey,
}: any) {
  // 🔥 lógica fuera del JSX
  const data = Array.from(new Set(reservations.map((r: any) => r.name)))
    .map((prop) => {
      const propReservations = reservations.filter(
        (r: any) => r.name === prop
      );

      const revenue = propReservations.reduce((acc: number, r: any) => {
        const key = getKey(r);
        return acc + Number(totals[key] || 0);
      }, 0);

      return {
        prop,
        revenue,
        count: propReservations.length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Top propiedades 🏆
      </h3>

      {data.map((item, i) => (
        <div
          key={i}
          className="flex justify-between py-2 border-b border-border text-sm"
        >
          <span className="font-medium text-foreground">
            {item.prop}
          </span>
          <span className="text-muted-foreground">
            ${item.revenue.toLocaleString()} · {item.count} reservas
          </span>
        </div>
      ))}
    </div>
  );
}