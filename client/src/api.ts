const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
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
  sortBy?: "updatedAt" | "createdAt" | "ticketNumber";
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