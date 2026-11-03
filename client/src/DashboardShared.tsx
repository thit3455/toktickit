import { useEffect, useRef, useState } from "react";
import { DashboardError, type DashboardLink, type DashboardTicket } from "./dashboard.api";
import { bangkokActionTime } from "./actions-taken.rules";
import "./Dashboard.css";
export interface DashboardProps { onNavigate: (link: DashboardLink) => void; onOpenTicket: (id: number, actionId?: number) => void; onAccessFailure: (code: string) => void }
export function useDashboard<T>(load: (signal?: AbortSignal) => Promise<T>, onAccessFailure: DashboardProps["onAccessFailure"]) {
  const [data, setData] = useState<T | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  const callback = useRef(onAccessFailure); callback.current = onAccessFailure;
  useEffect(() => {
    let current = true; const controller = new AbortController(); setLoading(true); setError("");
    load(controller.signal).then(value => { if (current) { setData(value); setLoading(false); } }).catch(failure => {
      if (!current) return;
      setData(null); setLoading(false); setError(failure instanceof DashboardError ? failure.message : "Unable to load the dashboard. Please try again.");
      if (failure instanceof DashboardError && [401, 403].includes(failure.status)) callback.current(failure.code);
    });
    return () => { current = false; controller.abort(); };
  }, [load, revision]);
  return { data, loading, error, refresh: () => setRevision(value => value + 1) };
}
export function DashboardFeedback({ loading, error, refresh }: { loading: boolean; error: string; refresh: () => void }) {
  return <><button className="btn btn-outline-success mb-3" disabled={loading} onClick={refresh}>Refresh Dashboard</button>
    {loading && <p role="status">Loading dashboard...</p>}
    {error && <div className="alert alert-danger" role="alert"><p>{error}</p><button className="btn btn-success" onClick={refresh}>Retry dashboard</button></div>}</>;
}
export function Metric({ label, value, onView, viewLabel }: { label: string; value: number; onView?: () => void; viewLabel?: string }) {
  return <section className="card dashboard-metric" aria-label={label}><div className="card-body"><h3 className="h6">{label}</h3><p className="dashboard-value">{value}</p>{onView && <button className="btn btn-outline-success" onClick={onView}>{viewLabel ?? "View " + label}</button>}</div></section>;
}
export function SnapshotTime({ asOf }: { asOf: string }) {
  return <p className="text-muted">Last updated: <time dateTime={asOf}>{bangkokActionTime(asOf)}</time>. Counts cover all matching records. Linked lists remain live with this cutoff; refresh for a new snapshot.</p>;
}
export function RecentTickets({ title, items, onOpen, onView }: { title: string; items: DashboardTicket[]; onOpen: (id: number) => void; onView: () => void }) {
  return <section className="card mt-3" aria-label={title}><div className="card-body"><h3 className="h5">{title}</h3><p>Showing up to 5 Tickets.</p>
    {!items.length && <p role="status">No matching Tickets.</p>}<ul className="dashboard-list">{items.map(ticket => <li key={ticket.id}>
      <button className="btn btn-link text-start p-0" onClick={() => onOpen(ticket.id)}>Open {ticket.ticketNumber}</button><p>{ticket.summary}</p>
      <p>{ticket.currentStatus.replaceAll("_", " ")} | Updated {bangkokActionTime(ticket.updatedAt)}</p></li>)}</ul>
    <button className="btn btn-outline-success" onClick={onView}>View all {title}</button></div></section>;
}
