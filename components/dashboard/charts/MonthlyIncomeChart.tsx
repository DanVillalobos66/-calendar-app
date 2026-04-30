"use client";

export default function MonthlyIncomeChart({
  months,
  monthlyIncome,
}: any) {
  if (months.length === 0) {
    return (
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Ingresos por mes 💰
        </h3>

        <div className="text-center text-muted-foreground text-sm py-10">
          No hay ingresos registrados 📉
        </div>
      </div>
    );
  }

  // 🔥 lógica FUERA del JSX
  const values = Object.values(monthlyIncome) as number[];
  const rawMax = Math.max(...values, 1);

  let max;
  if (rawMax <= 500000) {
    max = 500000;
  } else if (rawMax <= 1000000) {
    max = 1000000;
  } else {
    max = Math.ceil(rawMax / 500000) * 500000;
  }

  return (
    <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Ingresos por mes 💰
        </h3>
        <span className="text-xs text-muted-foreground">
          Vista mensual
        </span>
      </div>

      <div className="relative h-64">
        {/* GRID */}
        <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground">
          {[100, 75, 50, 25, 0].map((p) => (
            <div key={p} className="border-t border-border relative">
              <span className="absolute -top-2 left-0">
                ${Math.round(max * (p / 100)).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* BARS */}
        <div className="absolute inset-0 flex items-end gap-6 pt-4">
          {months.map((m: string, i: number) => {
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
                    height: value > 0 ? `${height}%` : "6px",
                    minHeight: value > 0 ? "30px" : "6px",
                  }}
                />

                <span className="text-xs text-muted-foreground mt-2">
                  {new Date(m + "-01").toLocaleString("es-MX", {
                    month: "short",
                  })}
                </span>

                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                  ${value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}