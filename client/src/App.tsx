import { StaffTicketQueue } from "./StaffTicketQueue";
import { AdminUserManagement } from "./AdminUserManagement";
import "./Requester.css";
import { LoginScreen } from "./LoginScreen.js";
import { TicketDiscussion } from "./TicketDiscussion.js";
import { useEffect, useState } from "react";

import {
  Category,
  CreatedTicket,
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
  getTicketAttachments,
  getTicketDetail,
  getStaffTicketDetail,
  claimStaffTicket,
  getActiveStaffUsers,
  reassignStaffTicket,
  ActiveStaffUser,
  updateStaffTicketPriority,
  updateStaffTicketStatus,
  removeAttachment,
  uploadTicketAttachment,
  TicketStatus,
  getCurrentUser,
  logout,
  indicateResolution,
  changePassword,
} from "./api.js";


type UserRole =
  | "REQUESTER"
  | "IT_STAFF"
  | "ADMINISTRATOR";

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
  | "ticketDetail"
  | "staffQueue"
  | "adminUsers";

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

function requesterFailure(error: unknown, fallback: string) {
  const status = (error as { status?: number } | null)?.status;
  if (status === 401) return "Your session has expired. Please log out and log in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested item was not found.";
  if (status === 409) return "This item has changed. Refresh and try again.";
  return fallback;
}

export default function App() {

  // =========================================================
// Authentication
// =========================================================

const [currentUser, setCurrentUser] =
  useState<{
    id: number;
    name: string;
    email: string;
    role: UserRole;
    mustChangePassword: boolean;
  } | null>(null);


const [currentPassword, setCurrentPassword] =
  useState("");

const [newPassword, setNewPassword] =
  useState("");

const [confirmPassword, setConfirmPassword] =
  useState("");

const [passwordChangeError, setPasswordChangeError] =
  useState("");

const [passwordChangeBusy, setPasswordChangeBusy] =
  useState(false);
  // =========================================================
  const currentRequester = currentUser?.role === "REQUESTER" ? currentUser : null;
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [resolutionBusy, setResolutionBusy] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [createError, setCreateError] = useState("");

  const [screen, setScreen] =
    useState<Screen>("create");

    // =========================================================
  // IT Staff Ticket Queue
  // =========================================================

const [staffActionStatus, setStaffActionStatus] =
  useState("");

const [staffActionPriority, setStaffActionPriority] =
  useState("");

const [staffActionMessage, setStaffActionMessage] = useState("");
const [staffActionBusy, setStaffActionBusy] = useState(false);
const [activeStaffUsers, setActiveStaffUsers] = useState<ActiveStaffUser[]>([]);
const [staffUsersState, setStaffUsersState] = useState<"loading" | "ready" | "error">("loading");
const [staffUsersError, setStaffUsersError] = useState("");
const [staffUsersRetry, setStaffUsersRetry] = useState(0);
const [reassignTo, setReassignTo] = useState("");


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
  ] = useState<"" | TicketStatus>("");

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
  // Restore only the server-authenticated identity.
  useEffect(() => {
    let active = true;
    getCurrentUser().then(user => { if (active) setCurrentUser(user); })
      .catch(() => { if (active) setAuthError("Unable to restore your session. Please log in again."); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

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

    let active = true;
    async function loadTickets() {
      try {
        setTicketListState(
          "loading"
        );

        const result =
          await getMyTickets({
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

        if (!active) return;
        setTickets(result.data);

        setPagination(
          result.pagination
        );

        setTicketListState(
          "ready"
        );
      } catch (error) {
        if (!active) return;
        setListError(requesterFailure(error, "Unable to load My Tickets."));
        setTicketListState(
          "error"
        );
      }
    }

    loadTickets();
    return () => { active = false; };
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
    if (screen !== "ticketDetail" || currentUser?.role !== "IT_STAFF" || selectedTicketId === null) return;
    let active = true;
    setReassignTo("");
    setStaffUsersState("loading");
    setStaffUsersError("");
    getActiveStaffUsers().then(users => {
      if (active) { setActiveStaffUsers(users); setStaffUsersState("ready"); }
    }).catch(error => {
      if (active) {
        setActiveStaffUsers([]);
        setStaffUsersState("error");
        setStaffUsersError(error instanceof Error ? error.message : "Unable to load active IT Staff.");
      }
    });
    return () => { active = false; };
  }, [screen, currentUser?.role, selectedTicketId, staffUsersRetry]);

  useEffect(() => {
    if (
      screen !== "ticketDetail" ||
      selectedTicketId === null
    ) {
      return;
    }

    const requesterId =
      currentRequester?.id ?? 0;

    const ticketId =
      selectedTicketId;

    setResolutionMessage(""); setResolutionError("");
    let active = true;
    async function loadDetail() {
      try {
        setTicketDetailState(
          "loading"
        );

        setTicketDetail(null);

        let detail;

      if (currentUser?.role === "IT_STAFF") {
    detail =
      await getStaffTicketDetail(
        ticketId
    );
} else {
  detail =
    await getTicketDetail(
      ticketId,
      requesterId ?? 0
    );
}

        if (!active) return;
        setTicketDetail(detail);
        setStaffActionPriority(detail.itPriority ?? "MEDIUM");
        setStaffActionStatus(detail.currentStatus);

        setTicketDetailState(
          "ready"
        );
      } catch (error) {
        if (!active) return;
        setDetailError(requesterFailure(error, "Unable to load this Ticket. It may be unavailable or your session may have expired."));
        setTicketDetailState(
          "error"
        );
      }
    }

    loadDetail();
    return () => { active = false; };
  }, [
    currentRequester,
    currentUser?.role,
    screen,
    selectedTicketId,
    reloadDetailKey,
  ]);
  // =========================================================
  // Load Ticket Attachments
  // =========================================================

  useEffect(() => {
    if (
      screen !== "ticketDetail" ||
      selectedTicketId === null
    ) {
      return;
    }

    const requesterId =
      currentRequester?.id ?? 0;

    const ticketId =
      selectedTicketId;

    let active = true;
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

        if (!active) return;
        setTicketAttachments(
          data
        );

        setAttachmentState(
          "ready"
        );
      } catch {
        if (!active) return;
        setAttachmentState(
          "error"
        );
      }
    }

    loadAttachments();
    return () => { active = false; };
  }, [
    currentRequester,
    screen,
    selectedTicketId,
    reloadDetailKey,
  ]);

  // =========================================================
// Role Routing
// =========================================================

useEffect(() => {
  if (
    currentUser?.role === "IT_STAFF"
  ) {
    setScreen("staffQueue");
  } else if (currentUser?.role === "REQUESTER") {
    setScreen("create");
  } else if (currentUser?.role === "ADMINISTRATOR") {
    setScreen("adminUsers");
  }
}, [
  currentUser,
]);

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
    } catch (error) {
      setCreateError(requesterFailure(error, "Unable to create Ticket."));
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
    setStaffActionMessage("");
    setReassignTo("");
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
  async function handleClaimTicket() {
  if (!ticketDetail || ticketDetail.assignedStaff || ticketDetail.assignedStaffId != null || staffActionBusy) return;
  setStaffActionBusy(true);
  setStaffActionMessage("");
  try {
    const result = await claimStaffTicket(ticketDetail.id);
    setTicketDetail(previous => previous ? { ...previous, ...result.data } : previous);
    setStaffActionMessage("Ticket claimed successfully.");
  } catch (error) {
    setStaffActionMessage(error instanceof Error ? error.message : "Unable to claim ticket. Please try again.");
    // Another staff member may have claimed it since this detail was loaded.
    try { setTicketDetail(await getStaffTicketDetail(ticketDetail.id)); } catch { /* Keep the existing error visible. */ }
  } finally { setStaffActionBusy(false); }
}

async function handleReassignTicket() {
  if (!ticketDetail || !reassignTo || staffActionBusy) return;
  setStaffActionBusy(true);
  setStaffActionMessage("");
  try {
    const result = await reassignStaffTicket(ticketDetail.id, Number(reassignTo));
    setTicketDetail(previous => previous ? { ...previous, ...result.data } : previous);
    setReassignTo("");
    setStaffActionMessage(`Ticket reassigned to ${result.data.assignedStaff.name} successfully.`);
  } catch (error) {
    setStaffActionMessage(error instanceof Error ? error.message : "Unable to reassign ticket. Please try again.");
  } finally { setStaffActionBusy(false); }
}

async function handleStaffUpdate(kind: "priority" | "status") {
  if (!ticketDetail || staffActionBusy) return;
  setStaffActionBusy(true);
  setStaffActionMessage("");
  try {
    const result = kind === "priority"
      ? await updateStaffTicketPriority(ticketDetail.id, staffActionPriority)
      : await updateStaffTicketStatus(ticketDetail.id, staffActionStatus);
    setTicketDetail(previous => previous ? { ...previous, ...result.data } : previous);
    setStaffActionMessage(kind === "priority" ? "IT priority updated successfully." : "Ticket status updated successfully.");
  } catch (error) {
    setStaffActionMessage(error instanceof Error ? error.message : "Unable to update ticket. Please try again.");
  } finally { setStaffActionBusy(false); }
}


async function handleUpdateStatus(
  status: string
) {
 if (!selectedTicketId || !status) {
    return;
  }

  try {
    await updateStaffTicketStatus(
      selectedTicketId,
      status
    );

    setReloadDetailKey(
      (value) => value + 1
    );

  } catch {
    console.error(
      "Unable to update status"
    );
  }
}



  function backToStaffQueue() {
  setScreen("staffQueue");

  setSelectedTicketId(null);

  setTicketDetail(null);

  setTicketAttachments([]);

  resetDetailAttachmentState();


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
        currentRequester?.id ?? 0,
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
      attachment.isRemoved
    ) {
      return;
    }

    try {
      setAttachmentActionError("");

      setAttachmentActionMessage("");

      await downloadAttachmentFile(
        attachment,
        currentRequester?.id ?? 0
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
// Authentication Gate
// =========================================================

if (authLoading) return <main className="container py-5" role="status">Loading session...</main>;
if (!currentUser) {
  return <><LoginScreen onLogin={user => { setAuthError(""); setCurrentUser(user); }} />{authError && <p role="alert">{authError}</p>}</>;
}
if (currentUser.mustChangePassword) {
  return (
    <main
      className="container py-5"
      style={{ maxWidth: 520 }}
    >
      <h1 className="h3 mb-2">
        Change Password
      </h1>

      <p className="text-muted mb-4">
        You are using an initial password.
        Please change it before continuing.
      </p>

      <div className="mb-3">
        <label className="form-label" htmlFor="current-password">
          Current Password
        </label>

        <input
          id="current-password"
          type="password"
          className="form-control"
          value={currentPassword}
          onChange={(e) =>
            setCurrentPassword(e.target.value)
          }
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="new-password">
          New Password
        </label>

        <input
          id="new-password"
          type="password"
          className="form-control"
          value={newPassword}
          onChange={(e) =>
            setNewPassword(e.target.value)
          }
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="confirm-password">
          Confirm New Password
        </label>

        <input
          id="confirm-password"
          type="password"
          className="form-control"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
        />
      </div>

      {passwordChangeError && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {passwordChangeError}
        </div>
      )}

      <button
        type="button"
        className="btn btn-success"
        disabled={passwordChangeBusy}
        onClick={async () => {
          setPasswordChangeError("");

          if (newPassword.length < 8) {
            setPasswordChangeError(
              "New password must be at least 8 characters."
            );
            return;
          }

          if (
            newPassword !== confirmPassword
          ) {
            setPasswordChangeError(
              "New passwords do not match."
            );
            return;
          }

          try {
            setPasswordChangeBusy(true);

            await changePassword(
              currentPassword,
              newPassword
            );

            setCurrentUser({
              ...currentUser,
              mustChangePassword: false,
            });

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          } catch (error) {
            setPasswordChangeError(
              error instanceof Error
                ? error.message
                : "Unable to change password."
            );
          } finally {
            setPasswordChangeBusy(false);
          }
        }}
      >
        {passwordChangeBusy
          ? "Changing..."
          : "Change Password"}
      </button>
    </main>
  );
}


  // Main Application
  // =========================================================

  return (
    <main
      className="container py-5"
      style={{
        overflowWrap: "anywhere",
        maxWidth: 1100,
      }}
    >
      {/* Header */}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="h3 mb-1">
            TokTickIT
          </h1>

          {currentUser?.role !== "IT_STAFF" && (
          <p className="mb-0">
              <strong>
                {currentUser?.name ?? ""}
               </strong>{" "}
               (
               {currentUser?.role ?? ""}
                )
          </p>
          )}
        </div>

       <button type="button" className="btn btn-outline-success" disabled={logoutBusy} onClick={async () => {
         setLogoutBusy(true); setAuthError("");
         try {
           await logout();
           setCurrentUser(null); setScreen("create"); setSelectedTicketId(null);
           setTicketDetail(null); setTickets([]); setTicketAttachments([]);
           resetCreateTicketForm(); resetTicketFilters(); resetDetailAttachmentState();
         } catch { setAuthError("Unable to log out. Please try again."); }
         finally { setLogoutBusy(false); }
       }}>{logoutBusy ? "Logging out..." : "Logout"}</button>
       {authError && <p role="alert" className="text-danger">{authError}</p>}
      </div>

      {/* Navigation */}

      <nav
        className="d-flex flex-wrap gap-2 mb-4"
        aria-label={currentUser.role === "ADMINISTRATOR" ? "Administrator navigation" : "Requester navigation"}
      >
        {currentUser?.role === "REQUESTER" && (
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
        )}
        {currentUser?.role === "REQUESTER" && (
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
        )}
        {currentUser?.role === "IT_STAFF" && (
         <div>
         <button
              type="button"
              className={
                screen === "staffQueue"
                  ? "btn btn-success"
                  : "btn btn-outline-success"
              }
              onClick={() => {
                setScreen(
                  "staffQueue"
                );
              }}
            >
              IT Staff Queue
            </button>
            <p className="text-success mt-2 mb-0">IT Staff - {currentUser.name}</p>
         </div>
        )}

        {currentUser.role === "ADMINISTRATOR" && <button type="button" className="btn btn-success" onClick={() => setScreen("adminUsers")}>User Management</button>}
      </nav>

      {currentUser.role === "ADMINISTRATOR" && screen === "adminUsers" && <AdminUserManagement
        currentUserId={currentUser.id}
        onSelfChange={user => setCurrentUser(previous => previous ? { ...previous, ...user } : previous)}
        onSessionEnded={() => { setCurrentUser(null); setScreen("create"); }}
      />}

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
                  currentRequester?.name ?? ""
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
                          | TicketStatus
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
                    {(["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const).map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
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
                {listError}
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
                <div className="table-responsive requester-tickets">
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
                            <td data-label="Ticket Number">
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

                            <td data-label="Summary">
                              {
                                ticket.summary
                              }
                            </td>

                            <td data-label="Category">
                              {
                                ticket
                                  .category
                                  .name
                              }
                            </td>

                            <td data-label="Related System">
                              {
                                ticket
                                  .relatedSystem
                                  .name
                              }
                            </td>

                            <td data-label="Priority">
                              <span className="badge text-bg-light border">
                                {
                                  ticket.requestedPriority
                                }
                              </span>
                            </td>

                            <td data-label="Status">
                              <span className="badge text-bg-success">
                                {
                                  ticket.currentStatus
                                }
                              </span>
                            </td>

                            <td data-label="Created">
                              {formatDate(
                                ticket.createdAt
                              )}
                            </td>

                            <td data-label="Updated">
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
              {currentUser?.role === "IT_STAFF"
                  ? "IT Staff ticket information and actions."
                  : "Requester-owned Ticket information and attachments."}
            </p>
            </div>

            <button
              type="button"
              className="btn btn-outline-success"
              onClick={
                currentUser?.role === "IT_STAFF"
                  ? backToStaffQueue
                   : backToMyTickets
              }
            >
              {
                 currentUser?.role === "IT_STAFF"
                    ? "Back to IT Staff Queue"
                    : "Back to My Tickets"
              }
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
                {detailError}
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

                {/* =====================================================
    IT STAFF ACTIONS
====================================================== */}

{currentUser?.role === "IT_STAFF" &&
 ticketDetail && (
  <section className="card mb-4">

    <div className="card-header bg-success text-white">
      IT Staff Actions
    </div>

    <div className="card-body">

      {staffActionMessage && <p className="alert alert-info" role="status">{staffActionMessage}</p>}
      <p>Current IT Priority: <strong>{ticketDetail.itPriority ?? "MEDIUM"}</strong></p>
      <p>Current Ticket Status: <strong>{ticketDetail.currentStatus}</strong></p>

      {ticketDetail.requesterResolvedAt && (
        <section className="alert alert-success" aria-label="Requester resolution indication">
          <h4 className="h6">Requester: Problem Appears Resolved</h4>
          <p className="mb-1">Recorded on <time dateTime={ticketDetail.requesterResolvedAt}>{formatDate(ticketDetail.requesterResolvedAt)}</time>.</p>
          <p className="mb-0">This indication does not change the ticket status. IT Staff can use Update Status to formally resolve or close the ticket.</p>
        </section>
      )}

      <p>
        Assigned Staff:
        {" "}
        {
          ticketDetail.assignedStaff?.name
          ?? "Unassigned"
        }
      </p>

      {!ticketDetail.assignedStaff && ticketDetail.assignedStaffId == null && <button
        type="button"
        className="btn btn-success"
        onClick={handleClaimTicket}
        disabled={staffActionBusy}
      >
        Claim Ticket

      </button>}

      {(ticketDetail.assignedStaff || ticketDetail.assignedStaffId != null) && <section className="mt-3 mb-4" aria-labelledby="reassign-ticket-title">
        <h3 id="reassign-ticket-title" className="h6">Reassign Ticket</h3>
        {staffUsersState === "loading" && <p role="status">Loading active IT Staff...</p>}
        {staffUsersState === "error" && <div className="alert alert-danger" role="alert">
          {staffUsersError} <button type="button" className="btn btn-outline-success btn-sm" onClick={() => setStaffUsersRetry(value => value + 1)}>Retry staff list</button>
        </div>}
        <label className="form-label" htmlFor="reassign-staff">Reassign to</label>
        <div className="d-flex flex-column flex-sm-row gap-2">
          <select id="reassign-staff" className="form-select" value={reassignTo} disabled={staffActionBusy || staffUsersState !== "ready"} onChange={event => setReassignTo(event.target.value)}>
            <option value="">Select an active IT Staff member</option>
            {activeStaffUsers.filter(staff => staff.id !== (ticketDetail.assignedStaff?.id ?? ticketDetail.assignedStaffId)).map(staff => <option key={staff.id} value={staff.id}>{staff.name} ({staff.email})</option>)}
          </select>
          <button type="button" className="btn btn-success flex-shrink-0" disabled={staffActionBusy || staffUsersState !== "ready" || !reassignTo} onClick={handleReassignTicket}>Reassign Ticket</button>
        </div>
        {staffUsersState === "ready" && !activeStaffUsers.some(staff => staff.id !== (ticketDetail.assignedStaff?.id ?? ticketDetail.assignedStaffId)) && <p className="text-muted mt-2">No other active IT Staff members are available.</p>}
      </section>}

    <div className="mt-3">
  <label className="form-label" htmlFor="staff-it-priority">
    IT Priority
  </label>

  <select
    className="form-select"
    id="staff-it-priority"
    disabled={staffActionBusy}
    value={staffActionPriority}
    onChange={(e) =>
      setStaffActionPriority(e.target.value)
    }
  >
    <option value="">
      Select IT Priority
    </option>

    <option value="LOW">
      LOW
    </option>

    <option value="MEDIUM">
      MEDIUM
    </option>

    <option value="HIGH">
      HIGH
    </option>

    <option value="URGENT">
      URGENT
    </option>
  </select>

  <button
    type="button"
    className="btn btn-success mt-3"
    disabled={!staffActionPriority || staffActionBusy}
    onClick={() => handleStaffUpdate("priority")}
  >
    Update IT Priority
  </button>
</div>

  <label className="form-label" htmlFor="staff-ticket-status">
    Status
  </label>

  <select
    className="form-select"
    id="staff-ticket-status"
    disabled={staffActionBusy}
    value={staffActionStatus}
    onChange={(e) =>
      setStaffActionStatus(e.target.value)
    }
  >
    <option value="">
      Select Status
    </option>
    {["NEW", "CANCELLED"].includes(staffActionStatus) && <option value={staffActionStatus}>{staffActionStatus}</option>}
    <option value="REOPENED">REOPENED</option>

    <option value="OPEN">
      OPEN
    </option>

    <option value="IN_PROGRESS">
      IN_PROGRESS
    </option>

    <option value="WAITING_FOR_REQUESTER">
      WAITING_FOR_REQUESTER
    </option>

    <option value="RESOLVED">
      RESOLVED
    </option>

    <option value="CLOSED">
      CLOSED
    </option>

  </select>
<button
  type="button"
  className="btn btn-success mt-3"
  disabled={!staffActionStatus || staffActionBusy}
  onClick={() => handleStaffUpdate("status")}
>
  Update Status
</button>
</div>

  </section>
)}

                {currentRequester && <section className="card mb-3" aria-label="Resolution indication">
                  <div className="card-body">
                    <h3 className="h5">Problem Appears Resolved</h3>
                    <p>This tells IT Staff the problem appears resolved. IT Staff remain responsible for formally resolving or closing the ticket.</p>
                    {ticketDetail.requesterResolvedAt ? <p role="status">You indicated that the problem appears resolved on {formatDate(ticketDetail.requesterResolvedAt)}.</p> :
                      <button className="btn btn-success" disabled={resolutionBusy} onClick={async () => {
                        setResolutionBusy(true); setResolutionMessage(""); setResolutionError("");
                        try {
                          const saved = await indicateResolution(ticketDetail.id);
                          setTicketDetail(previous => previous?.id === saved.id ? { ...previous, ...saved } : previous);
                          setResolutionMessage("Resolution indication saved. Ticket status has not changed.");
                        } catch (error) { setResolutionError(error instanceof Error ? error.message : "Unable to save resolution indication."); }
                        finally { setResolutionBusy(false); }
                      }}>{resolutionBusy ? "Saving..." : "Problem Appears Resolved"}</button>}
                    {resolutionMessage && <p role="status" className="text-success mt-2">{resolutionMessage}</p>}
                    {resolutionError && <p role="alert" className="text-danger mt-2">{resolutionError}</p>}
                  </div>
                </section>}
                <TicketDiscussion key={ticketDetail.id} ticketId={ticketDetail.id} staff={currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"} />

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
              IT STAFF TICKET QUEUE
          ====================================================== */}

          {screen === "staffQueue" && <StaffTicketQueue onOpen={openTicketDetail} />}

      {/* =====================================================
          CREATE TICKET
      ====================================================== */}
      {currentUser.role === "REQUESTER" && screen === "create" && (
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
              {createError}{" "}
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
                    currentRequester?.name ?? ""
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
