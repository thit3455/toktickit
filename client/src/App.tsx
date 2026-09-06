import { useEffect, useState } from "react";

import {
  Category,
  CreatedTicket,
  DevelopmentRequester,
  RelatedSystem,
  RequestedPriority,
  TicketAttachment,
  TicketDetail,
  TicketListItem,
  TicketPagination,
  createTicket,
  downloadAttachmentFile,
  getCategories,
  getMyTickets,
  getRelatedSystems,
  getRequesters,
  getTicketAttachments,
  getTicketDetail,
  removeAttachment,
  uploadTicketAttachment,
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

type TicketDetailState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

type AttachmentState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

type AttachmentActionState =
  | "idle"
  | "working";

type Screen =
  | "create"
  | "myTickets"
  | "ticketDetail";

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
  // =========================================================
  // Development Requester
  // =========================================================

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

  // =========================================================
  // Reference Data
  // =========================================================

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

  // =========================================================
  // Create Ticket
  // =========================================================

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
    createAttachmentWarning,
    setCreateAttachmentWarning,
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

  // =========================================================
  // My Tickets
  // =========================================================

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

  // =========================================================
  // Ticket Detail
  // =========================================================

  const [
    selectedTicketId,
    setSelectedTicketId,
  ] =
    useState<number | null>(null);

  const [
    ticketDetail,
    setTicketDetail,
  ] =
    useState<TicketDetail | null>(
      null
    );

  const [
    ticketDetailState,
    setTicketDetailState,
  ] =
    useState<TicketDetailState>(
      "idle"
    );

  const [
    reloadDetailKey,
    setReloadDetailKey,
  ] = useState(0);

  // =========================================================
  // Ticket Detail Attachments
  // =========================================================

  const [
    ticketAttachments,
    setTicketAttachments,
  ] =
    useState<TicketAttachment[]>([]);

  const [
    attachmentState,
    setAttachmentState,
  ] =
    useState<AttachmentState>("idle");

  const [
    attachmentActionState,
    setAttachmentActionState,
  ] =
    useState<AttachmentActionState>(
      "idle"
    );

  const [
    detailUploadFile,
    setDetailUploadFile,
  ] =
    useState<File | null>(null);

  const [
    detailAttachmentError,
    setDetailAttachmentError,
  ] = useState("");

  const [
    attachmentActionMessage,
    setAttachmentActionMessage,
  ] = useState("");

  const [
    attachmentActionError,
    setAttachmentActionError,
  ] = useState("");

  const [
    removalReasons,
    setRemovalReasons,
  ] =
    useState<Record<number, string>>(
      {}
    );

  // =========================================================
  // Load Development Requesters
  // =========================================================

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

  // =========================================================
  // Load Categories + Related Systems
  // =========================================================

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

  // =========================================================
  // Load My Tickets
  // =========================================================

  useEffect(() => {
    if (
      !currentRequester ||
      screen !== "myTickets"
    ) {
      return;
    }

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

  // =========================================================
  // Load Ticket Detail
  // =========================================================

  useEffect(() => {
    if (
      !currentRequester ||
      screen !== "ticketDetail" ||
      selectedTicketId === null
    ) {
      return;
    }

    const requesterId =
      currentRequester.id;

    const ticketId =
      selectedTicketId;

    async function loadDetail() {
      try {
        setTicketDetailState(
          "loading"
        );

        setTicketDetail(null);

        const detail =
          await getTicketDetail(
            ticketId,
            requesterId
          );

        setTicketDetail(detail);

        setTicketDetailState(
          "ready"
        );
      } catch {
        setTicketDetailState(
          "error"
        );
      }
    }

    loadDetail();
  }, [
    currentRequester,
    screen,
    selectedTicketId,
    reloadDetailKey,
  ]);

  // =========================================================
  // Load Ticket Attachments
  // =========================================================

  useEffect(() => {
    if (
      !currentRequester ||
      screen !== "ticketDetail" ||
      selectedTicketId === null
    ) {
      return;
    }

    const requesterId =
      currentRequester.id;

    const ticketId =
      selectedTicketId;

    async function loadAttachments() {
      try {
        setAttachmentState(
          "loading"
        );

        const data =
          await getTicketAttachments(
            ticketId,
            requesterId
          );

        setTicketAttachments(
          data
        );

        setAttachmentState(
          "ready"
        );
      } catch {
        setAttachmentState(
          "error"
        );
      }
    }

    loadAttachments();
  }, [
    currentRequester,
    screen,
    selectedTicketId,
    reloadDetailKey,
  ]);

  // =========================================================
  // Requester Selection
  // =========================================================

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

    setSelectedTicketId(null);

    setTicketDetail(null);

    setTicketAttachments([]);

    resetCreateTicketForm();

    resetTicketFilters();

    resetDetailAttachmentState();
  }

  // =========================================================
  // Reset Create Ticket
  // =========================================================

  function resetCreateTicketForm() {
    setCategoryId("");

    setRelatedSystemId("");

    setRequestedPriority("");

    setSummary("");

    setDescription("");

    setAttachments([]);

    setAttachmentError("");

    setCreateAttachmentWarning("");

    setCreatedTicket(null);

    setSubmitState("idle");

    setErrors({});
  }

  // =========================================================
  // Reset Detail Attachment State
  // =========================================================

  function resetDetailAttachmentState() {
    setDetailUploadFile(null);

    setDetailAttachmentError("");

    setAttachmentActionMessage("");

    setAttachmentActionError("");

    setRemovalReasons({});

    setAttachmentActionState(
      "idle"
    );
  }

  // =========================================================
  // Shared Attachment Validation
  // =========================================================

  function validateAttachmentFile(
    file: File
  ): string {
    if (
      !ALLOWED_ATTACHMENT_TYPES.includes(
        file.type
      )
    ) {
      return "Only JPG/JPEG, PNG, WEBP, and PDF files are allowed.";
    }

    if (
      file.size >
      MAX_ATTACHMENT_SIZE
    ) {
      return "Each attachment must be 5 MB or smaller.";
    }

    return "";
  }

  // =========================================================
  // Create Ticket Attachment Validation
  // =========================================================

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

    for (const file of files) {
      const validationMessage =
        validateAttachmentFile(file);

      if (validationMessage) {
        setAttachments([]);

        setAttachmentError(
          validationMessage
        );

        return;
      }
    }

    setAttachments(files);
  }

  // =========================================================
  // Create Ticket Validation
  // =========================================================

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

  // =========================================================
  // Submit Ticket
  // =========================================================

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

      setCreateAttachmentWarning("");

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

      // Ticket creation succeeds independently.
      // If an attachment upload fails, preserve the
      // created Ticket and report the attachment issue.
      if (
        attachments.length > 0
      ) {
        try {
          for (
            const file of attachments
          ) {
            await uploadTicketAttachment(
              ticket.id,
              currentRequester.id,
              file
            );
          }
        } catch {
          setCreateAttachmentWarning(
            "The Ticket was created, but one or more attachments could not be uploaded."
          );
        }
      }

      setSubmitState("success");

      setReloadTicketsKey(
        (value) => value + 1
      );
    } catch {
      setSubmitState("error");
    }
  }

  // =========================================================
  // My Tickets Helpers
  // =========================================================

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

  function openTicketDetail(
    ticketId: number
  ) {
    setSelectedTicketId(
      ticketId
    );

    setTicketDetail(null);

    setTicketAttachments([]);

    resetDetailAttachmentState();

    setScreen("ticketDetail");
  }

  function backToMyTickets() {
    setScreen("myTickets");

    setSelectedTicketId(null);

    setTicketDetail(null);

    setTicketAttachments([]);

    resetDetailAttachmentState();

    setReloadTicketsKey(
      (value) => value + 1
    );
  }

  // =========================================================
  // Ticket Detail Attachment Upload
  // =========================================================

  function handleDetailUploadFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setDetailUploadFile(null);

    setDetailAttachmentError("");

    setAttachmentActionError("");

    setAttachmentActionMessage("");

    if (!file) {
      return;
    }

    const activeCount =
      ticketAttachments.filter(
        (attachment) =>
          !attachment.isRemoved
      ).length;

    if (
      activeCount >=
      MAX_ATTACHMENTS
    ) {
      setDetailAttachmentError(
        "This Ticket already has the maximum of 5 active attachments."
      );

      event.target.value = "";

      return;
    }

    const validationMessage =
      validateAttachmentFile(file);

    if (validationMessage) {
      setDetailAttachmentError(
        validationMessage
      );

      event.target.value = "";

      return;
    }

    setDetailUploadFile(file);
  }

  async function handleDetailUpload() {
    if (
      !currentRequester ||
      selectedTicketId === null ||
      !detailUploadFile
    ) {
      setDetailAttachmentError(
        "Select an attachment first."
      );

      return;
    }

    try {
      setAttachmentActionState(
        "working"
      );

      setAttachmentActionError("");

      setAttachmentActionMessage("");

      await uploadTicketAttachment(
        selectedTicketId,
        currentRequester.id,
        detailUploadFile
      );

      setDetailUploadFile(null);

      setAttachmentActionMessage(
        "Attachment uploaded successfully."
      );

      setReloadDetailKey(
        (value) => value + 1
      );
    } catch {
      setAttachmentActionError(
        "Unable to upload Attachment."
      );
    } finally {
      setAttachmentActionState(
        "idle"
      );
    }
  }

  // =========================================================
  // Download Attachment
  // =========================================================

  async function handleDownloadAttachment(
    attachment: TicketAttachment
  ) {
    if (
      !currentRequester ||
      attachment.isRemoved
    ) {
      return;
    }

    try {
      setAttachmentActionError("");

      setAttachmentActionMessage("");

      await downloadAttachmentFile(
        attachment,
        currentRequester.id
      );
    } catch {
      setAttachmentActionError(
        "Unable to download Attachment."
      );
    }
  }

  // =========================================================
  // Soft Remove Attachment
  // =========================================================

  async function handleRemoveAttachment(
    attachment: TicketAttachment
  ) {
    if (!currentRequester) {
      return;
    }

    const reason =
      (
        removalReasons[
          attachment.id
        ] ?? ""
      ).trim();

    if (!reason) {
      setAttachmentActionError(
        "A removal reason is required."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Remove "${attachment.originalName}"? The metadata will be retained.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setAttachmentActionState(
        "working"
      );

      setAttachmentActionError("");

      setAttachmentActionMessage("");

      await removeAttachment(
        attachment.id,
        currentRequester.id,
        reason
      );

      setAttachmentActionMessage(
        "Attachment removed successfully. Metadata has been retained."
      );

      setReloadDetailKey(
        (value) => value + 1
      );
    } catch {
      setAttachmentActionError(
        "Unable to remove Attachment."
      );
    } finally {
      setAttachmentActionState(
        "idle"
      );
    }
  }

  // =========================================================
  // Formatting
  // =========================================================

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString();
  }

  function formatBytes(
    bytes: number
  ) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  // =========================================================
  // Development Requester Selection Screen
  // =========================================================

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
          Select a Development
          Requester
        </h2>

        <p className="text-muted">
          Select a Development
          Requester to test
          requester-specific ticket
          behavior. This is not a login
          screen. Authentication and
          role-based access will be
          introduced in Lab 3.
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

  // =========================================================
  // Main Application
  // =========================================================

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
        className="d-flex flex-wrap gap-2 mb-4"
        aria-label="Requester navigation"
      >
        <button
          type="button"
          className={
            screen === "myTickets" ||
            screen === "ticketDetail"
              ? "btn btn-success"
              : "btn btn-outline-success"
          }
          onClick={() => {
            setScreen(
              "myTickets"
            );

            setSelectedTicketId(
              null
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
          onClick={() => {
            setScreen("create");

            setSelectedTicketId(
              null
            );
          }}
        >
          Create Ticket
        </button>
      </nav>

      {/* =====================================================
          MY TICKETS
      ====================================================== */}

      {screen === "myTickets" && (
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

          {ticketListState ===
            "loading" && (
            <div
              className="alert alert-info"
              role="status"
            >
              Loading My Tickets...
            </div>
          )}

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
                              <button
                                type="button"
                                className="btn btn-link p-0 fw-bold text-success"
                                onClick={() =>
                                  openTicketDetail(
                                    ticket.id
                                  )
                                }
                              >
                                {
                                  ticket.ticketNumber
                                }
                              </button>
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
                              <span className="badge text-bg-light border">
                                {
                                  ticket.requestedPriority
                                }
                              </span>
                            </td>

                            <td>
                              <span className="badge text-bg-success">
                                {
                                  ticket.currentStatus
                                }
                              </span>
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
                        ticketPage <= 1
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
      )}

      {/* =====================================================
          TICKET DETAIL
      ====================================================== */}

      {screen ===
        "ticketDetail" && (
        <section>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
            <div>
              <h2 className="h4 mb-1">
                Ticket Detail
              </h2>

              <p className="text-muted mb-0">
                Requester-owned Ticket
                information and
                attachments.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline-success"
              onClick={
                backToMyTickets
              }
            >
              Back to My Tickets
            </button>
          </div>

          {ticketDetailState ===
            "loading" && (
            <div
              className="alert alert-info"
              role="status"
            >
              Loading Ticket Detail...
            </div>
          )}

          {ticketDetailState ===
            "error" && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              <p className="mb-2">
                Unable to load this
                Ticket. It may not
                belong to the selected
                Requester.
              </p>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() =>
                  setReloadDetailKey(
                    (value) =>
                      value + 1
                  )
                }
              >
                Retry
              </button>
            </div>
          )}

          {ticketDetailState ===
            "ready" &&
            ticketDetail && (
              <>
                {/* Read-only Ticket Information */}

                <div className="card mb-4">
                  <div className="card-header bg-success text-white">
                    Ticket Information
                  </div>

                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">
                          Ticket Number
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.ticketNumber
                          }
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">
                          Current Status
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.currentStatus
                          }
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">
                          Requested Priority
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.requestedPriority
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Requester
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.requester.name
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Requester Email
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.requester.email ??
                            ""
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Category
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.category.name
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Related System
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.relatedSystem.name
                          }
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">
                          Ticket Summary
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={
                            ticketDetail.summary
                          }
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">
                          Description
                        </label>

                        <textarea
                          className="form-control bg-light"
                          readOnly
                          rows={5}
                          value={
                            ticketDetail.description
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Created
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={formatDate(
                            ticketDetail.createdAt
                          )}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Last Updated
                        </label>

                        <input
                          className="form-control bg-light"
                          readOnly
                          value={formatDate(
                            ticketDetail.updatedAt
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachment Section */}

                <div className="card">
                  <div className="card-header bg-success text-white">
                    Attachments
                  </div>

                  <div className="card-body">
                    <p className="text-muted">
                      Allowed file types:
                      JPG/JPEG, PNG,
                      WEBP, and PDF.
                      Maximum 5 MB per
                      file and maximum
                      5 active
                      attachments.
                    </p>

                    {attachmentActionMessage && (
                      <div
                        className="alert alert-success"
                        role="status"
                      >
                        {
                          attachmentActionMessage
                        }
                      </div>
                    )}

                    {attachmentActionError && (
                      <div
                        className="alert alert-danger"
                        role="alert"
                      >
                        {
                          attachmentActionError
                        }
                      </div>
                    )}

                    <div className="row g-2 align-items-end mb-4">
                      <div className="col-md-9">
                        <label
                          className="form-label"
                          htmlFor="detail-attachment"
                        >
                          Add Attachment
                        </label>

                        <input
                          id="detail-attachment"
                          type="file"
                          className="form-control"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          onChange={
                            handleDetailUploadFileChange
                          }
                          disabled={
                            attachmentActionState ===
                            "working"
                          }
                        />

                        {detailAttachmentError && (
                          <div
                            className="text-danger mt-1"
                            role="alert"
                          >
                            {
                              detailAttachmentError
                            }
                          </div>
                        )}

                        {detailUploadFile &&
                          !detailAttachmentError && (
                            <div className="text-success mt-1">
                              Selected:{" "}
                              {
                                detailUploadFile.name
                              }
                            </div>
                          )}
                      </div>

                      <div className="col-md-3 d-grid">
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={
                            handleDetailUpload
                          }
                          disabled={
                            !detailUploadFile ||
                            attachmentActionState ===
                              "working"
                          }
                        >
                          {attachmentActionState ===
                          "working"
                            ? "Working..."
                            : "Upload Attachment"}
                        </button>
                      </div>
                    </div>

                    {attachmentState ===
                      "loading" && (
                      <div
                        className="alert alert-info"
                        role="status"
                      >
                        Loading
                        Attachments...
                      </div>
                    )}

                    {attachmentState ===
                      "error" && (
                      <div
                        className="alert alert-danger"
                        role="alert"
                      >
                        Unable to load
                        Attachments.
                      </div>
                    )}

                    {attachmentState ===
                      "ready" &&
                      ticketAttachments.length ===
                        0 && (
                        <div className="alert alert-secondary">
                          No Attachments
                          have been added
                          to this Ticket.
                        </div>
                      )}

                    {attachmentState ===
                      "ready" &&
                      ticketAttachments.length >
                        0 && (
                        <div className="d-grid gap-3">
                          {ticketAttachments.map(
                            (
                              attachment
                            ) => (
                              <div
                                key={
                                  attachment.id
                                }
                                className="border rounded p-3"
                              >
                                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                                  <div>
                                    <div className="fw-semibold">
                                      {
                                        attachment.originalName
                                      }
                                    </div>

                                    <div className="small text-muted">
                                      {
                                        attachment.mimeType
                                      }{" "}
                                      •{" "}
                                      {formatBytes(
                                        attachment.sizeBytes
                                      )}
                                    </div>

                                    <div className="small text-muted">
                                      Added:{" "}
                                      {formatDate(
                                        attachment.createdAt
                                      )}
                                    </div>
                                  </div>

                                  {attachment.isRemoved ? (
                                    <span className="badge text-bg-secondary">
                                      Removed
                                    </span>
                                  ) : (
                                    <span className="badge text-bg-success">
                                      Active
                                    </span>
                                  )}
                                </div>

                                {attachment.isRemoved ? (
                                  <div className="alert alert-light border mt-3 mb-0">
                                    <div>
                                      <strong>
                                        Removed
                                      </strong>
                                    </div>

                                    {attachment.removedAt && (
                                      <div className="small">
                                        Removed at:{" "}
                                        {formatDate(
                                          attachment.removedAt
                                        )}
                                      </div>
                                    )}

                                    <div className="small">
                                      Reason:{" "}
                                      {attachment.removalReason ||
                                        "Not available"}
                                    </div>

                                    <div className="small text-muted mt-1">
                                      Removed
                                      attachments
                                      remain visible
                                      as metadata but
                                      cannot be
                                      downloaded.
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-3">
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                      <button
                                        type="button"
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() =>
                                          handleDownloadAttachment(
                                            attachment
                                          )
                                        }
                                        disabled={
                                          attachmentActionState ===
                                          "working"
                                        }
                                      >
                                        Download
                                      </button>
                                    </div>

                                    <label
                                      className="form-label"
                                      htmlFor={`removal-reason-${attachment.id}`}
                                    >
                                      Removal
                                      Reason{" "}
                                      <span className="text-danger">
                                        *
                                      </span>
                                    </label>

                                    <div className="d-flex flex-column flex-md-row gap-2">
                                      <input
                                        id={`removal-reason-${attachment.id}`}
                                        className="form-control"
                                        placeholder="Explain why this attachment is being removed"
                                        value={
                                          removalReasons[
                                            attachment
                                              .id
                                          ] ??
                                          ""
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setRemovalReasons(
                                            (
                                              current
                                            ) => ({
                                              ...current,
                                              [attachment.id]:
                                                event
                                                  .target
                                                  .value,
                                            })
                                          )
                                        }
                                      />

                                      <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={() =>
                                          handleRemoveAttachment(
                                            attachment
                                          )
                                        }
                                        disabled={
                                          attachmentActionState ===
                                          "working"
                                        }
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </>
            )}
        </section>
      )}

      {/* =====================================================
          CREATE TICKET
      ====================================================== */}

      {screen === "create" && (
        <section>
          <h2 className="h4 mb-4">
            Create Ticket
          </h2>

          {referenceState ===
            "loading" && (
            <div
              className="alert alert-info"
              role="status"
            >
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

                <div className="mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() =>
                      openTicketDetail(
                        createdTicket.id
                      )
                    }
                  >
                    View Ticket Detail
                  </button>
                </div>
              </div>
            )}

          {createAttachmentWarning && (
            <div
              className="alert alert-warning"
              role="alert"
            >
              {
                createAttachmentWarning
              }
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
                  className="form-control bg-light"
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
                  className="form-control bg-light"
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
                  className="form-control bg-light"
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
                  value={summary}
                  onChange={(
                    event
                  ) =>
                    setSummary(
                      event.target
                        .value
                    )
                  }
                  maxLength={120}
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
                  maxLength={2000}
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