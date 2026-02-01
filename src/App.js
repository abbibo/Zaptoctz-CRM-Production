// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CombinedInstallPrompt from "./CombinedInstallPrompt"; // Import the combined prompt component
import Login from "./pages/Login";
import AdminDashboard from "./components/Admin/AdminDashboard";
import Logs from "./components/Admin/Logs";
import AddMember from "./components/Admin/AddMember";
import AssignLeads from "./components/Admin/AssignLeads";
import AddTemplate from "./components/Admin/AddTemplate";
import MemberLogs from "./components/Admin/MemberLogs";
import AssignMembersToManager from "./components/Admin/AssignMembersToManager";
import AllLeads from "./components/Admin/AllLeads";
import AllMembers from "./components/Admin/AllMembers";
import ManagerDashboard from "./components/Manager/ManagerDashboard";
import Members from "./components/Manager/Members"; // Manager Members Page
import AssignLeadsManager from "./components/Manager/AssignLeads"; // Manager Assign Leads Page
import UserPerformanceDashboard from "./components/Manager/UserPerformanceDashboard"; // Manager Assign Leads Page
import MemberDashboard from "./components/Member/MemberDashboard";
import Onboarding from "./components/Member/Onboarding";
import AllLeadsForMember from "./components/Member/AllLeads";
import SalesCheck from "./components/Member/SalesCheck";
import AddLead from "./components/Member/AddLead";
import ProtectedRoute from "./components/Shared/ProtectedRoute";
import Navbar from "./components/Shared/Navbar"; // Shared Navbar 

function App() {
  return (
    <Router>
      {/* CombinedInstallPrompt handles both Android and iOS installation prompts/instructions */}
      <CombinedInstallPrompt />

      <Navbar /> {/* Shared Navbar for Global Navigation */}

      <Routes>
        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/add-member"
          element={
            <ProtectedRoute role="admin">
              <AddMember />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/assign-leads"
          element={
            <ProtectedRoute role="admin">
              <AssignLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/add-template"
          element={
            <ProtectedRoute role="admin">
              <AddTemplate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/assign-members-to-manager"
          element={
            <ProtectedRoute role="admin">
              <AssignMembersToManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/all-leads"
          element={
            <ProtectedRoute role="admin">
              <AllLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/all-members"
          element={
            <ProtectedRoute role="admin">
              <AllMembers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/member-logs"
          element={
            <ProtectedRoute role="admin">
              <MemberLogs />
            </ProtectedRoute>
          }
        />
                <Route
          path="/admin-dashboard/logs"
          element={
            <ProtectedRoute role="admin">
              <Logs />
            </ProtectedRoute>
          }
        />

        {/* Manager Routes */}
        <Route
          path="/manager-dashboard"
          element={
            <ProtectedRoute role="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
                <Route
          path="/manager-new"
          element={
            <ProtectedRoute role="manager">
              <UserPerformanceDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/members"
          element={
            <ProtectedRoute role="manager">
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/assign-leads"
          element={
            <ProtectedRoute role="manager">
              <AssignLeadsManager />
            </ProtectedRoute>
          }
        />

        {/* Member Routes */}
        <Route
          path="/member-dashboard"
          element={
            <ProtectedRoute role="member">
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member-onboarding"
          element={
            <ProtectedRoute role="member">
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member-dashboard/all-leads"
          element={
            <ProtectedRoute role="member">
              <AllLeadsForMember />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member-dashboard/add-leads"
          element={
            <ProtectedRoute role="member">
              <AddLead />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member-dashboard/sales-check"
          element={
            <ProtectedRoute role="member">
              <SalesCheck />
            </ProtectedRoute>
          }
        />

        {/* Catch-All Route */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
