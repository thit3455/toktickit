import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
type Message = { id: number; message: string; createdAt: string; user?: { name: string } };

function Messages({ ticketId, internal = false }: { ticketId: number; internal?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const title = internal ? "Internal Notes" : "Public Comments";
  const url = `${API}/api/tickets/${ticketId}/${internal ? "internal-notes" : "comments"}`;
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(url, { credentials: "include" }).then(async response => {
      if (!response.ok) throw new Error(`Unable to load ${title}.`);
      const result = await response.json();
      if (active) { setMessages(result.data); setError(""); }
    }).catch(error => { if (active) setError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url, revision, title]);
  return <section className="card mb-3">
    <h3 className="card-header h5">{title}</h3>
    <div className="card-body">
      {internal && <p className="text-muted">Visible only to IT Staff and Administrators.</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {loading ? <p>Loading…</p> : messages.length === 0 ? <p>No messages yet.</p> : messages.map(message =>
        <article key={message.id} className="border-bottom mb-3">
          <strong>{message.user?.name ?? "User"}</strong> <small>{new Date(message.createdAt).toLocaleString()}</small>
          <p style={{ whiteSpace: "pre-wrap" }}>{message.message}</p>
        </article>)}
      <form onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError("");
        try {
          const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: draft.trim() }) });
          if (!response.ok) throw new Error(`Unable to save ${internal ? "note" : "comment"}.`);
          setDraft(""); setRevision(value => value + 1);
        } catch (error) { setError((error as Error).message); }
        finally { setBusy(false); }
      }}>
        <label htmlFor={internal ? "note-message" : "comment-message"} className="form-label">{internal ? "New internal note" : "New public comment"}</label>
        <textarea id={internal ? "note-message" : "comment-message"} className="form-control" value={draft} onChange={event => setDraft(event.target.value)} maxLength={10000} required disabled={busy} />
        <button className="btn btn-success mt-2" disabled={busy || !draft.trim()}>{busy ? "Saving…" : internal ? "Add Internal Note" : "Add Public Comment"}</button>
      </form>
    </div>
  </section>;
}

export function TicketDiscussion({ ticketId, staff }: { ticketId: number; staff: boolean }) {
  return <><Messages ticketId={ticketId} />{staff && <Messages ticketId={ticketId} internal />}</>;
}
