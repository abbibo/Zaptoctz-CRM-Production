import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  doc,
  writeBatch, // Added import
} from "firebase/firestore";

const AllLeads = () => {
  const [leads, setLeads] = useState([]);
  const [members, setMembers] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedKpi, setSelectedKpi] = useState("All");
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newDateAssigned, setNewDateAssigned] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bulkAssignMember, setBulkAssignMember] = useState("");
  const [bulkAssignDate, setBulkAssignDate] = useState("");

  useEffect(() => {
    const fetchLeadsAndMembers = async () => {
      try {
        // Fetch Leads
        const leadsSnapshot = await getDocs(collection(db, "leads"));
        const leadsData = leadsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLeads(leadsData);
        setFilteredLeads(leadsData);

        // Fetch Active Members Only
        const membersSnapshot = await getDocs(
          query(
            collection(db, "members"),
            where("role", "==", "member"),
            where("status", "==", "active") // Assuming 'status' field indicates active members
          )
        );
        const membersData = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersData);
      } catch (err) {
        console.error("Error fetching leads or members:", err);
      }
    };

    fetchLeadsAndMembers();
  }, []);

  const filterLeadsByKpi = (kpi) => {
    setSelectedKpi(kpi);
    let filtered = [];
    if (kpi === "All") {
      filtered = leads;
    } else if (kpi === "Pending") {
      filtered = leads.filter((lead) => lead.status === "Pending");
    } else if (kpi === "Contacted") {
      filtered = leads.filter((lead) => lead.status !== "Pending");
    } else if (kpi === "Interested") {
      filtered = leads.filter((lead) => lead.status === "Interested");
    } else if (kpi === "Unassigned") {
      filtered = leads.filter((lead) => !lead.assignedTo || lead.assignedTo === "");
    }
    setFilteredLeads(filtered);
    setSelectedLeads([]);
  };

  const handleReassign = async () => {
    if (!selectedLead || !newAssignedTo || !newDateAssigned) {
      setErrorMessage("Please fill all fields before reassigning.");
      return;
    }

    try {
      const leadRef = doc(db, "leads", selectedLead.id);
      await updateDoc(leadRef, {
        assignedTo: newAssignedTo,
        assignedToName: members.find((m) => m.id === newAssignedTo)?.name || "Unknown",
        dateAssigned: newDateAssigned,
        status: "Pending",
        notes: [
          ...(selectedLead.notes || []),
          {
            text: `Reassigned to ${
              members.find((m) => m.id === newAssignedTo)?.name || "Unknown"
            } on ${newDateAssigned}`,
            date: new Date().toISOString(),
            updatedBy: "admin",
          },
        ],
      });

      setSuccessMessage("Lead reassigned successfully.");
      setSelectedLead(null);
      setNewAssignedTo("");
      setNewDateAssigned("");
      setErrorMessage("");

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === selectedLead.id
            ? {
                ...lead,
                assignedTo: newAssignedTo,
                assignedToName: members.find((m) => m.id === newAssignedTo)?.name || "Unknown",
                dateAssigned: newDateAssigned,
                status: "Pending",
              }
            : lead
        )
      );
      filterLeadsByKpi(selectedKpi);
    } catch (err) {
      console.error("Error reassigning lead:", err);
      setErrorMessage("Failed to reassign lead. Try again.");
    }
  };

  const handleSelectLead = (id) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter((leadId) => leadId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const leadId of selectedLeads) {
        await deleteDoc(doc(db, "leads", leadId));
      }
      setLeads((prevLeads) => prevLeads.filter((lead) => !selectedLeads.includes(lead.id)));
      setFilteredLeads((prevFilteredLeads) =>
        prevFilteredLeads.filter((lead) => !selectedLeads.includes(lead.id))
      );
      setSelectedLeads([]);
      setSuccessMessage("Selected leads deleted successfully.");
      setShowDeleteConfirmation(false);
    } catch (err) {
      console.error("Error deleting selected leads:", err);
      setErrorMessage("Failed to delete selected leads. Try again.");
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignMember || !bulkAssignDate) {
      setErrorMessage("Please select an agent and date for bulk assignment.");
      return;
    }

    try {
      for (const leadId of selectedLeads) {
        const leadRef = doc(db, "leads", leadId);
        const leadData = filteredLeads.find((l) => l.id === leadId);
        await updateDoc(leadRef, {
          assignedTo: bulkAssignMember,
          assignedToName: members.find((m) => m.id === bulkAssignMember)?.name || "Unknown",
          dateAssigned: bulkAssignDate,
          status: "Pending",
          notes: [
            ...(leadData.notes || []),
            {
              text: `Bulk assigned to ${
                members.find((m) => m.id === bulkAssignMember)?.name || "Unknown"
              } on ${bulkAssignDate}`,
              date: new Date().toISOString(),
              updatedBy: "admin",
            },
          ],
        });
      }
      setSuccessMessage("Leads bulk assigned successfully.");
      setSelectedLeads([]);
      setBulkAssignMember("");
      setBulkAssignDate("");
      filterLeadsByKpi(selectedKpi);
    } catch (err) {
      console.error("Error bulk assigning leads:", err);
      setErrorMessage("Failed to bulk assign leads. Try again.");
    }
  };

  const handleBulkUnassign = async () => {
    if (selectedLeads.length === 0) {
      setErrorMessage("No leads selected for unassignment.");
      return;
    }

    try {
      const batch = writeBatch(db);

      selectedLeads.forEach((leadId) => {
        const leadRef = doc(db, "leads", leadId);
        const lead = filteredLeads.find((l) => l.id === leadId);

        batch.update(leadRef, {
          assignedTo: "",
          assignedToName: "",
          dateAssigned: "",
          status: "Unassigned",
          notes: [
            ...(lead.notes || []),
            {
              text: `Bulk unassigned from ${lead.assignedToName || "Unknown"} on ${new Date().toISOString()}`,
              date: new Date().toISOString(),
              updatedBy: "admin",
            },
          ],
        });
      });

      await batch.commit();

      setSuccessMessage("Selected leads unassigned successfully.");
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          selectedLeads.includes(lead.id)
            ? {
                ...lead,
                assignedTo: "",
                assignedToName: "",
                dateAssigned: "",
                status: "Unassigned",
              }
            : lead
        )
      );
      setSelectedLeads([]);
      filterLeadsByKpi(selectedKpi);
    } catch (err) {
      console.error("Error bulk unassigning leads:", err);
      setErrorMessage("Failed to bulk unassign leads. Try again.");
    }
  };

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
  };

  const closeLeadDetails = () => {
    setSelectedLead(null);
    setErrorMessage("");
    setSuccessMessage("");
    setNewAssignedTo("");
    setNewDateAssigned("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US");
  };

  // Compute KPI counts
  const totalLeads = leads.length;
  const pendingLeads = leads.filter((lead) => lead.status === "Pending").length;
  const contactedLeads = leads.filter((lead) => lead.status !== "Pending").length;
  const interestedLeads = leads.filter((lead) => lead.status === "Interested").length;
  const unassignedLeads = leads.filter((lead) => !lead.assignedTo || lead.assignedTo === "").length;

  return (
    <div className="p-4 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl mb-6 font-extrabold text-center tracking-wide text-gray-100">
          All Leads
        </h1>
        {successMessage && <p className="text-green-500 mb-4 text-center">{successMessage}</p>}
        {errorMessage && <p className="text-red-500 mb-4 text-center">{errorMessage}</p>}

        {/* KPI Section */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: "All", value: totalLeads },
            { label: "Contacted", value: contactedLeads },
            { label: "Pending", value: pendingLeads },
            { label: "Interested", value: interestedLeads },
            { label: "Unassigned", value: unassignedLeads },
          ].map((kpi) => (
            <div
              key={kpi.label}
              onClick={() => filterLeadsByKpi(kpi.label)}
              className={`cursor-pointer bg-gray-800 p-6 rounded-lg shadow-lg text-center transition transform hover:scale-105 hover:bg-gray-700 ${
                selectedKpi === kpi.label ? "border-2 border-blue-500" : ""
              }`}
            >
              <p className="text-sm text-gray-400 uppercase font-bold tracking-wider">
                {kpi.label} Leads
              </p>
              <p className="text-4xl font-extrabold text-gray-100">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            {/* Delete Selected Button */}
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold mb-2 sm:mb-0"
            >
              Delete Selected
            </button>

            {/* Conditionally render Bulk Assign or Bulk Unassign */}
            {selectedKpi === "Unassigned" ? (
              // Bulk Assign for Unassigned KPI
              <div className="flex items-center space-x-2">
                <select
                  className="p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bulkAssignMember}
                  onChange={(e) => setBulkAssignMember(e.target.value)}
                >
                  <option value="">-- Select Agent --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bulkAssignDate}
                  onChange={(e) => setBulkAssignDate(e.target.value)}
                />
                <button
                  onClick={handleBulkAssign}
                  className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 font-bold transition"
                >
                  Assign Selected
                </button>
              </div>
            ) : (
              // Bulk Unassign for other KPIs
              <button
                onClick={handleBulkUnassign}
                className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600 transition font-bold"
              >
                Unassign Selected
              </button>
            )}
          </div>
        )}

        {/* Leads Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-lg">
          <table className="min-w-full bg-gray-800 text-left">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-3">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    className="w-4 h-4"
                  />
                </th>
                <th className="p-3 text-gray-300 font-bold uppercase text-sm">Lead Name</th>
                <th className="p-3 text-gray-300 font-bold uppercase text-sm">Number</th>
                <th className="p-3 text-gray-300 font-bold uppercase text-sm">Assigned To</th>
                <th className="p-3 text-gray-300 font-bold uppercase text-sm">Status</th>
                <th className="p-3 text-gray-300 font-bold uppercase text-sm">Date Assigned</th>
                <th className="p-3 text-gray-300 font-bold uppercase text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, index) => (
                <tr
                  key={lead.id}
                  className={`border-b border-gray-700 hover:bg-gray-700 transition ${
                    selectedLeads.includes(lead.id) ? "bg-gray-700" : ""
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-3 text-gray-100">{lead.leadName}</td>
                  <td className="p-3 text-gray-100">{lead.phone}</td>
                  <td className="p-3 text-gray-100">
                    {lead.assignedTo
                      ? members.find((m) => m.id === lead.assignedTo)?.name || "Unknown"
                      : "Unassigned"}
                  </td>
                  <td className="p-3 text-gray-100">{lead.status || "N/A"}</td>
                  <td className="p-3 text-gray-100">{formatDate(lead.dateAssigned)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => openLeadDetails(lead)}
                      className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition font-bold text-sm mr-2"
                    >
                      View Details
                    </button>
                    {/* Removed Individual Unassign Button */}
                    {/* 
                    {lead.assignedTo && (
                      <button
                        onClick={() => handleUnassignLead(lead)}
                        className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600 transition font-bold text-sm"
                      >
                        Unassign
                      </button>
                    )} 
                    */}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-400">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-bold mb-4 text-white">Confirm Delete</h2>
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete the selected leads? This action cannot be undone.
              </p>
              <div className="flex justify-between">
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 font-bold text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Details and Reassign Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded max-w-md w-full max-h-screen overflow-y-auto shadow-lg">
              <h2 className="text-xl mb-4 font-bold text-gray-100">Lead Details</h2>
              <p className="mb-2">
                <strong>Name:</strong> {selectedLead.leadName}
              </p>
              <p className="mb-2">
                <strong>Phone:</strong> {selectedLead.phone}
              </p>
              <p className="mb-2">
                <strong>Status:</strong> {selectedLead.status}
              </p>
              <p className="mb-4">
                <strong>Date Assigned:</strong> {formatDate(selectedLead.dateAssigned)}
              </p>

              {/* Notes Section */}
              <h3 className="text-lg font-bold mb-2 text-gray-100">Notes</h3>
              {selectedLead.notes && selectedLead.notes.length > 0 ? (
                [...selectedLead.notes].reverse().map((note, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded mb-3">
                    <p>
                      <strong>Status:</strong> {note.status || "N/A"}
                    </p>
                    <p>
                      <strong>Note:</strong> {note.text}
                    </p>
                    {note.followUpDate && (
                      <p>
                        <strong>Follow-up Date:</strong> {formatDate(note.followUpDate)}
                      </p>
                    )}
                    {note.followUpTime && (
                      <p>
                        <strong>Follow-up Time:</strong> {note.followUpTime}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      <strong>Date:</strong> {formatDate(note.date)}
                    </p>
                    {note.updatedBy && (
                      <p className="text-xs text-gray-500">
                        <strong>Updated By:</strong> {note.updatedBy}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 mb-4">No notes available.</p>
              )}

              {/* Reassign Section */}
              <h3 className="text-lg mb-4 font-bold text-gray-100">Reassign Lead</h3>
              <div className="mb-4">
                <label className="block mb-2 text-gray-300">Assign to Agent</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block mb-2 text-gray-300">Date Assigned</label>
                <input
                  type="date"
                  value={newDateAssigned}
                  onChange={(e) => setNewDateAssigned(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}
              {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
              <div className="flex justify-between">
                <button
                  onClick={closeLeadDetails}
                  className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleReassign}
                  className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition font-bold text-sm"
                >
                  Reassign
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllLeads;
