import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import App from "../../src/App";

import {
  getCategories,
  getMyTickets,
  getRelatedSystems,
  getRequesters,
  getTicketAttachments,
  getTicketDetail,
} from "../../src/api.js";

vi.mock("../../src/api.js", () => ({
  getRequesters: vi.fn(),
  getCategories: vi.fn(),
  getRelatedSystems: vi.fn(),
  createTicket: vi.fn(),
  getMyTickets: vi.fn(),
  getTicketDetail: vi.fn(),
  getTicketAttachments: vi.fn(),
  uploadTicketAttachment: vi.fn(),
  downloadAttachmentFile: vi.fn(),
  removeAttachment: vi.fn(),
}));

const requester = {
  id: 1,
  name: "Alice Johnson",
  email: "alice@example.com",
};

const ticket = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  summary: "Laptop cannot connect",
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",

  category: {
    id: 1,
    name: "Hardware",
  },

  relatedSystem: {
    id: 1,
    name: "Corporate Laptop",
  },
};

const ticketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop cannot connect",
  description:
    "Laptop cannot connect to the company network.",
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",

  requester: {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
  },

  category: {
    id: 1,
    name: "Hardware",
  },

  relatedSystem: {
    id: 1,
    name: "Corporate Laptop",
  },
};

async function selectRequesterAndOpenMyTickets() {
  render(<App />);

  const selector =
    await screen.findByLabelText(
      "Development Requester"
    );

  fireEvent.change(selector, {
    target: {
      value: "1",
    },
  });

  fireEvent.click(
    screen.getByRole("button", {
      name: "Continue",
    })
  );

  await screen.findByRole(
    "heading",
    {
      name: "Create Ticket",
    }
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "My Tickets",
    })
  );

  await screen.findByRole(
    "heading",
    {
      name: "My Tickets",
    }
  );
}

describe(
  "Requester Ticket Detail",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      sessionStorage.clear();

      vi.mocked(
        getRequesters
      ).mockResolvedValue([
        requester,
      ]);

      vi.mocked(
        getCategories
      ).mockResolvedValue([
        {
          id: 1,
          name: "Hardware",
        },
      ]);

      vi.mocked(
        getRelatedSystems
      ).mockResolvedValue([
        {
          id: 1,
          name: "Corporate Laptop",
        },
      ]);

      vi.mocked(
        getMyTickets
      ).mockResolvedValue({
        data: [ticket],

        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });

      vi.mocked(
        getTicketDetail
      ).mockResolvedValue(
        ticketDetail
      );

      vi.mocked(
        getTicketAttachments
      ).mockResolvedValue([]);
    });

    it(
      "opens an owned Ticket Detail from My Tickets",
      async () => {
        await selectRequesterAndOpenMyTickets();

        const ticketButton =
          await screen.findByRole(
            "button",
            {
              name: "TKT-2026-000101",
            }
          );

        fireEvent.click(
          ticketButton
        );

        expect(
          await screen.findByRole(
            "heading",
            {
              name: "Ticket Detail",
            }
          )
        ).toBeInTheDocument();

        expect(
          getTicketDetail
        ).toHaveBeenCalledWith(
          101,
          1
        );

        expect(
          screen.getByDisplayValue(
            "TKT-2026-000101"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "Alice Johnson"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "Hardware"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "Corporate Laptop"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "Laptop cannot connect"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "Laptop cannot connect to the company network."
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "HIGH"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByDisplayValue(
            "NEW"
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "returns from Ticket Detail to My Tickets",
      async () => {
        await selectRequesterAndOpenMyTickets();

        fireEvent.click(
          await screen.findByRole(
            "button",
            {
              name: "TKT-2026-000101",
            }
          )
        );

        await screen.findByRole(
          "heading",
          {
            name: "Ticket Detail",
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name: "Back to My Tickets",
            }
          )
        );

        expect(
          await screen.findByRole(
            "heading",
            {
              name: "My Tickets",
            }
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "shows an error when an unauthorized Ticket cannot be loaded",
      async () => {
        vi.mocked(
          getTicketDetail
        ).mockRejectedValue(
          new Error(
            "Ticket not found or access denied"
          )
        );

        await selectRequesterAndOpenMyTickets();

        fireEvent.click(
          await screen.findByRole(
            "button",
            {
              name: "TKT-2026-000101",
            }
          )
        );

        expect(
          await screen.findByText(
            /may not belong to the selected Requester/i
          )
        ).toBeInTheDocument();
      }
    );
  }
);