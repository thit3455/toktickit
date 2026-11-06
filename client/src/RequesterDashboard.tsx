import { getRequesterDashboard } from "./dashboard.api";
import { DashboardFeedback, Metric, RecentTickets, SnapshotTime, useDashboard, type DashboardProps } from "./DashboardShared";
import { bangkokActionTime } from "./actions-taken.rules";
export function RequesterDashboard(props: DashboardProps) {
  const state = useDashboard(getRequesterDashboard, props.onAccessFailure), data = state.data;
  return <section className="dashboard" aria-labelledby="requester-dashboard-title" aria-busy={state.loading}>
    <h2 id="requester-dashboard-title">Requester Dashboard</h2><DashboardFeedback {...state} />
    {data && <><SnapshotTime asOf={data.asOf} /><div className="dashboard-grid">
      <Metric label="My Open Tickets" value={data.metrics.myOpenTickets} onView={() => props.onNavigate(data.drillDown.myOpenTickets)} />
      <Metric label="Needs My Attention" value={data.metrics.needsMyAttention} onView={() => props.onNavigate(data.drillDown.needsMyAttention)} viewLabel="View Tickets waiting for you" />
      <Metric label="Recently Resolved" value={data.metrics.recentlyResolved} onView={() => props.onNavigate(data.drillDown.recentlyResolved)} />
    </div><p>Recently Resolved: {bangkokActionTime(data.window.start)} through {bangkokActionTime(data.window.end)}, inclusive. Seven Bangkok calendar days. Legacy Tickets without resolution history are excluded from this metric.</p>
      <RecentTickets title="Recently Updated" items={data.recentTickets} onOpen={props.onOpenTicket} onView={() => props.onNavigate(data.drillDown.recentTickets)} />
      <RecentTickets title="Tickets Needing Your Attention" items={data.attentionTickets} onOpen={props.onOpenTicket} onView={() => props.onNavigate(data.drillDown.needsMyAttention)} />
      {!data.recentTickets.length && <p>Your dashboard has no matching owned Tickets. My Tickets and Create Ticket remain available.</p>}
    </>}
  </section>;
}
