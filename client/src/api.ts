const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function staffActionResult(response: Response, fallback: string) {
  if (response.status === 401) throw new Error("Your session has expired. Refresh the page and log in again.");
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error?.message ?? fallback);
  if (!result?.data) throw new Error("The server returned an unexpected response. Please try again.");
  return result;
}

// ---------------------------------------------------------
// Category
// ---------------------------------------------------------

export interface Category {
  id: number;
  name: string;
}

// ---------------------------------------------------------
// Development Requester
// ---------------------------------------------------------

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

interface RequesterResponse {
  data: DevelopmentRequester[];
}

export async function getRequesters(): Promise<
  DevelopmentRequester[]
> {
  const response = await fetch(
    `${API_URL}/api/requesters`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load Development Requesters"
    );
  }

  const result: RequesterResponse =
    await response.json();

  return result.data;
}

// ---------------------------------------------------------
// Categories
// ---------------------------------------------------------

export async function getCategories(): Promise<
  Category[]
> {
  const response = await fetch(
    `${API_URL}/api/categories`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load Categories"
    );
  }

  return response.json();
}

// ---------------------------------------------------------
// Related Systems
// ---------------------------------------------------------

export interface RelatedSystem {
  id: number;
  name: string;
}

interface RelatedSystemResponse {
  data: RelatedSystem[];
}

export async function getRelatedSystems(): Promise<
  RelatedSystem[]
> {
  const response = await fetch(
    `${API_URL}/api/related-systems`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load Related Systems"
    );
  }

  const result: RelatedSystemResponse =
    await response.json();

  return result.data;
}

// ---------------------------------------------------------
// Ticket Types
// ---------------------------------------------------------

export type RequestedPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type TicketStatus = "NEW";

// ---------------------------------------------------------
// Ticket Creation
// ---------------------------------------------------------

export interface CreateTicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export interface CreatedTicket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description?: string;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt?: string;
}

interface CreateTicketResponse {
  data: CreatedTicket;
}

export async function createTicket(
  input: CreateTicketInput
): Promise<CreatedTicket> {
  const response = await fetch(
    `${API_URL}/api/tickets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to create Ticket"
    );
  }

  const result: CreateTicketResponse =
    await response.json();

  return result.data;
}

// ---------------------------------------------------------
// My Tickets
// ---------------------------------------------------------

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  requesterId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;

  category: {
    id: number;
    name: string;
  };

  relatedSystem: {
    id: number;
    name: string;
  };
}

export interface TicketPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: TicketListItem[];
  pagination: TicketPagination;
}

export interface GetMyTicketsParams {
  requesterId: number;
  page?: number;
  pageSize?: 10 | 20 | 50;
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: TicketStatus;
  sortBy?:
    | "updatedAt"
    | "createdAt"
    | "ticketNumber";
  sortOrder?: "asc" | "desc";
}

export async function getMyTickets(
  params: GetMyTicketsParams
): Promise<TicketListResponse> {
  const query = new URLSearchParams();

  query.set(
    "requesterId",
    String(params.requesterId)
  );

  query.set(
    "page",
    String(params.page ?? 1)
  );

  query.set(
    "pageSize",
    String(params.pageSize ?? 10)
  );

  if (params.search?.trim()) {
    query.set(
      "search",
      params.search.trim()
    );
  }

  if (params.categoryId) {
    query.set(
      "categoryId",
      String(params.categoryId)
    );
  }

  if (params.relatedSystemId) {
    query.set(
      "relatedSystemId",
      String(params.relatedSystemId)
    );
  }

  if (params.requestedPriority) {
    query.set(
      "requestedPriority",
      params.requestedPriority
    );
  }

  if (params.currentStatus) {
    query.set(
      "currentStatus",
      params.currentStatus
    );
  }

  if (params.sortBy) {
    query.set(
      "sortBy",
      params.sortBy
    );
  }

  if (params.sortOrder) {
    query.set(
      "sortOrder",
      params.sortOrder
    );
  }

  const response = await fetch(
    `${API_URL}/api/tickets?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load My Tickets"
    );
  }

  return response.json();
}

// ---------------------------------------------------------
// Ticket Detail
// ---------------------------------------------------------

export interface TicketDetail {
  id: number;
  assignedStaffId?: number | null;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
   currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;

  requester: {
    id: number;
    name: string;
    email?: string;
  };

  category: {
    id: number;
    name: string;
  };

  relatedSystem: {
    id: number;
    name: string;
  };
  assignedStaff?: {
  id: number;
  name: string;
  email: string;
} | null;
}

interface TicketDetailResponse {
  data: TicketDetail;
}

export async function getTicketDetail(
  ticketId: number,
  requesterId: number
): Promise<TicketDetail> {
  const query = new URLSearchParams();

  query.set(
    "requesterId",
    String(requesterId)
  );

  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}?${query.toString()}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Ticket not found or access denied"
      );
    }

    throw new Error(
      "Unable to load Ticket Detail"
    );
  }

  const result: TicketDetailResponse =
    await response.json();

  return result.data;
}

// ---------------------------------------------------------
// Attachment Types
// ---------------------------------------------------------

export interface TicketAttachment {
  id: number;
  ticketId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  isRemoved: boolean;
  removedAt?: string | null;
  removalReason?: string | null;

  storedName?: string;
  storagePath?: string;
}

interface ServerAttachment {
  id: number;
  ticketId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt?: string | null;
  removalReason?: string | null;
}

function mapAttachment(
  attachment: ServerAttachment
): TicketAttachment {
  return {
    id: attachment.id,
    ticketId: attachment.ticketId,
    originalName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.fileSize,
    createdAt: attachment.uploadedAt,
    isRemoved: attachment.isRemoved,
    removedAt: attachment.removedAt ?? null,
    removalReason:
      attachment.removalReason ?? null,
  };
}

interface AttachmentListResponse {
  data: ServerAttachment[];
}

interface AttachmentResponse {
  data: ServerAttachment;
}

// ---------------------------------------------------------
// Retrieve Ticket Attachments
// ---------------------------------------------------------

export async function getTicketAttachments(
  ticketId: number,
  requesterId: number
): Promise<TicketAttachment[]> {
  const query = new URLSearchParams();

  query.set(
    "requesterId",
    String(requesterId)
  );

  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments?${query.toString()}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Ticket not found or access denied"
      );
    }

    throw new Error(
      "Unable to load Attachments"
    );
  }

  const result: AttachmentListResponse =
    await response.json();

  return result.data.map(mapAttachment);
}

// ---------------------------------------------------------
// Upload Attachment
// ---------------------------------------------------------

export async function uploadTicketAttachment(
  ticketId: number,
  requesterId: number,
  file: File
): Promise<TicketAttachment> {
  const query = new URLSearchParams();

  query.set(
    "requesterId",
    String(requesterId)
  );

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments?${query.toString()}`,
    {
      method: "POST",
      body: formData,
      credentials: "include",
    }
  );

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        "Invalid attachment"
      );
    }

    if (response.status === 404) {
      throw new Error(
        "Ticket not found or access denied"
      );
    }

    throw new Error(
      "Unable to upload Attachment"
    );
  }

  const result: AttachmentResponse =
    await response.json();

  return mapAttachment(result.data);
}

// ---------------------------------------------------------
// Download Attachment
// ---------------------------------------------------------

export async function downloadAttachment(
  attachmentId: number,
  requesterId: number
): Promise<Blob> {
  const query = new URLSearchParams();

  query.set(
    "requesterId",
    String(requesterId)
  );

  const response = await fetch(
    `${API_URL}/api/attachments/${attachmentId}/download?${query.toString()}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    if (
      response.status === 404 ||
      response.status === 410
    ) {
      throw new Error(
        "Attachment unavailable"
      );
    }

    throw new Error(
      "Unable to download Attachment"
    );
  }

  return response.blob();
}

// ---------------------------------------------------------
// Download Attachment in Browser
// ---------------------------------------------------------

export async function downloadAttachmentFile(
  attachment: TicketAttachment,
  requesterId: number
): Promise<void> {
  const blob =
    await downloadAttachment(
      attachment.id,
      requesterId
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    attachment.originalName;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------
// Soft Remove Attachment
// ---------------------------------------------------------

export async function removeAttachment(
  attachmentId: number,
  requesterId: number,
  removalReason: string
): Promise<TicketAttachment> {
  const cleanReason =
    removalReason.trim();

  if (!cleanReason) {
    throw new Error(
      "Removal reason is required"
    );
  }

  const query =
    new URLSearchParams();

  query.set(
    "requesterId",
    String(requesterId)
  );

  const response = await fetch(
    `${API_URL}/api/attachments/${attachmentId}?${query.toString()}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        removalReason:
          cleanReason,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        "A removal reason is required"
      );
    }

    if (response.status === 404) {
      throw new Error(
        "Attachment not found or access denied"
      );
    }

    throw new Error(
      "Unable to remove Attachment"
    );
  }

  const result: AttachmentResponse =
    await response.json();

  return mapAttachment(result.data);
}
// ---------------------------------------------------------
// IT Staff Ticket Queue
// ---------------------------------------------------------

export interface StaffTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  createdAt: string;
  updatedAt: string;

  requester: {
    id: number;
    name: string;
    email: string;
  };

  assignedStaff?: {
    id: number;
    name: string;
    email: string;
  } | null;

  category: {
    id: number;
    name: string;
  };

  relatedSystem: {
    id: number;
    name: string;
  };
}


export interface StaffTicketPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export interface StaffTicketQueueResponse {
  data: StaffTicket[];

  pagination: StaffTicketPagination;
}


export interface GetStaffTicketsParams {
  search?: string;

  status?: string;

  priority?: RequestedPriority;
  itPriority?: StaffTicket["itPriority"];

  assigned?: boolean;

  page?: number;

  limit?: number;

  sort?: string;

  order?: "asc" | "desc";
}

export class StaffQueueError extends Error {
  constructor(public status: number) {
    super(status === 403 ? "You do not have permission to view the IT Staff queue." : status === 401 ? "Your session has expired. Please log in again." : "Unable to load the ticket queue. Please try again.");
  }
}


export async function getStaffTickets(
  params: GetStaffTicketsParams = {},
  signal?: AbortSignal
): Promise<StaffTicketQueueResponse> {

  const query =
    new URLSearchParams();


  if (params.search) {
    query.set(
      "search",
      params.search
    );
  }


  if (params.status) {
    query.set(
      "status",
      params.status
    );
  }


  if (params.priority) {
    query.set(
      "priority",
      params.priority
    );
  }

  if (params.itPriority) query.set("itPriority", params.itPriority);


  if (params.assigned !== undefined) {
    query.set(
      "assigned",
      String(params.assigned)
    );
  }


  query.set(
    "page",
    String(params.page ?? 1)
  );


  query.set(
    "limit",
    String(params.limit ?? 10)
  );


  if (params.sort) {
    query.set(
      "sort",
      params.sort
    );
  }


  if (params.order) {
    query.set(
      "order",
      params.order
    );
  }


  const response = await fetch(
    `${API_URL}/api/staff/tickets?${query.toString()}`,
    {
      credentials: "include",
      signal,
    }
  );


  if (!response.ok) {

    throw new StaffQueueError(response.status);
  }


  return response.json();
}

// ---------------------------------------------------------
// IT Staff Ticket Detail
// ---------------------------------------------------------

export async function getStaffTicketDetail(
  ticketId: number
): Promise<TicketDetail> {

  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load Staff Ticket Detail"
    );
  }

  const result = await response.json();

  return result.data;
}
// ---------------------------------------------------------
// IT Staff Ticket Actions
// ---------------------------------------------------------

export async function claimStaffTicket(
  ticketId: number
) {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/assign`,
    {
      method: "PATCH",
      credentials: "include",
    }
  );

  return staffActionResult(response, "Unable to claim ticket. Please try again.");
}

export interface ActiveStaffUser {
  id: number;
  name: string;
  email: string;
}

export async function getActiveStaffUsers(): Promise<ActiveStaffUser[]> {
  const response = await fetch(`${API_URL}/api/staff/users`, { credentials: "include" });
  const result = await staffActionResult(response, "Unable to load active IT Staff. Please try again.");
  return result.data;
}

export async function reassignStaffTicket(ticketId: number, assignedStaffId: number) {
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assign`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedStaffId }),
  });
  return staffActionResult(response, "Unable to reassign ticket. Please try again.");
}


export async function updateStaffTicketStatus(
  ticketId: number,
  currentStatus: string
) {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentStatus,
      }),
    }
  );

  return staffActionResult(response, "Unable to update ticket status. Please try again.");
}

export async function updateStaffTicketPriority(
  ticketId: number,
  itPriority: string
) {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/priority`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itPriority,
      }),
    }
  );

  return staffActionResult(response, "Unable to update IT priority. Please try again.");
}

// ---------------------------------------------------------
// Authentication
// ---------------------------------------------------------

export interface LoginResponse {
  data: {
    sessionId: string;

    user: {
      id: number;
      name: string;
      email: string;
      role:
        | "REQUESTER"
        | "IT_STAFF"
        | "ADMINISTRATOR";

      mustChangePassword: boolean;
    };
  };
}


export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {

  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      credentials:
        "include",

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );


  if (!response.ok) {
    throw new Error(
      "Invalid email or password"
    );
  }


  return response.json();
}
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/auth/change-password`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    }
  );

  if (!response.ok) {
    const result = await response.json();

    throw new Error(
      result?.error?.message ??
        "Unable to change password"
    );
  }
}
