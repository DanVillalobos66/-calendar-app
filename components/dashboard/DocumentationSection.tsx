"use client";

export default function DocumentationSection({ router }: any) {
  const items = [
    {
      title: "NEEA",
      description: "Documentación de propiedades NEEA",
      route: "/documentacion/neea",
    },
    {
      title: "Villas TOH",
      description: "Documentación Villas TOH",
      route: "/documentacion/toh",
    },
    {
      title: "Puebla",
      description: "Documentación Puebla",
      route: "/documentacion/puebla",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {items.map((item) => (
        <div
          key={item.title}
          onClick={() => router.push(item.route)}
          className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-foreground">
            {item.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}