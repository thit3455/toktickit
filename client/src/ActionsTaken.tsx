import { useEffect, useRef, useState } from "react";
import {
  ActionsApiError, createActionTaken, getActionAssignees, getActionHistory, getActionsTaken, patchActionTaken,
  type AccountRole, type ActionHistory, type ActionList, type ActionStatus, type ActionTaken, type ActiveStaffUser, type CreateActionInput, type PatchActionInput,
} from "./api";
import { actionContentInput, actionDraft, activeActionTicket, bangkokActionTime, eligibleActionAssignee, emptyActionDraft, nextActionStatuses, validateActionDraft, type ActionDraft } from "./actions-taken.rules";
import "./ActionsTaken.css";

interface Props {
  ticketId: number; ticketStatus: string; role: AccountRole; userName: string;
  onRefreshTicket: () => Promise<void>; onAccessFailure: (code: string) => void;
}
type Mode = "create" | "edit" | "start" | "complete" | "cancel";
interface Editor {
  mode: Mode; base: ActionTaken | null; ticketVersion: number; draft: ActionDraft;
  conflict: boolean; reviewed?: { action: ActionTaken | null; ticketVersion: number };
}
const label = (value: string) => value.replaceAll("_", " ");
const safeError = (error: unknown) => error instanceof ActionsApiError ? error.message : "Unable to complete the request. Your draft has been kept. Please try again.";

export function ActionsTaken({ ticketId, ticketStatus, role, userName, onRefreshTicket, onAccessFailure }: Props) {
  const operational = role === "IT_STAFF" || role === "ADMINISTRATOR";
  const activeTicket = activeActionTicket(ticketStatus);
  const [list, setList] = useState<ActionList | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [staff, setStaff] = useState<ActiveStaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffRetry, setStaffRetry] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<CreateActionInput | null>(null);
  const [success, setSuccess] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const alive = useRef(false);
  const pending = useRef(false);
  const listRequest = useRef(0);
  const callbacks = useRef({ onRefreshTicket, onAccessFailure });
  callbacks.current = { onRefreshTicket, onAccessFailure };
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function protectedFailure(failure: unknown) {
    if (failure instanceof ActionsApiError && (failure.status === 401 || failure.status === 403)) {
      listRequest.current++;
      setList(null); setEditor(null); setAttempt(null); setHistoryId(null); setStaff([]);
      callbacks.current.onAccessFailure(failure.code);
      return true;
    }
    return false;
  }
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    const request = ++listRequest.current;
    setLoading(true); setListError("");
    getActionsTaken(ticketId, page, controller.signal).then(data => {
      if (current && request === listRequest.current) { setList(data); setLoading(false); }
    }).catch(failure => {
      if (!current || request !== listRequest.current) return;
      protectedFailure(failure); setList(null); setListError(safeError(failure)); setLoading(false);
    });
    return () => { current = false; controller.abort(); };
  }, [ticketId, page, reload]);
  useEffect(() => {
    if (!operational) return;
    const controller = new AbortController(); let current = true;
    setStaffLoading(true); setStaffError("");
    getActionAssignees(controller.signal).then(data => { if (current) { setStaff(data); setStaffLoading(false); } }).catch(failure => {
      if (current) { protectedFailure(failure); setStaff([]); setStaffError(safeError(failure)); setStaffLoading(false); }
    });
    return () => { current = false; controller.abort(); };
  }, [operational, staffRetry]);
  useEffect(() => {
    if (editor) form.current?.querySelector<HTMLElement>("input:not([disabled]),textarea:not([disabled]),select:not([disabled])")?.focus();
    else trigger.current?.focus();
  }, [editor?.mode, editor?.base?.id]);
  useEffect(() => { if (success) successRef.current?.focus(); }, [success]);
  function open(mode: Mode, action: ActionTaken | null, opener: HTMLElement) {
    if (!list) return;
    // Pointer activation need not focus a button. Always remember the actual trigger.
    trigger.current = opener;
    setEditor({ mode, base: action, ticketVersion: list.ticketVersion, draft: action ? actionDraft(action) : emptyActionDraft(), conflict: false });
    setFields({}); setError(""); setSuccess(""); setAttempt(null);
  }
  function close() {
    setEditor(null); setAttempt(null); setFields({}); setError("");
  }
  async function refreshReview() {
    if (!editor || pending.current) return;
    pending.current = true;
    setBusy(true); setError("");
    const request = ++listRequest.current;
    try {
      const current = await getActionsTaken(ticketId, page);
      await callbacks.current.onRefreshTicket();
      if (!alive.current || request !== listRequest.current) return;
      setList(current); setLoading(false);
      const action = editor.base ? current.items.find(item => item.id === editor.base!.id) : null;
      if (editor.base && !action) { setError("The action is unavailable on this page. Close the editor and reload the list."); return; }
      setEditor(previous => previous ? { ...previous, reviewed: { action: action ?? null, ticketVersion: current.ticketVersion } } : null);
    } catch (failure) { if (alive.current) { protectedFailure(failure); setError(safeError(failure)); } }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  async function save() {
    if (!editor || pending.current || !activeTicket) return;
    const status: ActionStatus = editor.mode === "complete" ? "COMPLETED" : editor.mode === "start" ? "IN_PROGRESS" : editor.mode === "cancel" ? "CANCELLED" : editor.base?.status ?? "PLANNED";
    const errors = editor.mode === "cancel" ? (editor.draft.reason.trim().length < 1 || editor.draft.reason.trim().length > 500 ? { reason: "Enter a cancellation reason of 1–500 characters." } : {}) : validateActionDraft(editor.draft, status);
    setFields(errors); setError(""); setSuccess("");
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()); return;
    }
    if (editor.conflict) return;
    if (editor.base && ((editor.mode !== "edit" && !nextActionStatuses(editor.base.status).includes(status)) || editor.base.status === "CANCELLED")) {
      setError("The action state changed. Close this editor and choose a permitted operation from the refreshed record."); return;
    }
    if (editor.base?.status === "COMPLETED" && Number(editor.draft.assignedToId) !== editor.base.assignedTo.id) {
      setError("The completed action's assignee is immutable. Close this editor and reopen a content correction."); return;
    }
    pending.current = true; setBusy(true);
    try {
      let saved;
      if (!editor.base) {
        const input = attempt ?? { ...actionContentInput(editor.draft), requestId: crypto.randomUUID(), expectedTicketVersion: editor.ticketVersion, assignedToId: Number(editor.draft.assignedToId) };
        setAttempt(input);
        saved = await createActionTaken(ticketId, input);
      } else {
        const input: PatchActionInput = { expectedVersion: editor.base.version, expectedTicketVersion: editor.ticketVersion };
        if (editor.mode === "cancel") { input.status = "CANCELLED"; input.reason = editor.draft.reason.trim(); }
        else {
          const content = actionContentInput(editor.draft);
          for (const key of ["description", "result", "followUpRequired", "followUpNote", "attachmentNotes"] as const) {
            if (content[key] !== editor.base[key]) Object.assign(input, { [key]: content[key] });
          }
          if (Number(editor.draft.assignedToId) !== editor.base.assignedTo.id) input.assignedToId = Number(editor.draft.assignedToId);
          if (status !== editor.base.status) input.status = status;
        }
        if (Object.keys(input).length === 2) { setError("There are no changes to save."); return; }
        saved = await patchActionTaken(ticketId, editor.base.id, input);
      }
      if (!alive.current) return;
      setEditor(null); setAttempt(null); setFields({}); setHistoryId(null);
      setSuccess(`Action #${saved.action.id} ${saved.replayed ? "confirmed from the original request" : "saved"}.`);
      // A replay contains an original snapshot. Always GET before enabling another write.
      setLoading(true);
      const request = ++listRequest.current;
      let pageChanging = false;
      try {
        const current = await getActionsTaken(ticketId, page);
        if (!alive.current || request !== listRequest.current) return;
        setList(current);
        if (!editor.base && current.pagination.totalPages > page) {
          // New actions sort last; visit that page without reversing server order.
          pageChanging = true;
          setPage(current.pagination.totalPages);
        }
        await callbacks.current.onRefreshTicket();
      } catch (failure) {
        if (alive.current) { protectedFailure(failure); setList(null); setListError(`The save succeeded. ${safeError(failure)}`); }
      } finally { if (alive.current && !pageChanging && request === listRequest.current) setLoading(false); }
    } catch (failure) {
      if (!alive.current) return;
      if (protectedFailure(failure)) return;
      setError(safeError(failure));
      if (failure instanceof ActionsApiError && failure.code === "INVALID_ASSIGNEE") {
        setFields(previous => ({ ...previous, assignedToId: "Select an active IT Staff assignee. Refresh the staff options if the account changed." }));
      }
      if (failure instanceof ActionsApiError && failure.status === 409) {
        setAttempt(null); setEditor(previous => previous ? { ...previous, conflict: true, reviewed: undefined } : null);
      } else if (failure instanceof ActionsApiError && [400, 404, 413, 415].includes(failure.status)) setAttempt(null);
      // A network/500/unreadable create response may have committed: retain exact input/UUID.
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  const locked = busy || !!attempt;
  const base = editor?.base;
  const assignable = !base || base.status === "PLANNED" || base.status === "IN_PROGRESS";
  function field(key: "description" | "result" | "followUpNote" | "attachmentNotes" | "reason", title: string, required = false) {
    if (!editor) return null;
    const id = `action-${ticketId}-${key}`;
    return <div className="mb-3"><label htmlFor={id} className="form-label">{title}{required ? " *" : ""}</label>
      <textarea id={id} className="form-control" value={editor.draft[key]} disabled={locked} required={required} aria-invalid={!!fields[key]} aria-describedby={`${id}-hint${fields[key] ? ` ${id}-error` : ""}`}
        onChange={event => { const value = event.target.value; setEditor(previous => previous ? { ...previous, draft: { ...previous.draft, [key]: value } } : null); }} />
      <small id={`${id}-hint`}>Maximum {key === "reason" ? 500 : 2000} characters.</small>
      {fields[key] && <p id={`${id}-error`} className="text-danger">{fields[key]}</p>}</div>;
  }
  const mutableBase = !base || base.status !== "CANCELLED";
  const savedEligible = !base || eligibleActionAssignee(base) || Number(editor?.draft.assignedToId) !== base.assignedTo.id;
  const needsStaff = editor?.mode !== "cancel" && assignable;
  const operationAllowed = !base || editor?.mode === "edit" || nextActionStatuses(base.status).includes(editor?.mode === "cancel" ? "CANCELLED" : editor?.mode === "start" ? "IN_PROGRESS" : "COMPLETED");
  const immutableAssignmentChanged = base?.status === "COMPLETED" && Number(editor?.draft.assignedToId) !== base.assignedTo.id;
  return <section className="actions-taken card mb-4" aria-labelledby={`actions-title-${ticketId}`}>
    <div className="card-header"><h3 id={`actions-title-${ticketId}`} className="h5 mb-0">Actions Taken</h3></div>
    <div className="card-body">
      <p>Action Date/Time is the server creation time. Dates use Asia/Bangkok (UTC+07:00).</p>
      {!activeTicket && <p className="alert alert-secondary">Actions are read-only on this {label(ticketStatus)} Ticket. Resolved or Closed Tickets require reopening before changes; Cancelled Tickets are terminal.</p>}
      {success && <p ref={successRef} tabIndex={-1} role="status" className="alert alert-success">{success}</p>}
      {loading && <p role="status">Loading Actions Taken...</p>}
      {listError && <div role="alert"><p>{listError}</p><button className="btn btn-outline-success" onClick={() => setReload(value => value + 1)}>Retry actions</button></div>}
      {operational && activeTicket && list && !loading && <button className="btn btn-success mb-3" disabled={!!editor} onClick={event => open("create", null, event.currentTarget)}>Record action</button>}
      {list && !loading && !list.items.length && <p>{list.pagination.total === 0 ? "No Actions Taken recorded yet." : "No actions on this page. Return to the previous page."}</p>}
      {list && <>
        <table className="actions-table" role="table"><caption className="visually-hidden">Actions in creation order</caption><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Action Date/Time</th><th role="columnheader" scope="col">Action Description and details</th><th role="columnheader" scope="col">Status and operations</th></tr></thead>
          <tbody role="rowgroup">{list.items.map(action => <tr key={action.id} role="row">
            <td role="cell" data-label="Action Date/Time"><time dateTime={action.createdAt}>{bangkokActionTime(action.createdAt)}</time></td>
            <td role="cell" data-label="Action Description"><strong>Action #{action.id}</strong><p>{action.description}</p>
              <details><summary>View action #{action.id} details</summary><dl>
                <dt>Result</dt><dd>{action.result || "Not recorded"}</dd>
                <dt>Created by</dt><dd>{action.createdBy.name}</dd><dt>Assigned to</dt><dd>{action.assignedTo.name}{!eligibleActionAssignee(action) ? " (inactive or no longer IT Staff)" : ""}</dd>
                <dt>Performed by</dt><dd>{action.performedBy?.name ?? "Not yet completed"}</dd>
                <dt>Follow-Up Required?</dt><dd>{action.followUpRequired ? "Yes" : "No"}</dd><dt>Follow-up Note</dt><dd>{action.followUpNote || "Not recorded"}</dd>
                <dt>Attachment Notes</dt><dd>{action.attachmentNotes || "Not recorded"}</dd><dt>Last updated</dt><dd>{bangkokActionTime(action.updatedAt)}</dd>
                {action.completedAt && <><dt>Completed at</dt><dd>{bangkokActionTime(action.completedAt)}</dd></>}
                {action.cancelledAt && <><dt>Cancelled at</dt><dd>{bangkokActionTime(action.cancelledAt)}</dd><dt>Cancellation reason</dt><dd>{action.cancellationReason}</dd></>}
              </dl></details>
            </td>
            <td role="cell" data-label="Status and operations"><span className="action-status">{label(action.status)}</span>
              {operational && activeTicket && action.status !== "CANCELLED" && <div className="action-buttons">
                <button className="btn btn-outline-success" disabled={!!editor || loading} onClick={event => open("edit", action, event.currentTarget)}>{action.status === "COMPLETED" ? "Correct" : "Edit"} action #{action.id}</button>
                {nextActionStatuses(action.status).map(status => <button key={status} className="btn btn-outline-success" disabled={!!editor || loading || (status !== "CANCELLED" && !eligibleActionAssignee(action))}
                  onClick={event => open(status === "IN_PROGRESS" ? "start" : status === "COMPLETED" ? "complete" : "cancel", action, event.currentTarget)}>{status === "IN_PROGRESS" ? "Start" : status === "COMPLETED" ? "Complete" : "Cancel"} action #{action.id}</button>)}
                {!eligibleActionAssignee(action) && action.status !== "COMPLETED" && <p>Reassign to active IT Staff before starting or completing. Cancellation is still allowed.</p>}
              </div>}
              {operational && <button className="btn btn-link" aria-expanded={historyId === action.id} aria-controls={`action-history-${action.id}`} onClick={() => setHistoryId(historyId === action.id ? null : action.id)}>History for action #{action.id}</button>}
              {operational && historyId === action.id && <RevisionHistory key={`${action.id}:${action.version}`} ticketId={ticketId} actionId={action.id} onFailure={protectedFailure} />}
            </td>
          </tr>)}</tbody>
        </table>
        <nav className="action-pagination" aria-label="Actions Taken pages">
          <button className="btn btn-outline-success" disabled={page <= 1 || loading || !!editor} onClick={() => setPage(value => value - 1)}>Previous actions</button>
          <span>Page {list.pagination.page} of {Math.max(1, list.pagination.totalPages)} · {list.pagination.total} actions</span>
          <button className="btn btn-outline-success" disabled={page >= list.pagination.totalPages || loading || !!editor} onClick={() => setPage(value => value + 1)}>Next actions</button>
        </nav>
      </>}
      {editor && <form ref={form} className="action-editor mt-4" aria-label={editor.mode === "cancel" ? "Confirm action cancellation" : "Action editor"} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
        <h4 className="h5">{editor.mode === "create" ? "Record a Planned action" : `${label(editor.mode.toUpperCase())} action #${base?.id}`}</h4>
        <p>Fields marked * are required. Creator, performer and timestamps are recorded automatically.</p>
        {editor.mode === "cancel" ? <><p>Cancellation retains the action and its history. This cannot be undone.</p>{field("reason", "Cancellation reason", true)}</> : <>
          {field("description", "Action Description", true)}
          <div className="mb-3"><label htmlFor={`action-${ticketId}-assignedToId`} className="form-label">Assigned to *</label>
            <select id={`action-${ticketId}-assignedToId`} className="form-select" disabled={locked || !assignable || staffLoading || !!staffError} value={editor.draft.assignedToId} aria-invalid={!!fields.assignedToId} aria-describedby={fields.assignedToId ? "action-assignee-error" : undefined}
              onChange={event => { const value = event.target.value; setEditor(previous => previous ? { ...previous, draft: { ...previous.draft, assignedToId: value } } : null); }}>
              <option value="">Select active IT Staff</option>
              {base && !staff.some(user => user.id === base.assignedTo.id) && <option value={base.assignedTo.id}>{base.assignedTo.name}{eligibleActionAssignee(base) ? "" : " (ineligible)"}</option>}
              {staff.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>{fields.assignedToId && <p id="action-assignee-error" className="text-danger">{fields.assignedToId}</p>}
            {staffLoading && <p role="status">Loading active IT Staff...</p>}
            {staffError && <p role="alert">{staffError}</p>}
            {!staffLoading && !staffError && !staff.length && <p>No active IT Staff are available for assignment.</p>}
            <button type="button" className="btn btn-link" disabled={busy || staffLoading} onClick={() => setStaffRetry(value => value + 1)}>Refresh active IT Staff</button>
          </div>
          {field("result", "Result", editor.mode === "complete" || base?.status === "COMPLETED")}
          <div className="form-check mb-3"><input className="form-check-input" type="checkbox" id={`action-${ticketId}-followUpRequired`} checked={editor.draft.followUpRequired} disabled={locked} onChange={event => { const checked = event.target.checked; setEditor(previous => previous ? { ...previous, draft: { ...previous.draft, followUpRequired: checked } } : null); }} />
            <label className="form-check-label" htmlFor={`action-${ticketId}-followUpRequired`}>Follow-Up Required?</label></div>
          {field("followUpNote", "Follow-up Note", editor.draft.followUpRequired)}{field("attachmentNotes", "Attachment Notes")}
          <p>Attachment Notes are plain text references to existing Ticket files; no new upload is created.</p>
          {editor.mode === "complete" && <p>The actual performer will be {userName}. Pending follow-up may remain, but blocks later Ticket resolution.</p>}
          {base?.status === "COMPLETED" && <p>Content correction only. Assignee, performer, status and completion time remain unchanged.</p>}
        </>}
        {error && <p role="alert">{error}</p>}
        {attempt && !busy && <p role="alert">The create outcome is uncertain. Your draft is locked; retry the exact original request to avoid duplicates.</p>}
        {editor.conflict && <div className="alert alert-warning"><p>Your draft is retained. Refresh and compare the saved record before applying it.</p>
          <button type="button" className="btn btn-outline-success" disabled={busy} onClick={() => void refreshReview()}>Refresh current record</button>
          {editor.reviewed && <><h5 className="h6 mt-3">Current saved record</h5>
            {editor.reviewed.action ? <dl><dt>Description</dt><dd>{editor.reviewed.action.description}</dd><dt>Result</dt><dd>{editor.reviewed.action.result || "Not recorded"}</dd><dt>Status</dt><dd>{label(editor.reviewed.action.status)}</dd><dt>Assigned to</dt><dd>{editor.reviewed.action.assignedTo.name}</dd><dt>Follow-Up Required?</dt><dd>{editor.reviewed.action.followUpRequired ? "Yes" : "No"}</dd><dt>Follow-up Note</dt><dd>{editor.reviewed.action.followUpNote || "Not recorded"}</dd><dt>Attachment Notes</dt><dd>{editor.reviewed.action.attachmentNotes || "Not recorded"}</dd></dl> : <p>Current Ticket version {editor.reviewed.ticketVersion}. Review the refreshed actions before creating new work.</p>}
            <button type="button" className="btn btn-outline-success" disabled={busy} onClick={() => setEditor(previous => previous?.reviewed ? { ...previous, base: previous.reviewed.action, ticketVersion: previous.reviewed.ticketVersion, conflict: false, reviewed: undefined } : previous)}>Keep draft and use refreshed versions</button>
          </>}
        </div>}
        {(!operationAllowed || !mutableBase || immutableAssignmentChanged) && <p role="alert">The saved action state no longer permits this operation. Close the editor and choose a permitted operation from the refreshed record.</p>}
        <div className="action-buttons"><button className="btn btn-success" type="submit" disabled={busy || editor.conflict || !activeTicket || !mutableBase || !operationAllowed || immutableAssignmentChanged || (!!needsStaff && (staffLoading || !!staffError || !staff.length)) || ((editor.mode === "start" || editor.mode === "complete") && !savedEligible)}>{busy ? "Saving action..." : attempt ? "Retry original creation" : editor.mode === "cancel" ? "Confirm cancellation" : "Save action"}</button>
          <button className="btn btn-outline-secondary" type="button" disabled={locked} onClick={close}>{editor.mode === "cancel" ? "Keep action" : "Cancel editing"}</button></div>
      </form>}
    </div>
  </section>;
}

function RevisionHistory({ ticketId, actionId, onFailure }: { ticketId: number; actionId: number; onFailure: (error: unknown) => boolean }) {
  const [history, setHistory] = useState<ActionHistory | null>(null);
  const [page, setPage] = useState(1); const [retry, setRetry] = useState(0);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const failureCallback = useRef(onFailure); failureCallback.current = onFailure;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setLoading(true); setError("");
    getActionHistory(ticketId, actionId, page, controller.signal).then(data => { if (current) { setHistory(data); setLoading(false); } }).catch(failure => {
      if (current) { failureCallback.current(failure); setHistory(null); setError(safeError(failure)); setLoading(false); }
    });
    return () => { current = false; controller.abort(); };
  }, [ticketId, actionId, page, retry]);
  return <section id={`action-history-${actionId}`} aria-label={`Private revision history for action #${actionId}`} className="action-history">
    <h4 className="h6">Private operational revision history</h4>
    {loading && <p role="status">Loading action history...</p>}
    {error && <div role="alert"><p>{error}</p><button className="btn btn-outline-success" onClick={() => setRetry(value => value + 1)}>Retry history</button></div>}
    {history && !history.items.length && <p>No revisions recorded on this page. Earlier legacy records may have no recorded history.</p>}
    {history?.items.map(revision => <details key={revision.id}><summary>Version {revision.version} · {label(revision.operation)} · {revision.actor.name} ({label(revision.actor.role)}) · {bangkokActionTime(revision.createdAt)}</summary>
      <dl><dt>Description</dt><dd>{revision.snapshot.description}</dd><dt>Result</dt><dd>{revision.snapshot.result || "Not recorded"}</dd><dt>Status</dt><dd>{label(revision.snapshot.status)}</dd>
        <dt>Creator account</dt><dd>#{revision.snapshot.createdById}</dd><dt>Assignee account</dt><dd>#{revision.snapshot.assignedToId}</dd><dt>Performer account</dt><dd>{revision.snapshot.performedById === null ? "Not yet completed" : `#${revision.snapshot.performedById}`}</dd>
        <dt>Follow-Up Required?</dt><dd>{revision.snapshot.followUpRequired ? "Yes" : "No"}</dd><dt>Follow-up Note</dt><dd>{revision.snapshot.followUpNote || "Not recorded"}</dd><dt>Attachment Notes</dt><dd>{revision.snapshot.attachmentNotes || "Not recorded"}</dd>
        {revision.snapshot.completedAt && <><dt>Completed at</dt><dd>{bangkokActionTime(revision.snapshot.completedAt)}</dd></>}
        {revision.snapshot.cancelledAt && <><dt>Cancelled at</dt><dd>{bangkokActionTime(revision.snapshot.cancelledAt)}</dd><dt>Cancellation reason</dt><dd>{revision.snapshot.cancellationReason}</dd></>}
      </dl></details>)}
    {history && <nav aria-label="Action revision pages" className="action-pagination"><button className="btn btn-outline-success" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous revisions</button><span>Page {history.pagination.page} of {Math.max(1, history.pagination.totalPages)}</span><button className="btn btn-outline-success" disabled={loading || page >= history.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Next revisions</button></nav>}
  </section>;
}
