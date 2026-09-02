import { useEffect, useState } from "react";
import {
  DevelopmentRequester,
  getRequesters,
} from "./api.js";

type RequesterState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export default function App() {
  const [requesters, setRequesters] =
    useState<DevelopmentRequester[]>([]);

  const [selectedRequesterId, setSelectedRequesterId] =
    useState("");

  const [currentRequester, setCurrentRequester] =
    useState<DevelopmentRequester | null>(null);

  const [requesterState, setRequesterState] =
    useState<RequesterState>("loading");

  // ---------------------------------------------------------
  // Load active Development Requesters from the backend
  // ---------------------------------------------------------
  useEffect(() => {
    async function loadRequesters() {
      try {
        setRequesterState("loading");

        const data = await getRequesters();

        setRequesters(data);

        if (data.length === 0) {
          setRequesterState("empty");
          return;
        }

        setRequesterState("ready");

        // Restore temporary Lab 2 Requester context
        const storedRequesterId =
          sessionStorage.getItem(
            "developmentRequesterId"
          );

        if (storedRequesterId) {
          const storedRequester = data.find(
            (requester) =>
              requester.id ===
              Number(storedRequesterId)
          );

          if (storedRequester) {
            setSelectedRequesterId(
              storedRequesterId
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
        setRequesters([]);
        setRequesterState("error");
      }
    }

    loadRequesters();
  }, []);

  // ---------------------------------------------------------
  // Continue with selected Requester
  // ---------------------------------------------------------
  function handleContinue() {
    const requester = requesters.find(
      (item) =>
        item.id ===
        Number(selectedRequesterId)
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

  // ---------------------------------------------------------
  // Change Development Requester
  // ---------------------------------------------------------
  function handleChangeRequester() {
    sessionStorage.removeItem(
      "developmentRequesterId"
    );

    setCurrentRequester(null);
    setSelectedRequesterId("");
  }

  // ---------------------------------------------------------
  // Application after Requester selection
  // ---------------------------------------------------------
  if (currentRequester) {
    return (
      <main
        className="container py-5"
        style={{ maxWidth: 960 }}
      >
        <h1 className="h3 mb-4">
          TokTickIT{" "}
          <span className="text-success">
            IT Service Desk
          </span>
        </h1>

        <div className="alert alert-success">
          Current Requester:{" "}
          <strong>
            {currentRequester.name}
          </strong>
        </div>

        <button
          type="button"
          className="btn btn-outline-success"
          onClick={handleChangeRequester}
        >
          Change Requester
        </button>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Development Requester Selection screen
  // ---------------------------------------------------------
  return (
    <main
      className="container py-5"
      style={{ maxWidth: 640 }}
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
        requester-specific ticket behavior. This is not a
        login screen. Authentication and role-based access
        will be introduced in Lab 3.
      </p>

      {requesterState === "loading" && (
        <p aria-live="polite">
          Loading Development Requesters...
        </p>
      )}

      {requesterState === "empty" && (
        <div
          className="alert alert-warning"
          role="status"
        >
          No active Development Requesters are available.
        </div>
      )}

      {requesterState === "error" && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          Unable to load Development Requesters.
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
          value={selectedRequesterId}
          onChange={(event) =>
            setSelectedRequesterId(
              event.target.value
            )
          }
          disabled={
            requesterState !== "ready"
          }
        >
          <option value="">
            Select a Requester
          </option>

          {requesters.map((requester) => (
            <option
              key={requester.id}
              value={requester.id}
            >
              {requester.name} (
              {requester.email})
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn btn-success"
        onClick={handleContinue}
        disabled={
          requesterState !== "ready" ||
          selectedRequesterId === ""
        }
      >
        Continue
      </button>
    </main>
  );
}