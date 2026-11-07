"use client";

import { useActionState } from "react";
import { requestCoupon, type CouponState } from "./actions";

export default function CouponForm({ courses, isAdmin }: { courses: { id: string; title: string }[]; isAdmin: boolean }) {
  const [state, action, pending] = useActionState<CouponState, FormData>(requestCoupon, {});
  return (
    <form action={action} className="panel stack" style={{ gap: 10 }}>
      <h3>{isAdmin ? "Create a coupon" : "Request a coupon"}</h3>
      <p className="small muted">{isAdmin ? "Coupons you create go live straight away." : "An admin must approve the coupon before learners can use it."}</p>
      <div className="grid g3" style={{ gap: 10 }}>
        <div className="field"><label>Code</label><input name="code" required placeholder="e.g. GROUP15" style={{ textTransform: "uppercase" }} /></div>
        <div className="field"><label>Discount %</label><input name="percent_off" type="number" min={1} max={90} required /></div>
        <div className="field"><label>Course</label><select name="course_id" defaultValue=""><option value="">Any course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        <div className="field"><label>Max uses</label><input name="max_uses" type="number" min={1} placeholder="Unlimited" /></div>
        <div className="field"><label>Expires</label><input name="expires_on" type="date" /></div>
        <div className="field"><label>Reason</label><input name="reason" required placeholder="Who is it for?" /></div>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : isAdmin ? "Create coupon" : "Send for approval"}</button></div>
    </form>
  );
}
