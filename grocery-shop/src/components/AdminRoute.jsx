import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // ✅ must be admin
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  // ✅ must be verified for admin access
  if (!user.emailVerified) return <Navigate to="/account" replace />;

  return children;
}
