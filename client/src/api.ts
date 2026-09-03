const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------
// Lab 1 Types
// ---------------------------------------------------------

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// ---------------------------------------------------------
// Lab 2 Types
// ---------------------------------------------------------

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

interface RequesterResponse {
  data: DevelopmentRequester[];
}

// ---------------------------------------------------------
// Lab 1 — Health Check + Categories
// ---------------------------------------------------------

export async function checkSystem(): Promise<SystemStatus> {
  const healthResponse = await fetch(`${API_URL}/api/health`);

  if (!healthResponse.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const health = await healthResponse.json();

  if (health.status !== "ok") {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesResponse = await fetch(
    `${API_URL}/api/categories`
  );

  if (!categoriesResponse.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categories: Category[] =
    await categoriesResponse.json();

  return {
    online: true,
    categories,
  };
}

// ---------------------------------------------------------
// Lab 2 — Development Requesters
// ---------------------------------------------------------

export async function getRequesters(): Promise<
  DevelopmentRequester[]
> {
  const response = await fetch(`${API_URL}/api/requesters`);

  if (!response.ok) {
    throw new Error(
      "Unable to load Development Requesters"
    );
  }

  const result: RequesterResponse =
    await response.json();

  return result.data;
}