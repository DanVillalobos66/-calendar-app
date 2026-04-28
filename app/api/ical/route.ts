export async function GET() {
  // Use a more reliable public demo iCal
  const sources = [
    {
      url: "https://www.airbnb.mx/calendar/ical/994155472851598652.ics?t=7a57078e8d6f4788a6fcdb3169f61360",
      name: "VILLAS TOH",
    },

    {
      url: "https://www.airbnb.mx/calendar/ical/1587983039897322875.ics?t=d510239ac0414702b4ae1484ba0841eb",
      name: "NEEA 202",
    },

    {
      url: "https://www.airbnb.mx/calendar/ical/1587846153658007428.ics?t=68a84faeaa52408ba42e325c12e49ddd",
      name: "NEEA 303",
    },
    {
      url: "https://www.airbnb.mx/calendar/ical/1578409783431230111.ics?t=86b3a85a1ead42a592a7bcd052a2b7a2",
      name: "NEEA 103",
    },
    {
      url: "https://www.airbnb.mx/calendar/ical/1607147064843371146.ics?t=1b4837b5c9ed452bab385c9c857f94a6",
      name: "NEEA 102",
    },
    {
      url: "https://www.airbnb.mx/calendar/ical/1663202381381214210.ics?t=73e01de56a55459a9fa9882dced0eb7a",
      name: "NEEA 201",
    },
  ];


  let allEvents: any[] = [];

  for (const source of sources) {
    let text = "";

    try {
      const res = await fetch(source.url);
      text = await res.text();
    } catch (e) {
      console.error("Error fetching iCal:", e);
      continue;
    }

    if (!text.includes("BEGIN:VEVENT")) continue;

    const events = text.split("BEGIN:VEVENT").slice(1);

    const parsed = events
      .map((event) => {
        const start = event.match(/DTSTART.*:(\d{8})/)?.[1];
        const end = event.match(/DTEND.*:(\d{8})/)?.[1];
        const summary = event.match(/SUMMARY:(.*)/)?.[1]?.trim();

        if (!start || !end) return null;

        let status = "Confirmed";

        if (summary?.toLowerCase().includes("not available")) {
          status = "Blocked";
        } else if (summary?.toLowerCase().includes("reserved")) {
          status = "Reserved";
        }

        return {
          name: source.name,
          checkIn: formatDate(start),
          checkOut: formatDate(end),
          channel: "Airbnb",
          total: "$---",
          status,
        };
      })
      .filter((e) => e !== null);

    allEvents = [...allEvents, ...parsed];
  }

  return Response.json({
    events: allEvents,
    properties: sources.map((s) => s.name),
  });
}

function formatDate(date: string | undefined) {
  if (!date) return "";
  const clean = date.replace(/[^0-9]/g, "").slice(0, 8);
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}