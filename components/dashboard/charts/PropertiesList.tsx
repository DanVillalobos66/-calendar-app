"use client";

export default function PropertiesList({
  reservations,
  totals,
  getKey,
}: any) {
  const properties = [
    "VILLAS TOH",
    "NEEA 102",
    "NEEA 103",
    "NEEA 201",
    "NEEA 202",
    "NEEA 303",
  ];

  // 🔥 lógica fuera del JSX
  const data = properties.map((prop) => {
    const propReservations = reservations.filter(
      (r: any) => r.name === prop
    );

    const totalIncome = propReservations.reduce((acc: number, r: any) => {
      const key = getKey(r);
      const raw = totals[key] || "";
      const amount = raw
        ? Number(String(raw).replace(/[^0-9]/g, ""))
        : 0;

      return acc + amount;
    }, 0);

    return {
      prop,
      count: propReservations.length,
      totalIncome,
    };
  });

  return (
    <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Propiedades
      </h3>

      {data.map((item) => (
        <div
          key={item.prop}
          className="flex justify-between items-center border-b border-border py-3"
        >
          <span className="font-medium text-foreground">
            {item.prop}
          </span>
          <span className="text-sm text-muted-foreground">
            {item.count} reservas · ${item.totalIncome.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}