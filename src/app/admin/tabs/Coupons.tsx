import CouponForm from "../CouponForm";
import { setCouponStatus } from "../actions";
import { type DB, day } from "./shared";

/** RFQ F05: discounts only with authorisation. Sales staff request, an admin approves. */
export default async function CouponsTab({ supabase, isAdmin }: { supabase: DB; isAdmin: boolean }) {
  const [{ data: coupons }, { data: courses }, { data: staff }] = await Promise.all([
    supabase.from("coupons").select("*, courses(title)").order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title").eq("price_basis", "fixed").order("title"),
    supabase.rpc("staff_directory"),
  ]);
  const name = new Map(((staff ?? []) as { id: string; full_name: string | null }[]).map((s) => [s.id, s.full_name ?? "Staff"]));
  const pending = (coupons ?? []).filter((c) => c.status === "pending");
  return (
    <div className="stack" style={{ gap: 16 }}>
      {pending.length > 0 && (
        <div className="panel stack" style={{ gap: 10, borderColor: "var(--warn)" }}>
          <h3>Waiting for approval ({pending.length})</h3>
          {pending.map((c) => (
            <div key={c.id} className="row" style={{ justifyContent: "space-between" }}>
              <span><b className="mono">{c.code}</b> · {c.percent_off}% off {(c.courses as { title: string } | null)?.title ?? "any course"} · requested by {name.get(c.created_by) ?? "staff"}<br /><span className="small muted">{c.reason}</span></span>
              {isAdmin ? (
                <span className="row" style={{ gap: 6 }}>
                  <form action={setCouponStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="active" /><button className="btn btn-primary btn-sm">Approve</button></form>
                  <form action={setCouponStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="disabled" /><button className="btn btn-ghost btn-sm">Reject</button></form>
                </span>
              ) : <span className="badge b-warn">Pending admin</span>}
            </div>
          ))}
        </div>
      )}
      <CouponForm courses={courses ?? []} isAdmin={isAdmin} />
      <div className="panel tscroll" tabIndex={0} style={{ padding: "6px 10px" }}>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Discount</th><th>Course</th><th>Used</th><th>Expires</th><th>Status</th><th>Approved by</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {(coupons ?? []).map((c) => (
              <tr key={c.id}>
                <td className="mono"><b>{c.code}</b><br /><span className="small muted" style={{ fontFamily: "inherit" }}>{c.reason}</span></td>
                <td className="tnum">{c.percent_off}%</td>
                <td>{(c.courses as { title: string } | null)?.title ?? "Any course"}</td>
                <td className="tnum">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                <td className="small">{c.expires_on ? day(c.expires_on) : "No expiry"}</td>
                <td><span className={`badge ${c.status === "active" ? "b-good" : c.status === "pending" ? "b-warn" : "b-short"}`}>{c.status}</span></td>
                <td className="small">{c.approved_by ? name.get(c.approved_by) ?? "Admin" : "—"}</td>
                {isAdmin && (
                  <td>
                    {c.status === "active" ? (
                      <form action={setCouponStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="disabled" /><button className="btn btn-ghost btn-sm">Switch off</button></form>
                    ) : c.status === "disabled" ? (
                      <form action={setCouponStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="active" /><button className="btn btn-ghost btn-sm">Switch on</button></form>
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
            {!(coupons ?? []).length && <tr><td colSpan={8} className="muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="small muted">Learners type the code at checkout. The discount is worked out by the database from the approved coupon, so it can't be changed in the browser.</p>
    </div>
  );
}
