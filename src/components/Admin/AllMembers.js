import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
} from "firebase/firestore";

const AdminMembersDashboard = () => {
  const [members, setMembers] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]); // For bulk actions
  const [reassignTo, setReassignTo] = useState("");
  const [reassignDate, setReassignDate] = useState("");
  const [kpiData, setKpiData] = useState({
    total: 0,
    pending: 0,
    interested: 0,
    contacted: 0,
  });
  const [activeKPI, setActiveKPI] = useState("Pending");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] = useState(false);
  const [showBulkUnassignConfirmation, setShowBulkUnassignConfirmation] = useState(false); // New state for bulk unassign

  // Fetch Active Members on Component Mount
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // **1. Modify the query to fetch only active members**
        const membersQuery = query(
          collection(db, "members"),
          where("status", "==", "active") // Assuming 'status' field indicates active members
        );
        const snapshot = await getDocs(membersQuery);
        const membersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersData);

        // Create a map for quick lookup of member names by ID
        const map = {};
        membersData.forEach((member) => {
          map[member.id] = member.name;
        });
        setMembersMap(map);
      } catch (err) {
        console.error("Error fetching members:", err);
        setErrorMessage("Failed to fetch members.");
      }
    };
    fetchMembers();
  }, []);

  // Fetch Leads for Selected Member
  const fetchLeads = async (memberId) => {
    try {
      const q = query(collection(db, "leads"), where("assignedTo", "==", memberId));
      const snapshot = await getDocs(q);
      const leadsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);
      setSelectedMember(memberId);

      // Calculate KPIs
      const total = leadsData.length;
      const pending = leadsData.filter((lead) => lead.status === "Pending").length;
      const interested = leadsData.filter((lead) => lead.status === "Interested").length;
      const contacted = leadsData.filter((lead) => lead.status !== "Pending").length;

      setKpiData({ total, pending, interested, contacted });
      filterLeads(leadsData, "Pending"); // Default filter
      setSelectedLeads([]); // Reset selected leads on member change
    } catch (err) {
      console.error("Error fetching member leads:", err);
      setErrorMessage("Failed to fetch leads for the selected member.");
    }
  };

  // Filter Leads Based on KPI
  const filterLeads = (leadsData, status) => {
    let filtered = [];
    if (status === "All") {
      filtered = leadsData;
    } else if (status === "Contacted") {
      filtered = leadsData.filter((lead) => lead.status !== "Pending");
    } else if (status === "Interested") {
      filtered = leadsData.filter((lead) => lead.status === "Interested");
    } else if (status === "Pending") {
      filtered = leadsData.filter((lead) => lead.status === "Pending");
    }
    setFilteredLeads(filtered);
    setActiveKPI(status);
    setSelectedLeads([]); // Reset selected leads on filter change
  };

  // Handle Lead Selection
  const handleSelectLead = (leadId) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter((id) => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  // Handle Select All Leads
  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  // Handle Bulk Reassign
  const handleBulkReassign = async () => {
    if (!reassignTo || !reassignDate) {
      setErrorMessage("Please select a member and assignment date for bulk reassignment.");
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        const lead = leads.find((l) => l.id === leadId);

        batch.update(leadRef, {
          assignedTo: reassignTo,
          assignedToName: membersMap[reassignTo],
          dateAssigned: reassignDate,
          status: "Pending",
          notes: [
            ...(lead.notes || []),
            {
              text: `Bulk reassigned to ${membersMap[reassignTo]} on ${reassignDate}`,
              status: "Pending",
              date: new Date().toISOString(),
            },
          ],
        });
      });

      await batch.commit();

      // Update local state
      const updatedLeads = leads.map((lead) =>
        selectedLeads.includes(lead.id)
          ? {
              ...lead,
              assignedTo: reassignTo,
              assignedToName: membersMap[reassignTo],
              dateAssigned: reassignDate,
              status: "Pending",
            }
          : lead
      );
      setLeads(updatedLeads);
      filterLeads(updatedLeads, activeKPI);

      setSuccessMessage("Selected leads have been reassigned successfully.");
      setSelectedLeads([]);
      setReassignTo("");
      setReassignDate("");
      setShowBulkReassignModal(false);
      setErrorMessage("");
    } catch (err) {
      console.error("Error during bulk reassignment:", err);
      setErrorMessage("Failed to bulk reassign leads. Please try again.");
    }
  };

  // Handle Bulk Delete
  const handleBulkDelete = async () => {
    try {
      const batch = writeBatch(db);
      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        batch.delete(leadRef);
      });

      await batch.commit();

      // Update local state
      const remainingLeads = leads.filter((lead) => !selectedLeads.includes(lead.id));
      setLeads(remainingLeads);
      const remainingFilteredLeads = filteredLeads.filter(
        (lead) => !selectedLeads.includes(lead.id)
      );
      setFilteredLeads(remainingFilteredLeads);
      setSelectedLeads([]);
      setKpiData((prevKpi) => ({
        ...prevKpi,
        total: prevKpi.total - selectedLeads.length,
        pending:
          prevKpi.pending -
          filteredLeads.filter(
            (lead) => selectedLeads.includes(lead.id) && lead.status === "Pending"
          ).length,
        interested:
          prevKpi.interested -
          filteredLeads.filter(
            (lead) => selectedLeads.includes(lead.id) && lead.status === "Interested"
          ).length,
        contacted:
          prevKpi.contacted -
          filteredLeads.filter(
            (lead) => selectedLeads.includes(lead.id) && lead.status !== "Pending"
          ).length,
      }));
      setSuccessMessage("Selected leads have been deleted successfully.");
      setShowBulkDeleteConfirmation(false);
      setErrorMessage("");
    } catch (err) {
      console.error("Error during bulk deletion:", err);
      setErrorMessage("Failed to bulk delete leads. Please try again.");
    }
  };

  // Handle Bulk Unassign
  const handleBulkUnassign = async () => {
    try {
      const batch = writeBatch(db);
      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        const lead = leads.find((l) => l.id === leadId);

        batch.update(leadRef, {
          assignedTo: "",
          assignedToName: "",
          dateAssigned: "",
          status: "Unassigned",
          notes: [
            ...(lead.notes || []),
            {
              text: `Bulk unassigned on ${new Date().toISOString()}`,
              status: "Unassigned",
              date: new Date().toISOString(),
            },
          ],
        });
      });

      await batch.commit();

      // Update local state
      const updatedLeads = leads.map((lead) =>
        selectedLeads.includes(lead.id)
          ? {
              ...lead,
              assignedTo: "",
              assignedToName: "",
              dateAssigned: "",
              status: "Unassigned",
            }
          : lead
      );
      setLeads(updatedLeads);
      filterLeads(updatedLeads, activeKPI);

      setSuccessMessage("Selected leads have been unassigned successfully.");
      setSelectedLeads([]);
      setShowBulkUnassignConfirmation(false);
      setErrorMessage("");
    } catch (err) {
      console.error("Error during bulk unassigning:", err);
      setErrorMessage("Failed to bulk unassign leads. Please try again.");
    }
  };

  // Handle Bulk Reassign Modal Close
  const closeBulkReassignModal = () => {
    setShowBulkReassignModal(false);
    setReassignTo("");
    setReassignDate("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Handle Bulk Delete Confirmation Close
  const closeBulkDeleteConfirmation = () => {
    setShowBulkDeleteConfirmation(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Handle Bulk Unassign Confirmation Close
  const closeBulkUnassignConfirmation = () => {
    setShowBulkUnassignConfirmation(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Format Date Utility
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US");
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-100 tracking-wide">
        Admin Agents Dashboard
      </h1>

      {/* Success and Error Messages */}
      {successMessage && (
        <div className="mb-4 text-center">
          <p className="text-green-500">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 text-center">
          <p className="text-red-500">{errorMessage}</p>
        </div>
      )}

      {/* Back Button */}
      {selectedMember && (
        <button
          onClick={() => setSelectedMember(null)}
          className="mb-6 bg-red-600 px-6 py-2 rounded shadow-md hover:bg-red-700 transition font-bold"
        >
          Back to All Agents
        </button>
      )}

      {/* Members List */}
      {!selectedMember && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-gray-800 p-6 rounded shadow-lg hover:shadow-xl cursor-pointer hover:bg-gray-700 transition flex flex-col justify-center items-start"
              onClick={() => fetchLeads(member.id)}
            >
              <h2 className="text-2xl font-bold mb-2 text-gray-100">{member.name}</h2>
              <p className="text-sm text-gray-400">Email: {member.email}</p>
              <p className="text-sm text-gray-400">Password: {member.password}</p>
              {member.role && (
                <p className="mt-1 text-xs text-gray-500 uppercase font-bold">
                  {member.role}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Leads Dashboard */}
      {selectedMember && (
        <>
          {/* KPI Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6 mt-6">
            {[
              { label: "All", value: kpiData.total },
              { label: "Contacted", value: kpiData.contacted },
              { label: "Pending", value: kpiData.pending },
              { label: "Interested", value: kpiData.interested },
            ].map((kpi) => (
              <div
                key={kpi.label}
                onClick={() => filterLeads(leads, kpi.label)}
                className={`p-6 rounded shadow-lg text-center cursor-pointer transition transform hover:scale-105 hover:bg-gray-700 ${
                  activeKPI === kpi.label ? "bg-blue-600" : "bg-gray-800"
                }`}
              >
                <p className="text-sm text-gray-100 font-bold uppercase">{kpi.label} Leads</p>
                <p className="text-3xl font-extrabold text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
            <div className="flex space-x-4">
              {/* Bulk Reassign Button */}
              <button
                onClick={() => {
                  if (selectedLeads.length === 0) {
                    setErrorMessage("Please select at least one lead to reassign.");
                  } else {
                    setShowBulkReassignModal(true);
                  }
                }}
                className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition font-bold"
              >
                Bulk Reassign
              </button>
              {/* Bulk Unassign Button */}
              <button
                onClick={() => {
                  if (selectedLeads.length === 0) {
                    setErrorMessage("Please select at least one lead to unassign.");
                  } else {
                    setShowBulkUnassignConfirmation(true);
                  }
                }}
                className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600 transition font-bold"
              >
                Bulk Unassign
              </button>
              {/* Bulk Delete Button */}
              <button
                onClick={() => {
                  if (selectedLeads.length === 0) {
                    setErrorMessage("Please select at least one lead to delete.");
                  } else {
                    setShowBulkDeleteConfirmation(true);
                  }
                }}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold"
              >
                Bulk Delete
              </button>
            </div>
            {/* Display count of selected leads */}
            {selectedLeads.length > 0 && (
              <div className="text-gray-300">
                {selectedLeads.length} lead(s) selected
              </div>
            )}
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">
              Leads for {membersMap[selectedMember]}
            </h2>
            <table className="min-w-full bg-gray-800 rounded shadow-lg text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        selectedLeads.length === filteredLeads.length &&
                        filteredLeads.length > 0
                      }
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="p-4 text-gray-300 font-bold uppercase text-sm">Lead Name</th>
                  <th className="p-4 text-gray-300 font-bold uppercase text-sm">Phone</th>
                  <th className="p-4 text-gray-300 font-bold uppercase text-sm">Status</th>
                  <th className="p-4 text-gray-300 font-bold uppercase text-sm">Assigned Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={`cursor-pointer hover:bg-gray-700 transition ${
                      index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"
                    }`}
                    // Optional: You can remove the onClick if you don't want to view details individually
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">{lead.leadName}</td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">{lead.phone}</td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">{lead.status}</td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">
                      {formatDate(lead.dateAssigned)}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-400">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Bulk Reassign Modal */}
      {showBulkReassignModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Bulk Reassign Leads</h2>
            <div className="mb-4">
              <label className="block mb-2 text-gray-300">Reassign To:</label>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Agent --</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-gray-300">Assignment Date:</label>
              <input
                type="date"
                value={reassignDate}
                onChange={(e) => setReassignDate(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={closeBulkReassignModal}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReassign}
                className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition font-bold text-sm"
              >
                Reassign Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Unassign Confirmation Modal */}
      {showBulkUnassignConfirmation && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Confirm Bulk Unassign</h2>
            <p className="text-gray-300 mb-4">
              Are you sure you want to unassign the selected leads? This action cannot be undone.
            </p>
            <div className="flex justify-between">
              <button
                onClick={closeBulkUnassignConfirmation}
                className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 transition font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUnassign}
                className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600 transition font-bold text-sm"
              >
                Unassign Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirmation && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-100">Confirm Bulk Delete</h2>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete the selected leads? This action cannot be undone.
            </p>
            <div className="flex justify-between">
              <button
                onClick={closeBulkDeleteConfirmation}
                className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 transition font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembersDashboard;
