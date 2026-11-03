import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ActionsTaken } from "../../src/ActionsTaken";
import * as api from "../../src/api";
import { action, list } from "./fixtures";
vi.mock("../../src/api");
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("I5 action links reuse authorized chronological pagination", () => {
  it("loads a target beyond page one and moves keyboard focus to it", async () => {
    vi.mocked(api.getActionAssignees).mockResolvedValue([]);
    vi.mocked(api.getActionsTaken).mockImplementation(async (_id, page = 1) => ({ ...list(page === 1 ? [{ ...action, id: 40 }] : [action]), pagination: { page, limit: 20, total: 21, totalPages: 2 } }));
    render(<ActionsTaken ticketId={101} ticketStatus="OPEN" role="IT_STAFF" userName="Fixture Staff" targetActionId={41} onRefreshTicket={async () => {}} onAccessFailure={vi.fn()} />);
    await waitFor(() => expect(document.getElementById("action-41")).toHaveFocus());
    expect(api.getActionsTaken).toHaveBeenCalledWith(101, 2, expect.any(AbortSignal));
    expect(api.patchActionTaken).not.toHaveBeenCalled();
  });
});
