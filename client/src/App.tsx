import { useEffect, useState } from "react";

import {
  Category,
  CreatedTicket,
  DevelopmentRequester,
  RelatedSystem,
  RequestedPriority,
  TicketListItem,
  TicketPagination,
  createTicket,
  getCategories,
  getMyTickets,
  getRelatedSystems,
  getRequesters,
} from "./api.js";

type RequesterState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

type ReferenceState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

type SubmitState =
  | "idle"
  | "submitting"
  | "success"
  | "error";

type TicketListState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

type Screen = "create" | "myTickets";

const MAX_ATTACHMENT_SIZE =
  5 * 1024 * 1024;

const MAX_ATTACHMENTS = 5;

const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const EMPTY_PAGINATION: TicketPagination = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
};

export default function App() {
  // ---------------------------------------------------------
  // Requester
  // ---------------------------------------------------------

  const [requesters, setRequesters] =
    useState<DevelopmentRequester[]>([]);

  const [
    selectedRequesterId,
    setSelectedRequesterId,
  ] = useState("");

  const [
    currentRequester,
    setCurrentRequester,
  ] =
    useState<DevelopmentRequester | null>(
      null
    );

  const [
    requesterState,
    setRequesterState,
  ] =
    useState<RequesterState>("loading");

  const [screen, setScreen] =
    useState<Screen>("create");

  // ---------------------------------------------------------
  // Reference Data
  // ---------------------------------------------------------

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    relatedSystems,
    setRelatedSystems,
  ] = useState<RelatedSystem[]>([]);

  const [
    referenceState,
    setReferenceState,
  ] =
    useState<ReferenceState>("idle");

  // ---------------------------------------------------------
  // Create Ticket
  // ---------------------------------------------------------

  const [categoryId, setCategoryId] =
    useState("");

  const [
    relatedSystemId,
    setRelatedSystemId,
  ] = useState("");

  const [
    requestedPriority,
    setRequestedPriority,
  ] =
    useState<RequestedPriority | "">(
      ""
    );

  const [summary, setSummary] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    attachments,
    setAttachments,
  ] = useState<File[]>([]);

  const [
    attachmentError,
    setAttachmentError,
  ] = useState("");

  const [
    submitState,
    setSubmitState,
  ] =
    useState<SubmitState>("idle");

  const [
    createdTicket,
    setCreatedTicket,
  ] =
    useState<CreatedTicket | null>(
      null
    );

  const [errors, setErrors] =
    useState<Record<string, string>>(
      {}
    );

  // ---------------------------------------------------------
  // My Tickets
  // ---------------------------------------------------------

  const [tickets, setTickets] =
    useState<TicketListItem[]>([]);

  const [
    ticketListState,
    setTicketListState,
  ] =
    useState<TicketListState>("idle");

  const [
    pagination,
    setPagination,
  ] =
    useState<TicketPagination>(
      EMPTY_PAGINATION
    );

  const [ticketPage, setTicketPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState<10 | 20 | 50>(10);

  const [search, setSearch] =
    useState("");

  const [
    filterCategoryId,
    setFilterCategoryId,
  ] = useState("");

  const [
    filterRelatedSystemId,
    setFilterRelatedSystemId,
  ] = useState("");

  const [
    filterPriority,
    setFilterPriority,
  ] =
    useState<RequestedPriority | "">(
      ""
    );

  const [
    filterStatus,
    setFilterStatus,
  ] = useState<"" | "NEW">("");

  const [sortBy, setSortBy] =
    useState<
      | "updatedAt"
      | "createdAt"
      | "ticketNumber"
    >("updatedAt");

  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">(
      "desc"
    );

  const [
    reloadTicketsKey,
    setReloadTicketsKey,
  ] = useState(0);

  // ---------------------------------------------------------
  // Load Development Requesters
  // ---------------------------------------------------------

  useEffect(() => {
    async function loadRequesters() {
      try {
        const data =
          await getRequesters();

        setRequesters(data);

        if (data.length === 0) {
          setRequesterState("empty");
          return;
        }

        setRequesterState("ready");

        const storedId =
          sessionStorage.getItem(
            "developmentRequesterId"
          );

        if (!storedId) {
          return;
        }

        const storedRequester =
          data.find(
            (requester) =>
              requester.id ===
              Number(storedId)
          );

        if (storedRequester) {
          setSelectedRequesterId(
            storedId
          );

          setCurrentRequester(
            storedRequester
          );
        } else {
          sessionStorage.removeItem(
            "developmentRequesterId"
          );
        }
      } catch {
        setRequesterState("error");
      }
    }

    loadRequesters();
  }, []);

  // ---------------------------------------------------------
  // Load Categories + Related Systems
  // ---------------------------------------------------------

  useEffect(() => {
    if (!currentRequester) {
      return;
    }

    async function loadReferenceData() {
      try {
        setReferenceState(
          "loading"
        );

        const [
          categoryData,
          systemData,
        ] = await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);

        setCategories(categoryData);

        setRelatedSystems(
          systemData
        );

        setReferenceState("ready");
      } catch {
        setReferenceState("error");
      }
    }

    loadReferenceData();
  }, [currentRequester]);

  // ---------------------------------------------------------
  // Load My Tickets
  // ---------------------------------------------------------

  useEffect(() => {
    if (
      !currentRequester ||
      screen !== "myTickets"
    ) {
      return;
    }

    // Important:
    // Save the ID after checking currentRequester is not null.
    const requesterId =
      currentRequester.id;

    async function loadTickets() {
      try {
        setTicketListState(
          "loading"
        );

        const result =
          await getMyTickets({
            requesterId,

            page: ticketPage,

            pageSize,

            search:
              search.trim() ||
              undefined,

            categoryId:
              filterCategoryId
                ? Number(
                    filterCategoryId
                  )
                : undefined,

            relatedSystemId:
              filterRelatedSystemId
                ? Number(
                    filterRelatedSystemId
                  )
                : undefined,

            requestedPriority:
              filterPriority ||
              undefined,

            currentStatus:
              filterStatus ||
              undefined,

            sortBy,

            sortOrder,
          });

        setTickets(result.data);

        setPagination(
          result.pagination
        );

        setTicketListState(
          "ready"
        );
      } catch {
        setTicketListState(
          "error"
        );
      }
    }

    loadTickets();
  }, [
    currentRequester,
    screen,
    ticketPage,
    pageSize,
    search,
    filterCategoryId,
    filterRelatedSystemId,
    filterPriority,
    filterStatus,
    sortBy,
    sortOrder,
    reloadTicketsKey,
  ]);

  // ---------------------------------------------------------
  // Requester Selection
  // ---------------------------------------------------------

  function handleContinue() {
    const requester =
      requesters.find(
        (item) =>
          item.id ===
          Number(
            selectedRequesterId
          )
      );

    if (!requester) {
      return;
    }

    sessionStorage.setItem(
      "developmentRequesterId",
      String(requester.id)
    );

    setCurrentRequester(
      requester
    );

    setScreen("create");
  }

  function handleChangeRequester() {
    sessionStorage.removeItem(
      "developmentRequesterId"
    );

    setCurrentRequester(null);

    setSelectedRequesterId("");

    setScreen("create");

    resetCreateTicketForm();

    resetTicketFilters();
  }

  // ---------------------------------------------------------
  // Reset Create Ticket
  // ---------------------------------------------------------

  function resetCreateTicketForm() {
    setCategoryId("");

    setRelatedSystemId("");

    setRequestedPriority("");

    setSummary("");

    setDescription("");

    setAttachments([]);

    setAttachmentError("");

    setCreatedTicket(null);

    setSubmitState("idle");

    setErrors({});
  }

  // ---------------------------------------------------------
  // Attachment Validation
  // ---------------------------------------------------------

  function handleAttachmentChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    setAttachmentError("");

    if (files.length === 0) {
      setAttachments([]);
      return;
    }

    if (
      files.length >
      MAX_ATTACHMENTS
    ) {
      setAttachments([]);

      setAttachmentError(
        "A maximum of 5 attachments is allowed."
      );

      return;
    }

    const invalidTypeFile =
      files.find(
        (file) =>
          !ALLOWED_ATTACHMENT_TYPES.includes(
            file.type
          )
      );

    if (invalidTypeFile) {
      setAttachments([]);

      setAttachmentError(
        "Only JPG/JPEG, PNG, WEBP, and PDF files are allowed."
      );

      return;
    }

    const oversizedFile =
      files.find(
        (file) =>
          file.size >
          MAX_ATTACHMENT_SIZE
      );

    if (oversizedFile) {
      setAttachments([]);

      setAttachmentError(
        "Each attachment must be 5 MB or smaller."
      );

      return;
    }

    setAttachments(files);
  }

  // ---------------------------------------------------------
  // Create Ticket Validation
  // ---------------------------------------------------------

  function validateForm() {
    const newErrors: Record<
      string,
      string
    > = {};

    if (!categoryId) {
      newErrors.category =
        "Category is required.";
    }

    if (!relatedSystemId) {
      newErrors.relatedSystem =
        "Related System is required.";
    }

    if (!requestedPriority) {
      newErrors.priority =
        "Requested Priority is required.";
    }

    const cleanSummary =
      summary.trim();

    if (
      cleanSummary.length < 5 ||
      cleanSummary.length > 120
    ) {
      newErrors.summary =
        "Ticket Summary must be between 5 and 120 characters.";
    }

    const cleanDescription =
      description.trim();

    if (
      cleanDescription.length < 10 ||
      cleanDescription.length >
        2000
    ) {
      newErrors.description =
        "Description must be between 10 and 2000 characters.";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors)
        .length === 0 &&
      !attachmentError
    );
  }

  // ---------------------------------------------------------
  // Submit Ticket
  // ---------------------------------------------------------

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !currentRequester ||
      !validateForm()
    ) {
      return;
    }

    try {
      setSubmitState(
        "submitting"
      );

      setCreatedTicket(null);

      const ticket =
        await createTicket({
          requesterId:
            currentRequester.id,

          categoryId:
            Number(categoryId),

          relatedSystemId:
            Number(
              relatedSystemId
            ),

          summary:
            summary.trim(),

          requestedPriority:
            requestedPriority as RequestedPriority,

          description:
            description.trim(),
        });

      setCreatedTicket(ticket);

      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }

  // ---------------------------------------------------------
  // My Tickets Helpers
  // ---------------------------------------------------------

  function resetTicketFilters() {
    setSearch("");

    setFilterCategoryId("");

    setFilterRelatedSystemId(
      ""
    );

    setFilterPriority("");

    setFilterStatus("");

    setSortBy("updatedAt");

    setSortOrder("desc");

    setPageSize(10);

    setTicketPage(1);
  }

  function hasActiveFilters() {
    return Boolean(
      search.trim() ||
        filterCategoryId ||
        filterRelatedSystemId ||
        filterPriority ||
        filterStatus
    );
  }

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString();
  }

  // ---------------------------------------------------------
  // Requester Selection Screen
  // ---------------------------------------------------------

  if (!currentRequester) {
    return (
      <main
        className="container py-5"
        style={{
          maxWidth: 640,
        }}
      >
        <h1 className="h3 mb-4">
          TokTickIT{" "}
          <span className="text-success">
            IT Service Desk
          </span>
        </h1>

        <h2 className="h5 mb-3">
          Select a Development Requester
        </h2>

        <p className="text-muted">
          Select a Development Requester to test
          requester-specific ticket behavior.
          This is not a login screen.
          Authentication and role-based access
          will be introduced in Lab 3.
        </p>

        {requesterState ===
          "loading" && (
          <p aria-live="polite">
            Loading Development
            Requesters...
          </p>
        )}

        {requesterState ===
          "empty" && (
          <div
            className="alert alert-warning"
            role="status"
          >
            No active Development
            Requesters are available.
          </div>
        )}

        {requesterState ===
          "error" && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            Unable to load Development
            Requesters.
          </div>
        )}

        <div className="mb-3">
          <label
            htmlFor="development-requester"
            className="form-label"
          >
            Development Requester
          </label>

          <select
            id="development-requester"
            className="form-select"
            value={
              selectedRequesterId
            }
            onChange={(event) =>
              setSelectedRequesterId(
                event.target.value
              )
            }
            disabled={
              requesterState !==
              "ready"
            }
          >
            <option value="">
              Select a Requester
            </option>

            {requesters.map(
              (requester) => (
                <option
                  key={
                    requester.id
                  }
                  value={
                    requester.id
                  }
                >
                  {requester.name} (
                  {requester.email})
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-success"
          onClick={
            handleContinue
          }
          disabled={
            requesterState !==
              "ready" ||
            selectedRequesterId ===
              ""
          }
        >
          Continue
        </button>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Main Application
  // ---------------------------------------------------------

  return (
    <main
      className="container py-5"
      style={{
        maxWidth: 1100,
      }}
    >
      {/* Header */}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="h3 mb-1">
            TokTickIT
          </h1>

          <p className="mb-0">
            Current Requester:{" "}
            <strong>
              {
                currentRequester.name
              }
            </strong>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-success"
          onClick={
            handleChangeRequester
          }
        >
          Change Requester
        </button>
      </div>

      {/* Navigation */}

      <nav
        className="d-flex gap-2 mb-4"
        aria-label="Requester navigation"
      >
        <button
          type="button"
          className={
            screen === "myTickets"
              ? "btn btn-success"
              : "btn btn-outline-success"
          }
          onClick={() => {
            setScreen(
              "myTickets"
            );

            setTicketPage(1);
          }}
        >
          My Tickets
        </button>

        <button
          type="button"
          className={
            screen === "create"
              ? "btn btn-success"
              : "btn btn-outline-success"
          }
          onClick={() =>
            setScreen("create")
          }
        >
          Create Ticket
        </button>
      </nav>

      {screen ===
      "myTickets" ? (
        // =====================================================
        // MY TICKETS
        // =====================================================

        <section>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h2 className="h4 mb-1">
                My Tickets
              </h2>

              <p className="text-muted mb-0">
                Tickets belonging to{" "}
                {
                  currentRequester.name
                }
                .
              </p>
            </div>

            <button
              type="button"
              className="btn btn-success"
              onClick={() =>
                setScreen("create")
              }
            >
              Create Ticket
            </button>
          </div>

          {/* Search + Filters */}

          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label
                    className="form-label"
                    htmlFor="ticket-search"
                  >
                    Search Tickets
                  </label>

                  <input
                    id="ticket-search"
                    className="form-control"
                    type="search"
                    placeholder="Search by Ticket Number or Summary"
                    value={search}
                    onChange={(
                      event
                    ) => {
                      setSearch(
                        event.target
                          .value
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="ticket-category-filter"
                  >
                    Category
                  </label>

                  <select
                    id="ticket-category-filter"
                    className="form-select"
                    value={
                      filterCategoryId
                    }
                    onChange={(
                      event
                    ) => {
                      setFilterCategoryId(
                        event.target
                          .value
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="">
                      All Categories
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="ticket-system-filter"
                  >
                    Related System
                  </label>

                  <select
                    id="ticket-system-filter"
                    className="form-select"
                    value={
                      filterRelatedSystemId
                    }
                    onChange={(
                      event
                    ) => {
                      setFilterRelatedSystemId(
                        event.target
                          .value
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="">
                      All Systems
                    </option>

                    {relatedSystems.map(
                      (system) => (
                        <option
                          key={
                            system.id
                          }
                          value={
                            system.id
                          }
                        >
                          {
                            system.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="ticket-priority-filter"
                  >
                    Priority
                  </label>

                  <select
                    id="ticket-priority-filter"
                    className="form-select"
                    value={
                      filterPriority
                    }
                    onChange={(
                      event
                    ) => {
                      setFilterPriority(
                        event.target
                          .value as
                          | RequestedPriority
                          | ""
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="">
                      All Priorities
                    </option>

                    <option value="LOW">
                      Low
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HIGH">
                      High
                    </option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="ticket-status-filter"
                  >
                    Status
                  </label>

                  <select
                    id="ticket-status-filter"
                    className="form-select"
                    value={
                      filterStatus
                    }
                    onChange={(
                      event
                    ) => {
                      setFilterStatus(
                        event.target
                          .value as
                          | ""
                          | "NEW"
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="">
                      All Statuses
                    </option>

                    <option value="NEW">
                      New
                    </option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="ticket-sort"
                  >
                    Sort By
                  </label>

                  <select
                    id="ticket-sort"
                    className="form-select"
                    value={sortBy}
                    onChange={(
                      event
                    ) => {
                      setSortBy(
                        event.target
                          .value as
                          | "updatedAt"
                          | "createdAt"
                          | "ticketNumber"
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="updatedAt">
                      Updated Date
                    </option>

                    <option value="createdAt">
                      Created Date
                    </option>

                    <option value="ticketNumber">
                      Ticket Number
                    </option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="ticket-sort-order"
                  >
                    Sort Order
                  </label>

                  <select
                    id="ticket-sort-order"
                    className="form-select"
                    value={
                      sortOrder
                    }
                    onChange={(
                      event
                    ) => {
                      setSortOrder(
                        event.target
                          .value as
                          | "asc"
                          | "desc"
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="desc">
                      Descending
                    </option>

                    <option value="asc">
                      Ascending
                    </option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="page-size"
                  >
                    Rows Per Page
                  </label>

                  <select
                    id="page-size"
                    className="form-select"
                    value={
                      pageSize
                    }
                    onChange={(
                      event
                    ) => {
                      setPageSize(
                        Number(
                          event.target
                            .value
                        ) as
                          | 10
                          | 20
                          | 50
                      );

                      setTicketPage(
                        1
                      );
                    }}
                  >
                    <option value="10">
                      10
                    </option>

                    <option value="20">
                      20
                    </option>

                    <option value="50">
                      50
                    </option>
                  </select>
                </div>

                <div className="col-12">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={
                      resetTicketFilters
                    }
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Loading */}

          {ticketListState ===
            "loading" && (
            <div
              className="alert alert-info"
              role="status"
            >
              Loading My Tickets...
            </div>
          )}

          {/* Error */}

          {ticketListState ===
            "error" && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              <p className="mb-2">
                Unable to load My
                Tickets.
              </p>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() =>
                  setReloadTicketsKey(
                    (value) =>
                      value + 1
                  )
                }
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}

          {ticketListState ===
            "ready" &&
            tickets.length === 0 &&
            !hasActiveFilters() && (
              <div className="alert alert-secondary">
                <h3 className="h6">
                  No Tickets Yet
                </h3>

                <p className="mb-3">
                  You have not created
                  any Tickets yet.
                </p>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() =>
                    setScreen(
                      "create"
                    )
                  }
                >
                  Create Your First
                  Ticket
                </button>
              </div>
            )}

          {/* No Results */}

          {ticketListState ===
            "ready" &&
            tickets.length === 0 &&
            hasActiveFilters() && (
              <div className="alert alert-secondary">
                <h3 className="h6">
                  No Matching Tickets
                </h3>

                <p className="mb-3">
                  No Tickets match the
                  current search or
                  filters.
                </p>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={
                    resetTicketFilters
                  }
                >
                  Clear Search and
                  Filters
                </button>
              </div>
            )}

          {/* Ticket Table */}

          {ticketListState ===
            "ready" &&
            tickets.length > 0 && (
              <>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle">
                    <thead>
                      <tr>
                        <th>
                          Ticket Number
                        </th>

                        <th>
                          Summary
                        </th>

                        <th>
                          Category
                        </th>

                        <th>
                          Related System
                        </th>

                        <th>
                          Priority
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Created
                        </th>

                        <th>
                          Updated
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {tickets.map(
                        (ticket) => (
                          <tr
                            key={
                              ticket.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  ticket.ticketNumber
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                ticket.summary
                              }
                            </td>

                            <td>
                              {
                                ticket
                                  .category
                                  .name
                              }
                            </td>

                            <td>
                              {
                                ticket
                                  .relatedSystem
                                  .name
                              }
                            </td>

                            <td>
                              {
                                ticket.requestedPriority
                              }
                            </td>

                            <td>
                              {
                                ticket.currentStatus
                              }
                            </td>

                            <td>
                              {formatDate(
                                ticket.createdAt
                              )}
                            </td>

                            <td>
                              {formatDate(
                                ticket.updatedAt
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}

                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
                  <div>
                    Page{" "}
                    {
                      pagination.page
                    }{" "}
                    of{" "}
                    {Math.max(
                      pagination.totalPages,
                      1
                    )}{" "}
                    —{" "}
                    {
                      pagination.totalItems
                    }{" "}
                    Ticket
                    {pagination.totalItems ===
                    1
                      ? ""
                      : "s"}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      disabled={
                        ticketPage <=
                        1
                      }
                      onClick={() =>
                        setTicketPage(
                          (page) =>
                            Math.max(
                              1,
                              page - 1
                            )
                        )
                      }
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-success"
                      disabled={
                        pagination.totalPages ===
                          0 ||
                        ticketPage >=
                          pagination.totalPages
                      }
                      onClick={() =>
                        setTicketPage(
                          (page) =>
                            page + 1
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
        </section>
      ) : (
        // =====================================================
        // CREATE TICKET
        // =====================================================

        <section>
          <h2 className="h4 mb-4">
            Create Ticket
          </h2>

          {referenceState ===
            "loading" && (
            <div className="alert alert-info">
              Loading ticket
              reference data...
            </div>
          )}

          {referenceState ===
            "error" && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              Unable to load
              Categories or Related
              Systems.
            </div>
          )}

          {submitState ===
            "success" &&
            createdTicket && (
              <div
                className="alert alert-success"
                role="status"
              >
                Ticket created
                successfully. Official
                Ticket Number:{" "}
                <strong>
                  {
                    createdTicket.ticketNumber
                  }
                </strong>
              </div>
            )}

          {submitState ===
            "error" && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              Unable to create Ticket.
              Your entered values have
              been preserved.
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
          >
            <div className="row g-3">
              <div className="col-md-4">
                <label
                  className="form-label"
                  htmlFor="ticket-number"
                >
                  Ticket Number
                </label>

                <input
                  id="ticket-number"
                  className="form-control"
                  value={
                    createdTicket?.ticketNumber ??
                    "Generated after submission"
                  }
                  readOnly
                />
              </div>

              <div className="col-md-4">
                <label
                  className="form-label"
                  htmlFor="ticket-date"
                >
                  Ticket Date
                </label>

                <input
                  id="ticket-date"
                  className="form-control"
                  value={new Date().toLocaleDateString()}
                  readOnly
                />
              </div>

              <div className="col-md-4">
                <label
                  className="form-label"
                  htmlFor="requester"
                >
                  Requester
                </label>

                <input
                  id="requester"
                  className="form-control"
                  value={
                    currentRequester.name
                  }
                  readOnly
                />
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="category"
                >
                  Category{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <select
                  id="category"
                  className="form-select"
                  value={
                    categoryId
                  }
                  onChange={(
                    event
                  ) =>
                    setCategoryId(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    referenceState !==
                    "ready"
                  }
                >
                  <option value="">
                    Select Category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.name
                        }
                      </option>
                    )
                  )}
                </select>

                {errors.category && (
                  <div className="text-danger">
                    {
                      errors.category
                    }
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="related-system"
                >
                  Related System{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <select
                  id="related-system"
                  className="form-select"
                  value={
                    relatedSystemId
                  }
                  onChange={(
                    event
                  ) =>
                    setRelatedSystemId(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    referenceState !==
                    "ready"
                  }
                >
                  <option value="">
                    Select Related
                    System
                  </option>

                  {relatedSystems.map(
                    (system) => (
                      <option
                        key={
                          system.id
                        }
                        value={
                          system.id
                        }
                      >
                        {
                          system.name
                        }
                      </option>
                    )
                  )}
                </select>

                {errors.relatedSystem && (
                  <div className="text-danger">
                    {
                      errors.relatedSystem
                    }
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="ticket-summary"
                >
                  Ticket Summary{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <input
                  id="ticket-summary"
                  className="form-control"
                  value={
                    summary
                  }
                  onChange={(
                    event
                  ) =>
                    setSummary(
                      event.target
                        .value
                    )
                  }
                  maxLength={
                    120
                  }
                />

                {errors.summary && (
                  <div className="text-danger">
                    {
                      errors.summary
                    }
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="requested-priority"
                >
                  Requested Priority{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <select
                  id="requested-priority"
                  className="form-select"
                  value={
                    requestedPriority
                  }
                  onChange={(
                    event
                  ) =>
                    setRequestedPriority(
                      event.target
                        .value as
                        | RequestedPriority
                        | ""
                    )
                  }
                >
                  <option value="">
                    Select Priority
                  </option>

                  <option value="LOW">
                    Low
                  </option>

                  <option value="MEDIUM">
                    Medium
                  </option>

                  <option value="HIGH">
                    High
                  </option>
                </select>

                {errors.priority && (
                  <div className="text-danger">
                    {
                      errors.priority
                    }
                  </div>
                )}
              </div>

              <div className="col-12">
                <label
                  className="form-label"
                  htmlFor="description"
                >
                  Description{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <textarea
                  id="description"
                  className="form-control"
                  rows={5}
                  value={
                    description
                  }
                  onChange={(
                    event
                  ) =>
                    setDescription(
                      event.target
                        .value
                    )
                  }
                  maxLength={
                    2000
                  }
                />

                {errors.description && (
                  <div className="text-danger">
                    {
                      errors.description
                    }
                  </div>
                )}
              </div>

              <div className="col-12">
                <label
                  className="form-label"
                  htmlFor="attachments"
                >
                  Attachments
                </label>

                <input
                  id="attachments"
                  type="file"
                  className="form-control"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  multiple
                  onChange={
                    handleAttachmentChange
                  }
                />

                <div className="form-text">
                  JPG/JPEG, PNG, WEBP,
                  or PDF. Maximum 5 MB
                  per file, maximum 5
                  active attachments.
                </div>

                {attachmentError && (
                  <div
                    className="text-danger mt-1"
                    role="alert"
                  >
                    {
                      attachmentError
                    }
                  </div>
                )}

                {!attachmentError &&
                  attachments.length >
                    0 && (
                    <div className="text-success mt-1">
                      {
                        attachments.length
                      }{" "}
                      attachment
                      {attachments.length >
                      1
                        ? "s"
                        : ""}{" "}
                      selected.
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="btn btn-success"
                disabled={
                  submitState ===
                    "submitting" ||
                  referenceState !==
                    "ready" ||
                  Boolean(
                    attachmentError
                  )
                }
              >
                {submitState ===
                "submitting"
                  ? "Submitting..."
                  : "Submit Ticket"}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}