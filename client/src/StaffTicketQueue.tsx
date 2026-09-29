import { useEffect, useState } from "react";
import { getStaffTickets, GetStaffTicketsParams, StaffQueueError, StaffTicket, StaffTicketQueueResponse } from "./api.js";
import "./StaffTicketQueue.css";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH"];
const sorts = [
  ["createdAt", "Created Date"], ["updatedAt", "Last Updated"], ["ticketNumber", "Ticket Number"],
  ["requestedPriority", "Requested Priority"], ["itPriority", "IT Priority"],
];
const initialQuery: GetStaffTicketsParams = { page: 1, limit: 10, sort: "createdAt", order: "desc" };
const label = (value: string) => value.replaceAll("_", " ");

const badgeTones: Record<string, string> = {
  HIGH: "red", URGENT: "red", MEDIUM: "amber", LOW: "green",
  NEW: "blue", OPEN: "blue", IN_PROGRESS: "green", WAITING_FOR_REQUESTER: "amber",
  RESOLVED: "green", CLOSED: "gray", REOPENED: "orange", CANCELLED: "gray",
};

function Badge({ value, strong = false, semantic = false }: { value: string; strong?: boolean; semantic?: boolean }) {
  const tone = badgeTones[value.trim().toUpperCase().replaceAll(" ", "_")] ?? "gray";
  const colors = semantic ? `staff-queue-badge--${tone}` : strong ? "text-bg-success border-success" : "bg-success-subtle text-success-emphasis border-success-subtle";
  return <span className={`badge rounded-pill border ${colors}`}>{label(value)}</span>;
}

export function StaffTicketQueue({ onOpen }: { onOpen: (id: number) => void }) {
  const [query, setQuery] = useState<GetStaffTicketsParams>(initialQuery);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<StaffTicketQueueResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "unauthenticated" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const filtered = !!(query.search || query.status || query.priority || query.itPriority || query.assigned !== undefined);
  const change = (patch: Partial<GetStaffTicketsParams>) => {
    setState("loading");
    setQuery(current => ({ ...current, ...patch, page: 1 }));
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState("loading");
    getStaffTickets(query, controller.signal).then(data => {
      if (!active) return;
      setResult(data);
      setState("ready");
    }).catch(error => {
      if (!active) return;
      setResult(null);
      setState(error instanceof StaffQueueError && error.status === 403 ? "forbidden" : error instanceof StaffQueueError && error.status === 401 ? "unauthenticated" : "error");
    });
    return () => { active = false; controller.abort(); };
  }, [query, retry]);

  const pagination = result?.pagination;
  const page = pagination?.page ?? query.page ?? 1;
  const pageCount = Math.max(1, pagination?.totalPages ?? 0);
  const reset = () => { setSearch(""); setState("loading"); setQuery({ ...initialQuery }); };
  const fields = [
    { id: "status", title: "Status", values: statuses, value: query.status ?? "", update: (value: string) => change({ status: value || undefined }) },
    { id: "requested", title: "Requested Priority", values: priorities, value: query.priority ?? "", update: (value: string) => change({ priority: (value || undefined) as GetStaffTicketsParams["priority"] }) },
    { id: "it", title: "IT Priority", values: [...priorities, "URGENT"], value: query.itPriority ?? "", update: (value: string) => change({ itPriority: (value || undefined) as StaffTicket["itPriority"] | undefined }) },
  ];

  return <section className="staff-queue" aria-labelledby="staff-queue-title">
    <h2 id="staff-queue-title" className="h4 mb-3">IT Staff Ticket Queue</h2>
    <div className="card border-success-subtle mb-3"><div className="card-body">
      <form className="d-flex flex-wrap gap-2 align-items-end mb-3" onSubmit={event => { event.preventDefault(); change({ search: search.trim() || undefined }); }}>
        <div className="flex-grow-1 staff-queue-search">
          <label className="form-label" htmlFor="staff-queue-search">Search tickets</label>
          <input id="staff-queue-search" className="form-control" type="search" maxLength={200} placeholder="Ticket number, summary or requester email" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <button type="submit" className="btn btn-success">Search</button>
        <button type="button" className="btn btn-outline-success" onClick={reset}>Reset</button>
      </form>
      <div className="row g-3">
        {fields.map(field => <div key={field.id} className="col-12 col-sm-6 col-lg-3">
          <label className="form-label" htmlFor={`staff-filter-${field.id}`}>{field.title}</label>
          <select id={`staff-filter-${field.id}`} className="form-select" value={field.value} onChange={event => field.update(event.target.value)}>
            <option value="">All</option>{field.values.map(value => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </div>)}
        <div className="col-12 col-sm-6 col-lg-3">
          <label className="form-label" htmlFor="staff-filter-owner">Owner</label>
          <select id="staff-filter-owner" className="form-select" value={query.assigned === undefined ? "" : String(query.assigned)} onChange={event => change({ assigned: event.target.value === "" ? undefined : event.target.value === "true" })}>
            <option value="">All owners</option><option value="true">Assigned</option><option value="false">Unassigned</option>
          </select>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="staff-queue-sort">Sort by</label>
          <select id="staff-queue-sort" className="form-select" value={query.sort} onChange={event => change({ sort: event.target.value })}>{sorts.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="staff-queue-order">Sort direction</label>
          <select id="staff-queue-order" className="form-select" value={query.order} onChange={event => change({ order: event.target.value as "asc" | "desc" })}><option value="desc">Descending</option><option value="asc">Ascending</option></select>
        </div>
      </div>
    </div></div>
    <p className="text-muted small">Sorted by {sorts.find(([value]) => value === query.sort)?.[1]} — {query.order === "desc" ? "descending" : "ascending"}. All statuses are included unless filtered.</p>
    <div aria-busy={state === "loading"}>
      {state === "loading" && <p className="alert alert-success" role="status">Loading tickets...</p>}
      {state === "forbidden" && <p className="alert alert-warning" role="alert">You do not have permission to view the IT Staff queue.</p>}
      {state === "unauthenticated" && <p className="alert alert-warning" role="alert">Your session has expired. Please log in again.</p>}
      {state === "error" && <div className="alert alert-danger" role="alert">Unable to load the ticket queue. Please try again. <button className="btn btn-outline-success ms-2" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {state === "ready" && result && <>
        <p role="status">Total Tickets: {result.pagination.total}{filtered ? " matching" : ""}</p>
        {result.data.length === 0 ? <div className="alert alert-success" role="status">
          {filtered ? "No tickets match your search or filters." : "The ticket queue is empty."}
          {filtered && <button className="btn btn-outline-success ms-2" onClick={reset}>Clear search and filters</button>}
        </div> : <table className="table table-bordered align-middle staff-queue-table" role="table">
          <caption className="visually-hidden">IT Staff tickets</caption>
          <thead className="table-success"><tr>{["Ticket Number", "Created Date", "Summary", "Category", "Requested Priority", "IT Priority", "Status", "Ticket Owner", "Action"].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
          <tbody>{result.data.map(ticket => <tr key={ticket.id}>
            <td data-label="Ticket Number" className="fw-semibold">{ticket.ticketNumber}</td>
            <td data-label="Created Date"><time dateTime={ticket.createdAt}>{new Date(ticket.createdAt).toLocaleString()}</time></td>
            <td data-label="Summary">{ticket.summary}</td><td data-label="Category">{ticket.category.name}</td>
            <td data-label="Requested Priority"><Badge value={ticket.requestedPriority} semantic /></td>
            <td data-label="IT Priority"><Badge value={ticket.itPriority} semantic /></td>
            <td data-label="Status"><Badge value={ticket.currentStatus} semantic /></td>
            <td data-label="Ticket Owner">{ticket.assignedStaff?.name ?? "Unassigned"}</td>
            <td data-label="Action"><button type="button" className="btn btn-outline-success btn-sm" onClick={() => onOpen(ticket.id)}>Open<span className="visually-hidden"> {ticket.ticketNumber}</span></button></td>
          </tr>)}</tbody>
        </table>}
        <nav aria-label="Ticket queue pagination" className="d-flex flex-wrap align-items-center gap-3 mt-3">
          <button className="btn btn-outline-success" disabled={page <= 1} onClick={() => { setState("loading"); setQuery(current => ({ ...current, page: page - 1 })); }}>Previous</button>
          <span>Page {page} of {pageCount}</span>
          <button className="btn btn-outline-success" disabled={page >= pageCount} onClick={() => { setState("loading"); setQuery(current => ({ ...current, page: page + 1 })); }}>Next</button>
        </nav>
      </>}
    </div>
  </section>;
}
