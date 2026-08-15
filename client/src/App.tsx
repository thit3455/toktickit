import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;
  void setCategories;

  async function handleCheck() {
    setState("loading");

    try {
      await checkSystem();
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <p className="mt-4">
          System Status: <span className="text-success">Online</span>
        </p>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p>
            System Status: <span className="text-danger">Offline</span>
          </p>
          <p className="text-danger">Unable to connect to TokTickIT API</p>
        </div>
      )}
    </div>
  );
}