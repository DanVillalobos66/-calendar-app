"use client";

import { useRouter } from "next/navigation";

const documents = [
  {
    name: "Manual Operativo",
    url: "https://drive.google.com/file/d/ID1/preview",
  },
  {
    name: "Control de Limpieza",
    url: "https://drive.google.com/file/d/ID2/preview",
  },
  {
    name: "Reporte Financiero",
    url: "https://drive.google.com/file/d/ID3/preview",
  },
];

export default function NEEA() {
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push("/")}
        className="text-blue-600 hover:underline"
      >
        ← Volver
      </button>

      <h1 className="text-2xl font-bold">NEEA</h1>

      <div className="grid gap-6">
        {documents.map((doc, index) => (
          <div key={index} className="bg-white border rounded-xl p-4 shadow">
            <p className="font-semibold mb-2">{doc.name}</p>
            <iframe
              src={doc.url}
              width="100%"
              height="400"
              className="rounded-lg border"
            />
          </div>
        ))}
      </div>
    </div>
  );
}