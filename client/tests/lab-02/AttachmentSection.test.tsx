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
  downloadAttachmentFile,
  getCategories,
  getMyTickets,
  getRelatedSystems,
  getRequesters,
  getTicketAttachments,
  getTicketDetail,
  removeAttachment,
  uploadTicketAttachment,
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
  ...ticket,

  categoryId: 1,
  relatedSystemId: 1,

  description:
    "Laptop cannot connect to the company network.",

  requester,

  category: {
    id: 1,
    name: "Hardware",
  },

  relatedSystem: {
    id: 1,
    name: "Corporate Laptop",
  },
};

const activeAttachment = {
  id: 501,
  ticketId: 101,
  originalName: "evidence.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  createdAt: "2026-09-01T10:00:00.000Z",
  isRemoved: false,
  removedAt: null,
  removalReason: null,
};

async function openTicketDetail() {
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

  await screen.findByRole("heading", {
    name: "Create Ticket",
  });

  fireEvent.click(
    screen.getByRole("button", {
      name: "My Tickets",
    })
  );

  await screen.findByRole("heading", {
    name: "My Tickets",
  });

  fireEvent.click(
    await screen.findByRole("button", {
      name: "TKT-2026-000101",
    })
  );

  await screen.findByRole("heading", {
    name: "Ticket Detail",
  });
}

describe("Attachment Section", () => {
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
    ).mockResolvedValue([
      activeAttachment,
    ]);

    vi.mocked(
      uploadTicketAttachment
    ).mockResolvedValue(
      activeAttachment
    );

    vi.mocked(
      downloadAttachmentFile
    ).mockResolvedValue();

    vi.mocked(
      removeAttachment
    ).mockResolvedValue({
      ...activeAttachment,
      isRemoved: true,
      removedAt:
        "2026-09-01T11:00:00.000Z",
      removalReason:
        "Uploaded wrong evidence file",
    });

    vi.spyOn(
      window,
      "confirm"
    ).mockReturnValue(true);
  });

  it(
    "shows and downloads an active attachment",
    async () => {
      await openTicketDetail();

      expect(
        await screen.findByText(
          "evidence.pdf"
        )
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", {
          name: /download/i,
        })
      );

      await waitFor(() => {
        expect(
          downloadAttachmentFile
        ).toHaveBeenCalledWith(
          activeAttachment,
          1
        );
      });
    }
  );

  it(
    "uploads a valid attachment",
    async () => {
      await openTicketDetail();

      const file = new File(
        ["test content"],
        "new-evidence.pdf",
        {
          type: "application/pdf",
        }
      );

      const input =
        screen.getByLabelText(
          /add attachment/i
        );

      fireEvent.change(input, {
        target: {
          files: [file],
        },
      });

      fireEvent.click(
        screen.getByRole("button", {
          name: "Upload Attachment",
        })
      );

      await waitFor(() => {
        expect(
          uploadTicketAttachment
        ).toHaveBeenCalledWith(
          101,
          1,
          file
        );
      });
    }
  );

  it(
    "soft-removes an attachment with a required reason",
    async () => {
      await openTicketDetail();

      const reasonInput =
        await screen.findByLabelText(
          /removal reason/i
        );

      fireEvent.change(reasonInput, {
        target: {
          value:
            "Uploaded wrong evidence file",
        },
      });

      fireEvent.click(
        screen.getByRole("button", {
          name: /^Remove$/i,
        })
      );

      await waitFor(() => {
        expect(
          removeAttachment
        ).toHaveBeenCalledWith(
          501,
          1,
          "Uploaded wrong evidence file"
        );
      });

      expect(
        await screen.findByText(
          /Attachment removed successfully\. Metadata has been retained\./i
        )
      ).toBeInTheDocument();
    }
  );

  it(
    "rejects an invalid attachment type",
    async () => {
      await openTicketDetail();

      const file = new File(
        ["bad file"],
        "malware.exe",
        {
          type:
            "application/octet-stream",
        }
      );

      const input =
        screen.getByLabelText(
          /add attachment/i
        );

      fireEvent.change(input, {
        target: {
          files: [file],
        },
      });

      expect(
        await screen.findByText(
          /Only JPG\/JPEG, PNG, WEBP, and PDF files are allowed/i
        )
      ).toBeInTheDocument();

      expect(
        uploadTicketAttachment
      ).not.toHaveBeenCalled();
    }
  );
});