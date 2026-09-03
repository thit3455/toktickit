import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("Create Ticket", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  // ---------------------------------------------------------
  // Test 1 — Required Create Ticket fields
  // ---------------------------------------------------------

  it("shows the required Create Ticket fields after selecting a Requester", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    vi.spyOn(api, "getCategories").mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
    ]);

    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);

    render(<App />);

    const requesterSelect =
      await screen.findByRole("combobox", {
        name: /Development Requester/i,
      });

    fireEvent.change(requesterSelect, {
      target: {
        value: "1",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    expect(
      screen.getByRole("heading", {
        name: /Create Ticket/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Category/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Related System/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Requested Priority/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Ticket Summary/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Description/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Attachments/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Submit Ticket/i,
      })
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------
  // Test 2 — Required-field validation
  // ---------------------------------------------------------

  it("shows field-level validation when required fields are missing", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    vi.spyOn(api, "getCategories").mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
    ]);

    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);

    const createTicketSpy =
      vi.spyOn(api, "createTicket");

    render(<App />);

    const requesterSelect =
      await screen.findByRole("combobox", {
        name: /Development Requester/i,
      });

    fireEvent.change(requesterSelect, {
      target: {
        value: "1",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    const submitButton =
      await screen.findByRole("button", {
        name: /Submit Ticket/i,
      });

    fireEvent.click(submitButton);

    expect(
      screen.getByText("Category is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Related System is required."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Requested Priority is required."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Ticket Summary must be between 5 and 120 characters/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Description must be between 10 and 2000 characters/i
      )
    ).toBeInTheDocument();

    expect(
      createTicketSpy
    ).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // Test 3 — Successful Ticket creation
  // ---------------------------------------------------------

  it("creates a Ticket successfully and displays the official Ticket Number", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    vi.spyOn(api, "getCategories").mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
    ]);

    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);

    const createTicketSpy = vi
      .spyOn(api, "createTicket")
      .mockResolvedValue({
        id: 25,
        ticketNumber: "TKT-2026-000025",
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Laptop battery problem",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
        createdAt:
          "2026-09-03T08:00:00.000Z",
      });

    render(<App />);

    const requesterSelect =
      await screen.findByRole("combobox", {
        name: /Development Requester/i,
      });

    fireEvent.change(requesterSelect, {
      target: {
        value: "1",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    fireEvent.change(
      await screen.findByLabelText(/Category/i),
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(/Related System/i),
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /Requested Priority/i
      ),
      {
        target: {
          value: "MEDIUM",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(/Ticket Summary/i),
      {
        target: {
          value:
            "Laptop battery problem",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(/Description/i),
      {
        target: {
          value:
            "The laptop battery becomes empty after approximately one hour.",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Submit Ticket/i,
      })
    );

    expect(
      await screen.findByText(
        /Ticket created successfully/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "TKT-2026-000025"
      )
    ).toBeInTheDocument();

    expect(
      createTicketSpy
    ).toHaveBeenCalledWith({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary:
        "Laptop battery problem",
      requestedPriority: "MEDIUM",
      description:
        "The laptop battery becomes empty after approximately one hour.",
    });
  });

  // ---------------------------------------------------------
  // Test 4 — Submitting / busy state
  // ---------------------------------------------------------

  it("disables the Submit button while the Ticket is being created", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    vi.spyOn(api, "getCategories").mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
    ]);

    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);

    let resolveCreateTicket!: (
      ticket: api.CreatedTicket
    ) => void;

    vi.spyOn(api, "createTicket")
      .mockImplementation(
        () =>
          new Promise<api.CreatedTicket>(
            (resolve) => {
              resolveCreateTicket = resolve;
            }
          )
      );

    render(<App />);

    const requesterSelect =
      await screen.findByRole("combobox", {
        name: /Development Requester/i,
      });

    fireEvent.change(requesterSelect, {
      target: {
        value: "1",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    fireEvent.change(
      await screen.findByLabelText(/Category/i),
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(/Related System/i),
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /Requested Priority/i
      ),
      {
        target: {
          value: "MEDIUM",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(/Ticket Summary/i),
      {
        target: {
          value:
            "Laptop battery problem",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(/Description/i),
      {
        target: {
          value:
            "The laptop battery becomes empty after approximately one hour.",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Submit Ticket/i,
      })
    );

    const submittingButton =
      await screen.findByRole("button", {
        name: /Submitting/i,
      });

    expect(
      submittingButton
    ).toBeDisabled();

    await act(async () => {
      resolveCreateTicket({
        id: 25,
        ticketNumber:
          "TKT-2026-000025",
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        summary:
          "Laptop battery problem",
        requestedPriority:
          "MEDIUM",
        currentStatus: "NEW",
        createdAt:
          "2026-09-03T08:00:00.000Z",
      });
    });

    expect(
      await screen.findByText(
        /Ticket created successfully/i
      )
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------
  // Test 5 — API failure preserves values
  // ---------------------------------------------------------

  it("shows an API error and preserves entered values when Ticket creation fails", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    vi.spyOn(api, "getCategories").mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
    ]);

    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);

    vi.spyOn(api, "createTicket")
      .mockRejectedValue(
        new Error("Server error")
      );

    render(<App />);

    const requesterSelect =
      await screen.findByRole("combobox", {
        name: /Development Requester/i,
      });

    fireEvent.change(requesterSelect, {
      target: {
        value: "1",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    const categorySelect =
      await screen.findByLabelText(/Category/i);

    fireEvent.change(categorySelect, {
      target: {
        value: "1",
      },
    });

    const relatedSystemSelect =
      screen.getByLabelText(
        /Related System/i
      );

    fireEvent.change(
      relatedSystemSelect,
      {
        target: {
          value: "1",
        },
      }
    );

    const prioritySelect =
      screen.getByLabelText(
        /Requested Priority/i
      );

    fireEvent.change(prioritySelect, {
      target: {
        value: "HIGH",
      },
    });

    const summaryInput =
      screen.getByLabelText(
        /Ticket Summary/i
      );

    fireEvent.change(summaryInput, {
      target: {
        value:
          "Campus laptop cannot connect",
      },
    });

    const descriptionInput =
      screen.getByLabelText(
        /Description/i
      );

    fireEvent.change(
      descriptionInput,
      {
        target: {
          value:
            "The campus laptop cannot connect to the required network.",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Submit Ticket/i,
      })
    );

    expect(
      await screen.findByText(
        /Unable to create Ticket. Your entered values have been preserved./i
      )
    ).toBeInTheDocument();

    expect(
      categorySelect
    ).toHaveValue("1");

    expect(
      relatedSystemSelect
    ).toHaveValue("1");

    expect(
      prioritySelect
    ).toHaveValue("HIGH");

    expect(
      summaryInput
    ).toHaveValue(
      "Campus laptop cannot connect"
    );

    expect(
      descriptionInput
    ).toHaveValue(
      "The campus laptop cannot connect to the required network."
    );
  });

  // ---------------------------------------------------------
  // Test 6 — Invalid attachment type
  // ---------------------------------------------------------

  it("rejects an unsupported attachment type before Ticket submission", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    vi.spyOn(api, "getCategories").mockResolvedValue([
      {
        id: 1,
        name: "Hardware",
      },
    ]);

    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      {
        id: 1,
        name: "Corporate Laptop",
      },
    ]);

    const createTicketSpy =
      vi.spyOn(api, "createTicket");

    render(<App />);

    const requesterSelect =
      await screen.findByRole("combobox", {
        name: /Development Requester/i,
      });

    fireEvent.change(requesterSelect, {
      target: {
        value: "1",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    const attachmentInput =
      await screen.findByLabelText(
        /Attachments/i
      );

    const invalidFile = new File(
      ["invalid content"],
      "malware.exe",
      {
        type:
          "application/x-msdownload",
      }
    );

    fireEvent.change(
      attachmentInput,
      {
        target: {
          files: [invalidFile],
        },
      }
    );

    expect(
      screen.getByText(
        /Only JPG\/JPEG, PNG, WEBP, and PDF files are allowed/i
      )
    ).toBeInTheDocument();

    expect(
      createTicketSpy
    ).not.toHaveBeenCalled();
  });
});