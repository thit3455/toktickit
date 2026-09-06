import {
  afterEach,
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

import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("My Tickets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  function mockReferenceData() {
    vi.spyOn(
      api,
      "getCategories"
    ).mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
      {
        id: 2,
        name: "Software",
      },
    ]);

    vi.spyOn(
      api,
      "getRelatedSystems"
    ).mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);
  }

  async function selectRequester() {
    const requesterSelect =
      await screen.findByRole(
        "combobox",
        {
          name: /Development Requester/i,
        }
      );

    fireEvent.change(
      requesterSelect,
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /Continue/i,
        }
      )
    );

    await screen.findByRole(
      "button",
      {
        name: /My Tickets/i,
      }
    );
  }

  it("shows only the selected Requester's Tickets", async () => {
    vi.spyOn(
      api,
      "getRequesters"
    ).mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email:
          "alice.johnson@toktickit.test",
      },
    ]);

    mockReferenceData();

    const getMyTicketsSpy =
      vi.spyOn(
        api,
        "getMyTickets"
      ).mockResolvedValue({
        data: [
          {
            id: 4,
            ticketNumber:
              "TKT-2026-000004",
            requesterId: 1,
            summary:
              "Laptop battery drains quickly",
            requestedPriority:
              "MEDIUM",
            currentStatus: "NEW",
            createdAt:
              "2026-09-04T10:00:00.000Z",
            updatedAt:
              "2026-09-04T10:00:00.000Z",
            category: {
              id: 1,
              name: "Hardware",
            },
            relatedSystem: {
              id: 1,
              name:
                "Corporate Laptop",
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });

    render(<App />);

    await selectRequester();

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /My Tickets/i,
        }
      )
    );

    expect(
      await screen.findByRole(
        "heading",
        {
          name: /My Tickets/i,
        }
      )
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        "TKT-2026-000004"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Laptop battery drains quickly"
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        getMyTicketsSpy
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 1,
          page: 1,
          pageSize: 10,
        })
      );
    });
  });

  it("shows the empty state when the Requester has no Tickets", async () => {
    vi.spyOn(
      api,
      "getRequesters"
    ).mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email:
          "alice.johnson@toktickit.test",
      },
    ]);

    mockReferenceData();

    vi.spyOn(
      api,
      "getMyTickets"
    ).mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
    });

    render(<App />);

    await selectRequester();

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /My Tickets/i,
        }
      )
    );

    expect(
      await screen.findByText(
        /No Tickets Yet/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        "button",
        {
          name:
            /Create Your First Ticket/i,
        }
      )
    ).toBeInTheDocument();
  });

  it("sends search and filter values to the My Tickets API", async () => {
    vi.spyOn(
      api,
      "getRequesters"
    ).mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email:
          "alice.johnson@toktickit.test",
      },
    ]);

    mockReferenceData();

    const getMyTicketsSpy =
      vi.spyOn(
        api,
        "getMyTickets"
      ).mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        },
      });

    render(<App />);

    await selectRequester();

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /My Tickets/i,
        }
      )
    );

    await screen.findByText(
      /No Tickets Yet/i
    );

    fireEvent.change(
      screen.getByLabelText(
        /Search Tickets/i
      ),
      {
        target: {
          value: "battery",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /^Category$/i
      ),
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /^Priority$/i
      ),
      {
        target: {
          value: "MEDIUM",
        },
      }
    );

    await waitFor(() => {
      expect(
        getMyTicketsSpy
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          requesterId: 1,
          search: "battery",
          categoryId: 1,
          requestedPriority:
            "MEDIUM",
        })
      );
    });
  });

  it("shows a safe failure state when My Tickets cannot load", async () => {
    vi.spyOn(
      api,
      "getRequesters"
    ).mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email:
          "alice.johnson@toktickit.test",
      },
    ]);

    mockReferenceData();

    vi.spyOn(
      api,
      "getMyTickets"
    ).mockRejectedValue(
      new Error(
        "Server unavailable"
      )
    );

    render(<App />);

    await selectRequester();

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /My Tickets/i,
        }
      )
    );

    expect(
      await screen.findByText(
        /Unable to load My Tickets/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        "button",
        {
          name: /Retry/i,
        }
      )
    ).toBeInTheDocument();
  });
});