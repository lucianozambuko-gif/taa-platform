"use client";

import { useActionState } from "react";
import { reviewProposal, type ContentState } from "./actions";

export default function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(reviewProposal, {});
  if (state.message) return <p className="notice ok" role="status">{state.message}</p>;
  return (
    <form action={action} className="row" style={{ gap: 8, alignItems: "end" }}>
      <input type="hidden" name="id" value={id} />
      <div className="field" style={{ flex: "1 1 280px" }}>
        <label htmlFor={`rn-${id}`}>Note to the facilitator</label>
        <input id={`rn-${id}`} name="note" placeholder="Required if you don’t approve it" />
      </div>
      <button className="btn btn-primary btn-sm" name="decision" value="approved" disabled={pending}>Approve and publish</button>
      <button className="btn btn-ghost btn-sm" name="decision" value="rejected" disabled={pending}>Don’t approve</button>
      {state.error && <p className="notice" role="alert" style={{ flexBasis: "100%" }}>{state.error}</p>}
    </form>
  );
}
