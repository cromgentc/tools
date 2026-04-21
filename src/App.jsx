import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./components/Login";
import RecordingPage from "./components/Recording";
import AdminDashboard from "./components/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>

        <Route path="/" element={<Auth />} />

        <Route
          path="/recording"
          element={
            <ProtectedRoute role={["user", "vendor"]}>
              <RecordingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </>
  );
}

export default App;
