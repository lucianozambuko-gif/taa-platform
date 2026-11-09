import { ROOMS } from "@/lib/roles";

type Busy = { room: string; date: string; slot: string; status?: string; client?: string | null };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Rooms down the side, days across the top: free, half-day taken, or fully taken. */
export default function VenueCalendar({ busy, start, days = 21, detailed = false }: { busy: Busy[]; start: Date; days?: number; detailed?: boolean }) {
  const dates = Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * 864e5));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="sr-only">Room availability for the next {days} days: {ROOMS.map(([room]) => `${room}: ${dates.filter((d) => !busy.some((b) => b.room === room && b.date === iso(d))).length} days fully free`).join("; ")}. Use the booking form to check a specific date.</p>
      <div className="tscroll" tabIndex={0}>
        <div className="cal" style={{ ["--days" as string]: days }} aria-hidden="true">
          <div className="rh">Room</div>
          {dates.map((d) => (
            <div key={iso(d)} className={`dh ${[0, 6].includes(d.getDay()) ? "we" : ""}`}>
              {d.toLocaleDateString("en-ZA", { weekday: "short" }).slice(0, 2)}<br />{d.getDate()}
            </div>
          ))}
          {ROOMS.map(([room]) => (
            <div key={room} style={{ display: "contents" }}>
              <div className="rh">{room}</div>
              {dates.map((d) => {
                const here = busy.filter((b) => b.room === room && b.date === iso(d));
                const full = here.some((b) => b.slot === "full") || (here.some((b) => b.slot === "morning") && here.some((b) => b.slot === "afternoon"));
                const cls = full ? "busy" : here.length ? "half" : "free";
                const label = full ? "Booked" : here.length ? (here[0].slot === "morning" ? "Afternoon free" : "Morning free") : "Free";
                const title = detailed && here.length ? here.map((b) => `${b.slot}: ${b.status}${b.client ? ` · ${b.client}` : ""}`).join("\n") : label;
                return (
                  <div key={iso(d)} className={`${cls} ${[0, 6].includes(d.getDay()) ? "we" : ""}`} title={`${room}, ${d.toDateString()}: ${title}`}>
                    {full ? "✕" : here.length ? (here[0].slot === "morning" ? "PM" : "AM") : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="legend">
        <span style={{ ["--c" as string]: "var(--good-soft)" }}>Free</span>
        <span style={{ ["--c" as string]: "var(--warn-soft)" }}>Half day free (AM / PM shown is free)</span>
        <span style={{ ["--c" as string]: "var(--bad-soft)" }}>Booked</span>
      </div>
    </div>
  );
}
