import { useEffect, useRef, useState } from "react";
import { getActionAssignees, ActionsApiError, type ActiveStaffUser, type TicketStatus } from "./api";
import { bangkokActionTime } from "./actions-taken.rules";
import { blockerLabels, changeTicket, getTicketHistory, getWorkflowTicket, WorkflowError, type TicketChange, type TicketHistory, type WorkflowTicket } from "./ticket-workflow.api";
import "./TicketWorkflow.css";

interface Props {
  ticketId: number; role: "IT_STAFF" | "ADMINISTRATOR"; refreshKey?: number;
  onTicketUpdated: (ticket: WorkflowTicket) => void; onMutated: () => void; onAccessFailure: (code: string) => void;
}
type Kind = "status" | "assign" | "priority" | "claim";
interface Draft { kind: Kind; base: WorkflowTicket; status: TicketStatus | ""; reason: string; owner: string; priority: WorkflowTicket["itPriority"] | ""; conflict: boolean; reviewed?: WorkflowTicket }
const label = (value: string) => value.replaceAll("_", " ");
const errorText = (error: unknown) => error instanceof WorkflowError ? error.message : "Unable to complete the request. Your draft has been kept. Please try again.";

export function TicketWorkflow({ ticketId, role, refreshKey = 0, onTicketUpdated, onMutated, onAccessFailure }: Props) {
  const [ticket, setTicket] = useState<WorkflowTicket | null>(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [retry, setRetry] = useState(0);
  const [staff, setStaff] = useState<ActiveStaffUser[]>([]), [staffError, setStaffError] = useState(""), [staffLoading, setStaffLoading] = useState(true), [staffRetry, setStaffRetry] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null), [fields, setFields] = useState<Record<string, string>>({}), [error, setError] = useState(""), [success, setSuccess] = useState(""), [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false), [historyReload, setHistoryReload] = useState(0);
  const callbacks = useRef({ onTicketUpdated, onMutated, onAccessFailure }); callbacks.current = { onTicketUpdated, onMutated, onAccessFailure };
  const pending = useRef(false), alive = useRef(false), generation = useRef(0), trigger = useRef<HTMLElement | null>(null);
  const form = useRef<HTMLFormElement>(null), successElement = useRef<HTMLParagraphElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function protectedFailure(failure: unknown) {
    if ((failure instanceof WorkflowError || failure instanceof ActionsApiError) && (failure.status === 401 || failure.status === 403)) {
      generation.current++; setTicket(null); setDraft(null); setStaff([]); setHistoryOpen(false);
      callbacks.current.onAccessFailure(failure.code); return true;
    }
    return false;
  }
  useEffect(() => {
    const controller = new AbortController(); let active = true; const read = ++generation.current;
    setLoading(true); setLoadError("");
    getWorkflowTicket(ticketId, controller.signal).then(current => {
      if (active && read === generation.current) { setTicket(current); setLoading(false); callbacks.current.onTicketUpdated(current); }
    }).catch(failure => { if (active && read === generation.current) { protectedFailure(failure); setTicket(null); setLoadError(errorText(failure)); setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [ticketId, refreshKey, retry]);
  useEffect(() => {
    let active = true; setStaffLoading(true); setStaffError("");
    getActionAssignees().then(users => { if (active) { setStaff(users); setStaffLoading(false); } }).catch(failure => { if (active) { protectedFailure(failure); setStaff([]); setStaffError("Unable to load active IT Staff. Retry the staff list."); setStaffLoading(false); } });
    return () => { active = false; };
  }, [ticketId, staffRetry]);
  useEffect(() => {
    if (draft) form.current?.querySelector<HTMLElement>("select:not([disabled]),textarea:not([disabled])")?.focus();
    else trigger.current?.focus();
  }, [draft?.kind]);
  useEffect(() => { if (success) successElement.current?.focus(); }, [success]);
  function open(kind: Kind, opener: HTMLElement) {
    if (!ticket || loading || pending.current) return;
    trigger.current = opener;
    const next: Draft = { kind, base: ticket, status: "", reason: "", owner: "", priority: "", conflict: false };
    setDraft(next); setFields({}); setError(""); setSuccess("");
    if (kind === "claim") void submit(next);
  }
  function close() { setDraft(null); setError(""); setFields({}); }
  async function review() {
    if (!draft || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const current = await getWorkflowTicket(ticketId);
      if (!alive.current) return;
      setTicket(current); callbacks.current.onTicketUpdated(current);
      setDraft(previous => previous ? { ...previous, reviewed: current } : null);
    } catch (failure) { if (alive.current) { protectedFailure(failure); setError(errorText(failure)); } }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  async function submit(current: Draft) {
    if (pending.current || current.conflict) return;
    const errors: Record<string, string> = {};
    if (current.kind === "status") {
      if (!current.status || !current.base.allowedTicketTransitions.includes(current.status)) errors.status = "Select a permitted transition.";
      if (current.status === "CANCELLED" || current.status === "REOPENED") {
        if (!current.reason.trim() || current.reason.trim().length > 500) errors.reason = "Enter a reason of 1–500 characters.";
      }
    }
    if (current.kind === "assign" && !/^[1-9]\d*$/.test(current.owner)) errors.owner = "Select an active IT Staff member.";
    if (current.kind === "priority" && !current.priority) errors.priority = "Select an IT Priority.";
    setFields(errors); setError("");
    if (Object.keys(errors).length) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()); return; }
    const expectedTicketVersion = current.base.version;
    const change: TicketChange = current.kind === "status" ? { kind: "status", expectedTicketVersion, currentStatus: current.status as TicketStatus, ...(["CANCELLED", "REOPENED"].includes(current.status) ? { reason: current.reason.trim() } : {}) }
      : current.kind === "priority" ? { kind: "priority", expectedTicketVersion, itPriority: current.priority as WorkflowTicket["itPriority"] }
      : { kind: "assign", expectedTicketVersion, ...(current.kind === "assign" ? { assignedStaffId: Number(current.owner) } : {}) };
    pending.current = true; setBusy(true);
    try {
      const saved = await changeTicket(ticketId, change);
      if (!alive.current) return;
      generation.current++; setTicket(saved); setLoading(false); setDraft(null); setFields({});
      callbacks.current.onTicketUpdated(saved); callbacks.current.onMutated(); setHistoryReload(value => value + 1);
      setSuccess(current.kind === "status" ? "Ticket status updated successfully." : current.kind === "priority" ? "IT priority updated successfully." : current.kind === "claim" ? "Ticket claimed successfully." : "Ticket reassigned successfully.");
    } catch (failure) {
      if (!alive.current) return;
      if (!protectedFailure(failure)) {
        setError(errorText(failure));
        if (failure instanceof WorkflowError && failure.status === 409) setDraft(previous => previous ? { ...previous, conflict: true, reviewed: undefined } : previous);
      }
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  const selectedGateRequired = draft?.kind === "status" && (draft.status === "RESOLVED" || draft.status === "CLOSED");
  const obsolete = !!draft && ((draft.kind === "status" && !!draft.status && (!draft.base.allowedTicketTransitions.includes(draft.status) || (!!ticket && !ticket.allowedTicketTransitions.includes(draft.status)))) ||
    (draft.kind === "claim" && draft.base.assignedStaffId !== null));
  const noChange = !!draft && ((draft.kind === "priority" && draft.priority === draft.base.itPriority) || (draft.kind === "assign" && Number(draft.owner) === draft.base.assignedStaffId));
  const id = "ticket-workflow-" + ticketId;
  return <section className="ticket-workflow card mb-4" aria-labelledby={id}>
    <div className="card-header"><h3 id={id} className="h5 mb-0">Ticket Workflow</h3></div>
    <div className="card-body">
      {loading && <p role="status">Loading Ticket workflow...</p>}
      {loadError && <div role="alert"><p>{loadError}</p><button className="btn btn-outline-success" onClick={() => setRetry(value => value + 1)}>Retry workflow</button></div>}
      {success && <p ref={successElement} tabIndex={-1} role="status" className="alert alert-success">{success}</p>}
      {ticket && <>
        <p>Current Ticket status: <strong>{label(ticket.currentStatus)}</strong>. Ticket version: {ticket.version}.</p>
        <p>Ticket Owner: {ticket.assignedStaff?.name ?? "Unassigned"}. IT Priority: {ticket.itPriority}.</p>
        {ticket.requesterResolvedAt && <section aria-label="Requester resolution indication" className="alert alert-success"><h4 className="h6">Requester: Problem Appears Resolved</h4><p>Recorded on <time dateTime={ticket.requesterResolvedAt}>{bangkokActionTime(ticket.requesterResolvedAt)}</time>.{ticket.currentStatus === "REOPENED" ? " Historical indication; this is not fresh confirmation after reopening." : " Advisory only; it does not resolve the Ticket."}</p></section>}
        <section aria-label="Resolution requirements"><h4 className="h6">Resolution requirements</h4>
          {ticket.resolutionGate.eligible ? <p>All resolution requirements are currently satisfied.</p> : <ul>{ticket.resolutionGate.blockers.map(blocker => <li key={blocker}>{blockerLabels[blocker]}</li>)}</ul>}
          <p>Resolution evidence is the completed Actions Taken Result and reviewed follow-up. No separate resolution field is required. The server rechecks before resolving or closing.</p>
        </section>
        {["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus) && <p className="alert alert-secondary">Actions Taken are read-only on this Ticket.{ticket.currentStatus === "CANCELLED" ? " Cancelled is terminal." : " Reopen with a reason before changing actions."} Ticket ownership and IT Priority may still be maintained.</p>}
        <div className="workflow-controls">
          {role === "IT_STAFF" && ticket.assignedStaffId === null && <button className="btn btn-success" disabled={!!draft || loading} onClick={event => open("claim", event.currentTarget)}>Claim Ticket</button>}
          <button className="btn btn-outline-success" disabled={!!draft || loading} onClick={event => open("assign", event.currentTarget)}>{ticket.assignedStaffId === null ? "Assign Ticket" : "Reassign Ticket"}</button>
          <button className="btn btn-outline-success" disabled={!!draft || loading} onClick={event => open("priority", event.currentTarget)}>Update IT Priority</button>
          <button className="btn btn-outline-success" disabled={!!draft || loading || !ticket.allowedTicketTransitions.length} onClick={event => open("status", event.currentTarget)}>Update Status</button>
          <button className="btn btn-link" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>Ticket status history</button>
        </div>
      </>}
      {draft && <form ref={form} noValidate className="workflow-editor" aria-label="Ticket workflow editor" onSubmit={event => { event.preventDefault(); void submit(draft); }}>
        <h4 className="h6">{draft.kind === "status" ? "Change Ticket status" : draft.kind === "priority" ? "Change IT Priority" : draft.kind === "claim" ? "Claim Ticket review" : "Change Ticket Owner"}</h4>
        {draft.kind === "status" && <>
          <label className="form-label" htmlFor={id + "-status"}>Status *</label>
          <select id={id + "-status"} className="form-select mb-2" value={draft.status} disabled={busy} aria-invalid={!!fields.status} aria-describedby={fields.status ? id + "-status-error" : undefined}
            onChange={event => { const status = event.target.value as TicketStatus; setDraft(previous => previous ? { ...previous, status } : null); }}>
            <option value="">Select permitted status</option>
            {draft.status && !draft.base.allowedTicketTransitions.includes(draft.status) && <option value={draft.status} disabled>{label(draft.status)} (no longer permitted)</option>}
            {draft.base.allowedTicketTransitions.map(status => <option key={status} value={status} disabled={(status === "RESOLVED" || status === "CLOSED") && !draft.base.resolutionGate.eligible}>{label(status)}{(status === "RESOLVED" || status === "CLOSED") && !draft.base.resolutionGate.eligible ? " (resolution requirements incomplete)" : ""}</option>)}
          </select>{fields.status && <p id={id + "-status-error"} className="text-danger">{fields.status}</p>}
          {(draft.status === "CANCELLED" || draft.status === "REOPENED") && <>
            <p>{draft.status === "CANCELLED" ? "Cancellation retains completed actions and atomically cancels Planned/In Progress actions. This Ticket cannot be restored." : "Reopening retains actions, follow-up and the dated requester indication."}</p>
            <label className="form-label" htmlFor={id + "-reason"}>{draft.status === "CANCELLED" ? "Cancellation reason *" : "Reopening reason *"}</label>
            <textarea id={id + "-reason"} className="form-control" value={draft.reason} disabled={busy} required aria-invalid={!!fields.reason} aria-describedby={id + "-reason-hint" + (fields.reason ? " " + id + "-reason-error" : "")}
              onChange={event => { const reason = event.target.value; setDraft(previous => previous ? { ...previous, reason } : null); }} />
            <small id={id + "-reason-hint"}>Use 1–500 characters.</small>{fields.reason && <p id={id + "-reason-error"} className="text-danger">{fields.reason}</p>}
          </>}
        </>}
        {draft.kind === "assign" && <>
          <label className="form-label" htmlFor={id + "-owner"}>Reassign to *</label>
          <select id={id + "-owner"} className="form-select" value={draft.owner} disabled={busy || staffLoading || !!staffError} aria-invalid={!!fields.owner} onChange={event => { const owner = event.target.value; setDraft(previous => previous ? { ...previous, owner } : null); }}>
            <option value="">Select active IT Staff</option>{staff.filter(user => user.id !== draft.base.assignedStaffId).map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
          </select>{fields.owner && <p className="text-danger">{fields.owner}</p>}
          {staffLoading && <p role="status">Loading active IT Staff...</p>}{staffError && <p role="alert">{staffError}</p>}
          {!staffLoading && !staffError && !staff.some(user => user.id !== draft.base.assignedStaffId) && <p>No other active IT Staff members are available.</p>}
          <button type="button" className="btn btn-link" disabled={busy || staffLoading} onClick={() => setStaffRetry(value => value + 1)}>Retry staff list</button>
          {role === "ADMINISTRATOR" && <p>Select an eligible IT Staff owner. Administrator status alone does not make you an eligible owner.</p>}
        </>}
        {draft.kind === "priority" && <>
          <label className="form-label" htmlFor={id + "-priority"}>IT Priority *</label>
          <select id={id + "-priority"} className="form-select" value={draft.priority} disabled={busy} aria-invalid={!!fields.priority} onChange={event => { const priority = event.target.value as Draft["priority"]; setDraft(previous => previous ? { ...previous, priority } : null); }}>
            <option value="">Select IT Priority</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map(value => <option key={value}>{value}</option>)}
          </select>{fields.priority && <p className="text-danger">{fields.priority}</p>}
        </>}
        {error && <p role="alert">{error}</p>}
        {draft.conflict && <div className="alert alert-warning"><p>Your draft is retained. Refresh and compare before choosing whether to apply it.</p>
          <button type="button" className="btn btn-outline-success" disabled={busy} onClick={() => void review()}>Refresh current Ticket</button>
          {draft.reviewed && <><h5 className="h6 mt-2">Current saved Ticket</h5><p>Status: {label(draft.reviewed.currentStatus)}. Owner: {draft.reviewed.assignedStaff?.name ?? "Unassigned"}. Priority: {draft.reviewed.itPriority}. Version: {draft.reviewed.version}.</p>
            <ul>{draft.reviewed.resolutionGate.blockers.map(blocker => <li key={blocker}>{blockerLabels[blocker]}</li>)}</ul>
            <button type="button" className="btn btn-outline-success" disabled={busy} onClick={() => setDraft(previous => previous?.reviewed ? { ...previous, base: previous.reviewed, reviewed: undefined, conflict: false } : previous)}>Keep draft and use refreshed Ticket version</button>
          </>}
        </div>}
        {obsolete && <p role="alert">The current saved state no longer permits this operation. Close the editor and review the Ticket.</p>}
        {noChange && <p>There are no changes to save.</p>}
        <div className="workflow-controls">
          <button className="btn btn-success" disabled={busy || draft.conflict || obsolete || noChange || (!!selectedGateRequired && !draft.base.resolutionGate.eligible) || (draft.kind === "assign" && (staffLoading || !!staffError || !staff.some(user => user.id !== draft.base.assignedStaffId)))}>
            {busy ? "Saving Ticket..." : draft.kind === "status" && draft.status === "CANCELLED" ? "Confirm Ticket cancellation" : "Save Ticket change"}
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={close}>Cancel Ticket editing</button>
        </div>
      </form>}
      {historyOpen && ticket && <TicketStatusHistory key={ticketId + ":" + historyReload} ticketId={ticketId} onFailure={protectedFailure} />}
    </div>
  </section>;
}

function TicketStatusHistory({ ticketId, onFailure }: { ticketId: number; onFailure: (error: unknown) => boolean }) {
  const [data, setData] = useState<TicketHistory | null>(null), [page, setPage] = useState(1), [retry, setRetry] = useState(0), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const callback = useRef(onFailure); callback.current = onFailure;
  useEffect(() => {
    let active = true; const controller = new AbortController(); setLoading(true); setError("");
    getTicketHistory(ticketId, page, controller.signal).then(value => { if (active) { setData(value); setLoading(false); } }).catch(failure => { if (active) { callback.current(failure); setData(null); setError(errorText(failure)); setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [ticketId, page, retry]);
  return <section className="workflow-history" aria-label="Private Ticket status history"><h4 className="h6">Private Ticket status history</h4>
    <p>Chronological, immutable operational history. Dates use Asia/Bangkok (UTC+07:00).</p>
    {loading && <p role="status">Loading Ticket status history...</p>}
    {error && <div role="alert"><p>{error}</p><button className="btn btn-outline-success" onClick={() => setRetry(value => value + 1)}>Retry Ticket history</button></div>}
    {data && !data.items.length && <p>No status events recorded. Legacy history is not fabricated.</p>}
    {data && <ol>{data.items.map(event => <li key={event.id}><strong>{label(event.fromStatus)} → {label(event.toStatus)}</strong><p>{event.actor.name} ({label(event.actor.role)}) · {bangkokActionTime(event.createdAt)}</p>{event.reason && <p>Reason: {event.reason}</p>}</li>)}</ol>}
    {data && <nav aria-label="Ticket status history pages" className="workflow-controls">
      <button className="btn btn-outline-success" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous Ticket events</button>
      <span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)}</span>
      <button className="btn btn-outline-success" disabled={loading || page >= data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Next Ticket events</button>
    </nav>}
  </section>;
}
