import { useEffect, useState } from "react";

import {
  Category,
  CreatedTicket,
  DevelopmentRequester,
  getCategories,
  getRelatedSystems,
  getRequesters,
  RelatedSystem,
  RequestedPriority,
  createTicket,
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

const MAX_ATTACHMENT_SIZE =
  5 * 1024 * 1024;

const MAX_ATTACHMENTS = 5;

const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function App() {
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
    useState<CreatedTicket | null>(null);

  const [errors, setErrors] =
    useState<Record<string, string>>(
      {}
    );

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

        if (storedId) {
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
        setReferenceState("loading");

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
  // Requester selection
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

    setCurrentRequester(requester);
  }

  function handleChangeRequester() {
    sessionStorage.removeItem(
      "developmentRequesterId"
    );

    setCurrentRequester(null);

    setSelectedRequesterId("");

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
  // Attachment validation
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
  // Form validation
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
  // Create Ticket
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
      // Preserve entered values
      // when the API fails.
      setSubmitState("error");
    }
  }

  // ---------------------------------------------------------
  // Development Requester Selection Screen
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
          Select a Development
          Requester
        </h2>

        <p className="text-muted">
          Select a Development
          Requester to test
          requester-specific ticket
          behavior. This is not a
          login screen.
          Authentication and
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
            Unable to load
            Development Requesters.
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
                  {
                    requester.name
                  }{" "}
                  (
                  {
                    requester.email
                  }
                  )
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
  // Create Ticket Screen
  // ---------------------------------------------------------

  return (
    <main
      className="container py-5"
      style={{
        maxWidth: 960,
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4">
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

      <h2 className="h4 mb-4">
        Create Ticket
      </h2>

      {referenceState ===
        "loading" && (
        <div className="alert alert-info">
          Loading ticket reference
          data...
        </div>
      )}

      {referenceState ===
        "error" && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          Unable to load Categories
          or Related Systems.
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
        onSubmit={handleSubmit}
      >
        <div className="row g-3">
          {/* Ticket Number */}

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

          {/* Ticket Date */}

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

          {/* Requester */}

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

          {/* Category */}

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
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value
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
                {errors.category}
              </div>
            )}
          </div>

          {/* Related System */}

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
              onChange={(event) =>
                setRelatedSystemId(
                  event.target.value
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
                    {system.name}
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

          {/* Summary */}

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
              onChange={(event) =>
                setSummary(
                  event.target.value
                )
              }
              maxLength={120}
            />

            {errors.summary && (
              <div className="text-danger">
                {errors.summary}
              </div>
            )}
          </div>

          {/* Priority */}

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
              onChange={(event) =>
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
                {errors.priority}
              </div>
            )}
          </div>

          {/* Description */}

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
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
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

          {/* Attachments */}

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
                {attachmentError}
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
    </main>
  );
}