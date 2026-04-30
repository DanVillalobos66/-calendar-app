"use client";

export default function ReservationsTable({
  reservations,
  search,
  names,
  totals,
  editing,
  editingName,
  saving,
  getKey,
  setEditing,
  setEditingName,
  setTotals,
  handleNameChange,
  debouncedSave,
  saveRow,
  userProperties,
}: any) {
  return (
    <div className="bg-card rounded-lg border border-border">
      {/* TABLE HEADER */}
      <div className="grid grid-cols-7 text-sm font-medium text-foreground border-b border-border p-3">
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
            new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
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
            className="grid grid-cols-7 p-3 text-sm text-foreground border-b border-border hover:bg-muted hover:shadow-sm transition"
          >
            <div className="font-medium text-foreground">{r.name}</div>
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
                  <span className="text-muted-foreground text-sm">$</span>
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
                    className="w-20 bg-card border border-border rounded-md px-2 py-1 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                  className="flex items-center justify-center cursor-pointer hover:bg-muted px-2 py-1 rounded-md transition"
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
                    className="w-28 bg-card border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-28 text-center text-sm text-foreground cursor-pointer hover:bg-muted px-2 py-1 rounded-md"
                >
                  {names[getKey(r)] || "---"}
                </span>
              )}
            </div>
            {saving[getKey(r)] && (
              <span className="text-[10px] text-muted-foreground">
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
  );
}
