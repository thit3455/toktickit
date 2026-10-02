import { FormEvent, useEffect, useRef, useState } from "react";
import "./AdminUserManagement.css";
import { AccountInput, AccountRole, AdminApiError, ManagedUser, createAdminUser, getAdminUsers, setAdminInitialPassword, updateAdminUser } from "./api.js";

const PAGE_SIZE = 10;
const roles: AccountRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
type Editor = { kind: "create" | "edit" | "password"; user?: ManagedUser };
const blank: AccountInput = { name: "", email: "", role: "REQUESTER", isActive: true, password: "" };
export function AdminUserManagement({ currentUserId, onSelfChange, onSessionEnded }: {
  currentUserId: number; onSelfChange: (user: ManagedUser) => void; onSessionEnded: () => void;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [sort, setSort] = useState<{ field: "Name" | "Email" | "Role" | "Status"; direction: "ascending" | "descending" }>({ field: "Name", direction: "ascending" });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [criteria, setCriteria] = useState({ search: "", role: "", active: "" });
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden" | "unauthenticated">("loading");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [form, setForm] = useState<AccountInput>(blank);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (editor) panelHeading.current?.focus();
  }, [editor]);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading"); setError(""); setUsers([]);
    getAdminUsers(criteria, controller.signal).then(data => {
      if (!controller.signal.aborted) { setUsers(data); setState("ready"); }
    }).catch(cause => {
      if (controller.signal.aborted) return;
      setError(cause instanceof AdminApiError ? cause.message : "Unable to load users. Please try again.");
      const denied = cause instanceof AdminApiError && [401, 403].includes(cause.status);
      setState(denied ? cause.status === 401 ? "unauthenticated" : "forbidden" : "error");
      if (denied) { setEditor(null); setForm(blank); }
    });
    return () => controller.abort();
  }, [criteria, revision]);
  useEffect(() => { setPage(1); }, [criteria, sort]);
  function open(next: Editor) {
    setEditor(next); setFields({}); setFormError(""); setMessage("");
    setForm(next.kind === "edit" && next.user ? { name: next.user.name, email: next.user.email, role: next.user.role, isActive: next.user.isActive, password: "" } : { ...blank });
  }
  function change(key: keyof AccountInput, value: string | boolean) {
    setForm(previous => ({ ...previous, [key]: value }));
    setFields(previous => ({ ...previous, [key]: "" }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    const invalid: Record<string, string> = {};
    if (editor.kind !== "password") {
      if (!form.name.trim() || form.name.trim().length > 120) invalid.name = "Name must contain 1 to 120 characters.";
      if (form.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) invalid.email = "Enter a valid email address.";
    }
    if (editor.kind !== "edit" && (!form.password || form.password.length < 8 || new TextEncoder().encode(form.password).length > 72)) invalid.password = "Use at least 8 characters and at most 72 UTF-8 bytes.";
    setFields(invalid); setFormError("");
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      const input = { name: form.name.trim(), email: form.email.trim(), role: form.role, isActive: form.isActive };
      const saved = editor.kind === "create" ? await createAdminUser({ ...input, password: form.password }) :
        editor.kind === "edit" ? await updateAdminUser(editor.user!.id, input) : await setAdminInitialPassword(editor.user!.id, form.password!);
      const requiresLogin = saved.id === currentUserId && (editor.kind === "password" || saved.role !== "ADMINISTRATOR");
      setEditor(null); setForm(blank); setRevision(value => value + 1);
      setMessage(editor.kind === "create" ? "User created. The initial password must be changed on first login." : editor.kind === "password" ? "Initial password set. Existing sessions have been signed out." : "User updated successfully.");
      if (requiresLogin) onSessionEnded();
      else if (saved.id === currentUserId) onSelfChange(saved);
    } catch (cause) {
      if (cause instanceof AdminApiError) {
        setFormError(cause.message); setFields(cause.fields);
        if ([401, 403].includes(cause.status)) {
          setState(cause.status === 401 ? "unauthenticated" : "forbidden"); setError(cause.message);
          setUsers([]); setEditor(null); setForm(blank);
        }
      } else setFormError("Unable to save changes. Please try again.");
    } finally { setBusy(false); }
  }
  const blocked = state === "forbidden" || state === "unauthenticated";
  const filtered = Boolean(criteria.search || criteria.role || criteria.active);
  // The API returns the full filtered list; sort a copy without changing fetched data.
  const sortedUsers = [...users].sort((a, b) => {
    const value = (user: ManagedUser) => sort.field === "Name" ? user.name : sort.field === "Email" ? user.email : sort.field === "Role" ? user.role : user.isActive ? "Active" : "Inactive";
    const comparison = value(a).localeCompare(value(b), "en", { sensitivity: "base" });
    return comparison * (sort.direction === "ascending" ? 1 : -1) || a.id - b.id;
  });
  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  useEffect(() => { if (state === "ready") setPage(currentPage); }, [currentPage, state]);
  const visibleUsers = sortedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter(number =>
    totalPages <= 7 || number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1 ||
    (currentPage <= 2 && number <= 3) || (currentPage >= totalPages - 1 && number >= totalPages - 2));
  const fieldError = (key: string) => fields[key] ? <div id={`admin-${key}-error`} className="invalid-feedback d-block">{fields[key]}</div> : null;
  return <section className="admin-management" aria-labelledby="user-management-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h2 id="user-management-title" className="h4 mb-0">User Management</h2>
    </div>
    {message && <p className="alert alert-success" role="status">{message}</p>}
    {blocked ? <p className="alert alert-danger" role="alert">{error}</p> : <div className="admin-workspace">
      <div className="admin-users-panel card">
      <div className="admin-panel-toolbar">
        <h3 className="h5 mb-0" id="admin-users-title">Users</h3>
        <button className="btn btn-success btn-sm" aria-label="Create User" disabled={busy || state !== "ready"} onClick={() => open({ kind: "create" })}><span aria-hidden="true">+ </span>Create User</button>
      </div>
      <form className="admin-search-form" onSubmit={event => { event.preventDefault(); setCriteria(previous => ({ ...previous, search: search.trim() })); }}>
        <div className="row g-3">
          <div className="col-12"><label htmlFor="admin-search" className="form-label">Search users</label>
            <input id="admin-search" className="form-control" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={200} placeholder="Name or email" /></div>
          <div className="col-sm-6"><label htmlFor="admin-role-filter" className="form-label">Filter by role</label>
            <select id="admin-role-filter" className="form-select" value={criteria.role} onChange={event => setCriteria(previous => ({ ...previous, role: event.target.value }))}>
              <option value="">All roles</option>{roles.map(role => <option key={role}>{role}</option>)}
            </select></div>
          <div className="col-sm-6"><label htmlFor="admin-status-filter" className="form-label">Filter by status</label>
            <select id="admin-status-filter" className="form-select" value={criteria.active} onChange={event => setCriteria(previous => ({ ...previous, active: event.target.value }))}>
              <option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option>
            </select></div>
        </div>
        <div className="d-flex flex-wrap gap-2 mt-3"><button className="btn btn-success">Search</button>
          <button type="button" className="btn btn-outline-success" onClick={() => { setSearch(""); setCriteria({ search: "", role: "", active: "" }); }}>Clear filters</button></div>
      </form>
      {state === "loading" && <p className="admin-list-feedback" role="status">Loading users...</p>}
      {state === "error" && <div className="alert alert-danger admin-list-feedback" role="alert">{error} <button className="btn btn-outline-danger" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
      {state === "ready" && !users.length && <p role="status" className="admin-list-feedback">{filtered ? "No users match your search or filters." : "No users found."}</p>}
      {state === "ready" && users.length > 0 && <table className="admin-users-table" aria-labelledby="admin-users-title">
        <thead><tr>{(["Name", "Email", "Role", "Status", "Action"] as const).map(label => <th scope="col" key={label} aria-sort={sort.field === label ? sort.direction : undefined}>
          {label === "Action" ? label : <button type="button" className="admin-sort-button" aria-label={`Sort by ${label.toLowerCase()} ${sort.field === label && sort.direction === "ascending" ? "descending" : "ascending"}`} onClick={() => setSort(previous => ({ field: label, direction: previous.field === label && previous.direction === "ascending" ? "descending" : "ascending" }))}>
            {label}<svg className={`admin-sort-icon ${sort.field === label ? "is-active" : ""}`} width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              {sort.field !== label ? <><path d="M5 16V4m-3 3 3-3 3 3"/><path d="M13 4v12m-3-3 3 3 3-3"/></> : sort.direction === "ascending" ? <path d="M9 16V4m-5 5 5-5 5 5"/> : <path d="M9 4v12m-5-5 5 5 5-5"/>}
            </svg>
          </button>}
        </th>)}</tr></thead>
        <tbody>{visibleUsers.map(user => <tr key={user.id} aria-label={`User ${user.email}`} className={editor?.user?.id === user.id ? "admin-selected-user" : undefined}>
          <td data-label="Name"><strong>{user.name}</strong></td>
          <td data-label="Email">{user.email}</td>
          <td data-label="Role"><span className="badge bg-success-subtle text-success-emphasis">{user.role.replaceAll("_", " ")}</span></td>
          <td data-label="Status"><span className={`badge ${user.isActive ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle text-secondary-emphasis"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
          <td data-label="Action"><div className="admin-row-actions">
            <button className="btn btn-outline-success btn-sm" disabled={busy} aria-label={`Edit ${user.email}`} onClick={() => open({ kind: "edit", user })}>Edit</button>
            <button className="btn btn-outline-success btn-sm" disabled={busy} aria-label={`Set initial password for ${user.email}`} onClick={() => open({ kind: "password", user })}>Set Password</button>
          </div></td>
        </tr>)}</tbody>
      </table>}
      {state === "ready" && totalPages > 0 && <nav className="admin-pagination" aria-label="User pages">
        <p className="small text-muted mb-2">Page {currentPage} of {totalPages} · {users.length} users</p>
        <div className="admin-page-buttons">
          <button type="button" className="btn btn-outline-success btn-sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Prev</button>
          {pageNumbers.map((number, index) => <span className="admin-page-item" key={number}>
            {index > 0 && number - pageNumbers[index - 1] > 1 && <span className="admin-page-ellipsis" aria-hidden="true">…</span>}
            <button type="button" aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} className={`btn btn-sm ${number === currentPage ? "btn-success" : "btn-outline-success"}`} onClick={() => setPage(number)}>{number}</button>
          </span>)}
          <button type="button" className="btn btn-outline-success btn-sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </nav>}
      </div>
      <aside className="admin-editor-panel" aria-label="Account editor">
      {!editor && <div className="card admin-editor-placeholder"><h3 className="h5">Manage an account</h3><p className="text-muted mb-0">Select a user to edit their details, or choose Create User to add an account.</p></div>}
      {editor && <form noValidate className="card" onSubmit={save} aria-label={editor.kind === "create" ? "Create user form" : editor.kind === "edit" ? "Edit user form" : "Initial password form"}>
        <h3 ref={panelHeading} tabIndex={-1} className="card-header bg-success text-white h5">{editor.kind === "create" ? "Create New User" : editor.kind === "edit" ? "Edit User" : "Set Initial Password"}</h3>
        <div className="card-body">
          {editor.user && <p className="text-break">Account: {editor.user.name} ({editor.user.email})</p>}
          {editor.user?.mustChangePassword && <p className="small text-muted">Password change required at next login.</p>}
          {formError && <p className="alert alert-danger" role="alert">{formError}</p>}
          <fieldset disabled={busy}>
            <div className="row g-3">
              {editor.kind !== "password" && <>
                <div className="col-12"><label className="form-label" htmlFor="admin-name">Name</label>
                  <input id="admin-name" required className="form-control" value={form.name} maxLength={120} onChange={event => change("name", event.target.value)} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? "admin-name-error" : undefined} />{fieldError("name")}</div>
                <div className="col-12"><label className="form-label" htmlFor="admin-email">Email Address</label>
                  <input id="admin-email" required type="email" className="form-control" value={form.email} maxLength={254} onChange={event => change("email", event.target.value)} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? "admin-email-error" : undefined} />{fieldError("email")}</div>
                <div className="col-12"><label className="form-label" htmlFor="admin-role">Role</label>
                  <select id="admin-role" required className="form-select" value={form.role} onChange={event => change("role", event.target.value)} aria-invalid={Boolean(fields.role)} aria-describedby={fields.role ? "admin-role-error" : undefined}>{roles.map(role => <option key={role}>{role}</option>)}</select>{fieldError("role")}</div>
                <div className="col-12"><label className="form-label" htmlFor="admin-active">Account status</label>
                  <select id="admin-active" className="form-select" value={String(form.isActive)} onChange={event => change("isActive", event.target.value === "true")} aria-invalid={Boolean(fields.isActive)} aria-describedby={fields.isActive ? "admin-isActive-error" : undefined}>
                    <option value="true">Active</option><option value="false" disabled={editor.user?.id === currentUserId}>Inactive</option>
                  </select>{fieldError("isActive")}</div>
              </>}
              {editor.kind !== "edit" && <div className="col-12"><label className="form-label" htmlFor="admin-password">Initial password</label>
                <input id="admin-password" required type="password" autoComplete="new-password" className="form-control" value={form.password} onChange={event => change("password", event.target.value)} aria-invalid={Boolean(fields.password)} aria-describedby="admin-password-help admin-password-error" />
                <div id="admin-password-help" className="form-text">At least 8 characters, at most 72 UTF-8 bytes. The user must change this password on next login.</div>{fieldError("password")}</div>}
            </div>
            <div className="d-flex flex-wrap gap-2 mt-3"><button className="btn btn-success">{busy ? "Saving..." : editor.kind === "password" ? "Set Initial Password" : editor.kind === "edit" ? "Save Changes" : "Save User"}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditor(null); setForm(blank); }}>Cancel</button></div>
          </fieldset>
        </div>
      </form>}
      </aside>
    </div>}
  </section>;
}
