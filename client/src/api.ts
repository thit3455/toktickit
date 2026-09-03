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
// Ticket Creation
// ---------------------------------------------------------

export type RequestedPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

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
  currentStatus: "NEW";
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