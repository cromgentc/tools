import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { applyAdminSettings } from "./components/Settings";

// 🔥 IMPORTANT FIX (recorder-js ke liye)
window.global = window;
applyAdminSettings();

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </BrowserRouter>
);
