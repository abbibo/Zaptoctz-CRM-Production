import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="p-4 bg-gray-800 text-white">
      <div className="flex space-x-4">
        <Link
          to="/manager-dashboard"
          className={`p-2 rounded ${
            location.pathname === "/manager-dashboard" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          Dashboard
        </Link>
        <Link
          to="/manager/members"
          className={`p-2 rounded ${
            location.pathname === "/manager/members" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          Agents
        </Link>
        <Link
          to="/manager/assign-leads"
          className={`p-2 rounded ${
            location.pathname === "/manager/assign-leads" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          Assign Leads
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
