import { dashboardPriorities, getStaffDashboard } from "./dashboard.api";
import { DashboardFeedback, Metric, RecentTickets, SnapshotTime, useDashboard, type DashboardProps } from "./DashboardShared";
import { bangkokActionTime } from "./actions-taken.rules";
export function StaffDashboard(props: DashboardProps & { administrator?: boolean }) {
  const state = useDashboard(getStaffDashboard, props.onAccessFailure), data = state.data;
  return <section className="dashboard" aria-labelledby="staff-dashboard-title" aria-busy={state.loading}>
    <h2 id="staff-dashboard-title">{props.administrator ? "Administrator Dashboard" : "IT Staff Dashboard"}</h2><DashboardFeedback {...state} />
    {data && <><SnapshotTime asOf={data.asOf} /><div className="dashboard-grid">
      <Metric label="Unassigned Active Tickets" value={data.metrics.unassignedActiveTickets} onView={() => props.onNavigate(data.drillDown.unassignedActiveTickets)} />
      <Metric label="My Active Tickets" value={data.metrics.myActiveTickets} onView={() => props.onNavigate(data.drillDown.myActiveTickets)} />
      <Metric label="My Active Actions" value={data.metrics.myActiveActions} />
    </div><section className="mt-3" aria-label="Active Tickets by IT Priority"><h3 className="h5">Active Tickets by IT Priority</h3><div className="dashboard-grid">
      {dashboardPriorities.map(priority => <Metric key={priority} label={priority} value={data.metrics.activeTicketsByItPriority[priority]} onView={() => props.onNavigate(data.drillDown.activeTicketsByItPriority[priority])} viewLabel={"View " + priority + " active Tickets"} />)}
    </div></section>
      <RecentTickets title="Recently Updated Tickets" items={data.recentTickets} onOpen={props.onOpenTicket} onView={() => props.onNavigate(data.drillDown.recentTickets)} />
      <section className="card mt-3" aria-label="My assigned active actions"><div className="card-body"><h3 className="h5">My Active Actions</h3>
        <p>Assigned to you and Planned or In Progress. Showing up to 5; the count includes every match.</p>
        {!data.myActiveActions.length && <p role="status">No matching assigned active actions.</p>}
        <ul className="dashboard-list">{data.myActiveActions.map(action => <li key={action.id}><button className="btn btn-link text-start p-0" onClick={() => props.onOpenTicket(action.ticketId, action.id)}>Open action #{action.id} on {action.ticketNumber}</button><p>{action.description}</p><p>{action.status.replaceAll("_", " ")} | Updated {bangkokActionTime(action.updatedAt)}</p></li>)}</ul>
      </div></section>
    </>}
  </section>;
}
