import { Navigate } from "react-router-dom";
import { useMemo } from "react";

export default function ProtectedRoute({ children, role }) {
  const user = useMemo(() => {
    try {
      const userData = localStorage.getItem("userInfo");
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error("Failed to parse user info:", err);
      return null;
    }
  }, []);

  // No user - redirect to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];

  // User exists but role doesn't match - redirect to login
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // User authenticated and role matches - render children
  return children;
}
