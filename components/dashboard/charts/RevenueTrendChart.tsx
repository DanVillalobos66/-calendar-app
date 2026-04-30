"use client";

export default function RevenueTrendChart({
  months,
  monthlyIncome,
}: any) {
  const max = Math.max(...Object.values(monthlyIncome), 1);

  return (
    <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Tendencia ingresos 📈
      </h3>

      <div className="flex items-end gap-2 h-40">
        {months.map((m: string, i: number) => {
          const value = monthlyIncome[m] || 0;
          const height = (value / max) * 100;

          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-purple-500 rounded-t"
                style={{
                  height: `${height}%`,
                  minHeight: "6px",
                }}
              />
              <span className="text-[10px] text-muted-foreground mt-1">
                {new Date(m + "-01").toLocaleString("es-MX", {
                  month: "short",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}