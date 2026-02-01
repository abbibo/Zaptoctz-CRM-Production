import React from "react";
import { Navigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";

const ProtectedRoute = ({ children, role }) => {
  const { user, role: userRole, loading } = useFirebase();

  if (loading) return <div className="text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  // If the user's role doesn't match the required role, redirect them to their respective dashboard
  if (role && userRole !== role) {
    if (userRole === "admin") return <Navigate to="/admin-dashboard" />;
    if (userRole === "manager") return <Navigate to="/manager-dashboard" />;
    if (userRole === "member") return <Navigate to="/member-dashboard" />;
    // Fallback if role is not recognized or claim is missing yet
    return <div className="text-white">Access Denied</div>; 
  }

  return children;
};

export default ProtectedRoute;
