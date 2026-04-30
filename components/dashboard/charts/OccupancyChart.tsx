"use client";

export default function OccupancyChart({ reservations }: any) {
  const today = new Date();

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const counts = days.map((day) => {
    const dayStr = day.toISOString().slice(0, 10);
    return reservations.filter(
      (r: any) => dayStr >= r.checkIn && dayStr <= r.checkOut
    ).length;
  });

  const max = Math.max(...counts, 1);

  return (
    <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Ocupación (visual)
      </h3>

      <div className="flex items-end gap-2 h-32">
        {counts.map((count, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{
                height: count > 0 ? `${(count / max) * 100}%` : "6px",
                minHeight: count > 0 ? "20px" : "6px",
              }}
            />
            <span className="text-[10px] text-muted-foreground mt-1">
              {days[i].getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}