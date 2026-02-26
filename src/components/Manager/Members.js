import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

// New Component: Displays each member with their pending leads count
const MemberCard = ({ member, onClick }) => {
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("assignedTo", "==", member.id),
          where("status", "==", "Pending")
        );
        const querySnapshot = await getDocs(q);
        setPendingCount(querySnapshot.size);
      } catch (error) {
        console.error(
          "Error fetching pending leads count for member",
          member.id,
          error
        );
        setPendingCount(0);
      }
    };

    fetchPendingCount();
  }, [member.id]);

  return (
    <div
      onClick={() => onClick(member.id)}
      className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg hover:shadow-xl cursor-pointer hover:bg-gray-700 transition"
    >
      <h2 className="text-2xl font-bold mb-2">{member.name}</h2>
      <p className="text-sm text-gray-400">{member.email}</p>
      <p className="mt-2 text-lg">
        Pending Leads:{" "}
        {pendingCount !== null ? pendingCount : <span>Loading...</span>}
      </p>
    </div>
  );
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [kpiData, setKpiData] = useState({
    total: 0,
    pending: 0,
    interested: 0,
    contacted: 0,
    didntPick: 0, // NEW KPI
  });
  const [activeKPI, setActiveKPI] = useState("Pending"); // Default to Pending
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [reassignDate, setReassignDate] = useState("");
  const [bulkReassignPopup, setBulkReassignPopup] = useState(false);
  const [bulkReassignTo, setBulkReassignTo] = useState("");
  const [bulkReassignDate, setBulkReassignDate] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const managerId = localStorage.getItem("uid");
      try {
        // Fetch only active members
        const membersQuery = query(
          collection(db, "members"),
          where("status", "==", "active")
        );
        const querySnapshot = await getDocs(membersQuery);
        const allActiveMembers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter members assigned to the current manager
        const managerData = allActiveMembers.find(
          (member) => member.id === managerId
        );

        if (managerData?.assignedMembers) {
          const assignedMembers = allActiveMembers.filter((member) =>
            managerData.assignedMembers.includes(member.id)
          );
          setMembers(assignedMembers);

          const map = {};
          assignedMembers.forEach((member) => {
            map[member.id] = member.name;
          });
          setMembersMap(map);
        } else {
          setMembers([]);
          setMembersMap({});
        }
      } catch (err) {
        console.error("Error fetching members:", err);
        setErrorMessage("Failed to fetch members.");
      }
    };

    fetchMembers();
  }, []);

  const fetchLeads = async (memberId) => {
    try {
      const q = query(
        collection(db, "leads"),
        where("assignedTo", "==", memberId)
      );
      const querySnapshot = await getDocs(q);
      const leadsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);

      const total = leadsData.length;
      const pending = leadsData.filter(
        (lead) => lead.status === "Pending"
      ).length;
      const interested = leadsData.filter(
        (lead) =>
          lead.status === "Interested" ||
          lead.status === "Requested Call Back"
      ).length;
      const contacted = leadsData.filter(
        (lead) => lead.status !== "Pending"
      ).length;

      // NEW: "Didn't Pick" count
      const didntPick = leadsData.filter(
        (lead) => lead.status === "Didn't Pick"
      ).length;

      setKpiData({ total, pending, interested, contacted, didntPick });

      setFilteredLeads(leadsData);
      setSelectedMember(memberId);
      // Default the detailed view to only show "Pending" leads
      filterLeads(leadsData, "Pending");
    } catch (error) {
      console.error("Error fetching leads:", error);
      setErrorMessage("Failed to fetch leads for the selected agent.");
    }
  };

  const filterLeads = (leadsData, status) => {
    let filtered = [];
    switch (status) {
      case "All":
        filtered = leadsData;
        break;
      case "Contacted":
        filtered = leadsData.filter((lead) => lead.status !== "Pending");
        break;
      case "Pending":
        filtered = leadsData.filter((lead) => lead.status === "Pending");
        break;
        case "Interested":
          filtered = leadsData.filter(
            (lead) => lead.status === "Interested" || lead.status === "Requested Call Back"
          );
          break;        
      // NEW: filter for "Didn't Pick"
      case "Didn't Pick":
        filtered = leadsData.filter((lead) => lead.status === "Didn't Pick");
        break;
      default:
        filtered = leadsData;
        break;
    }

    filtered.sort((a, b) => new Date(b.dateAssigned) - new Date(a.dateAssigned));


    setFilteredLeads(filtered);
    setActiveKPI(status);
  };

  const handleLeadSelection = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (
      selectedLeads.length === filteredLeads.length &&
      filteredLeads.length > 0
    ) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  // New: Select the first 25 leads in the current (filtered) list
  const handleSelect25 = () => {
    if (filteredLeads.length === 0) return;
    const selection = filteredLeads.slice(0, 25).map((lead) => lead.id);
    setSelectedLeads(selection);
  };

  const handleUnassignLeads = async () => {
    if (selectedLeads.length === 0) {
      setErrorMessage("No leads selected to unassign.");
      return;
    }

    try {
      const managerName = localStorage.getItem("name") || "Manager";

      const updatedLeads = leads.map((lead) => {
        if (selectedLeads.includes(lead.id)) {
          const newNotes = [
            ...(lead.notes || []),
            {
              text: `Lead unassigned by ${managerName}`,
              status: lead.status,
              date: new Date().toISOString(),
            },
          ];
          return { ...lead, assignedTo: "", notes: newNotes };
        }
        return lead;
      });

      const updatePromises = selectedLeads.map((leadId) => {
        const currentLead = leads.find((l) => l.id === leadId);
        return updateDoc(doc(db, "leads", leadId), {
          assignedTo: "",
          notes: [
            ...(currentLead.notes || []),
            {
              text: `Lead unassigned by ${managerName}`,
              status: currentLead.status,
              date: new Date().toISOString(),
            },
          ],
        });
      });

      await Promise.all(updatePromises);

      setLeads(updatedLeads);
      filterLeads(updatedLeads, activeKPI);
      setSelectedLeads([]);
      setSuccessMessage("Selected leads have been unassigned successfully.");
      setErrorMessage("");
    } catch (error) {
      console.error("Error unassigning leads:", error);
      setErrorMessage("Failed to unassign leads. Please try again.");
    }
  };

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setReassignTo("");
    setReassignDate("");
    setSuccessMessage("");
    setErrorMessage("");
  };

  const closeLeadDetails = () => {
    setSelectedLead(null);
  };

  const handleReassignLead = async () => {
    if (!reassignTo || !reassignDate) {
      setErrorMessage("Please select an agent and provide an assignment date.");
      return;
    }

    try {
      const leadRef = doc(db, "leads", selectedLead.id);
      const managerName = localStorage.getItem("name") || "Manager";

      await updateDoc(leadRef, {
        assignedTo: reassignTo,
        status: "Pending",
        dateAssigned: reassignDate,
        notes: [
          ...(selectedLead.notes || []),
          {
            text: `Reassigned by ${managerName}`,
            status: "Pending",
            date: new Date().toISOString(),
          },
        ],
      });

      setSuccessMessage("Lead reassigned successfully.");
      setLeads((prevLeads) =>
        prevLeads.filter((lead) => lead.id !== selectedLead.id)
      );
      setSelectedLead(null);
      setErrorMessage("");
    } catch (error) {
      console.error("Error reassigning lead:", error);
      setErrorMessage("Failed to reassign lead. Please try again.");
    }
  };

  const openBulkReassignPopup = () => {
    if (selectedLeads.length === 0) {
      setErrorMessage("No leads selected for bulk reassign.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    setBulkReassignPopup(true);
    setBulkReassignTo("");
    setBulkReassignDate("");
  };

  const closeBulkReassignPopup = () => {
    setBulkReassignPopup(false);
  };

  const handleBulkReassign = async () => {
    if (!bulkReassignTo || !bulkReassignDate) {
      setErrorMessage("Please select an agent and provide an assignment date.");
      return;
    }

    try {
      const managerName = localStorage.getItem("name") || "Manager";

      const updatedLeads = leads.map((lead) => {
        if (selectedLeads.includes(lead.id)) {
          const newNotes = [
            ...(lead.notes || []),
            {
              text: `Bulk reassigned by ${managerName}`,
              status: "Pending",
              date: new Date().toISOString(),
            },
          ];
          return {
            ...lead,
            assignedTo: bulkReassignTo,
            status: "Pending",
            dateAssigned: bulkReassignDate,
            notes: newNotes,
          };
        }
        return lead;
      });

      const updatePromises = selectedLeads.map((leadId) => {
        const currentLead = leads.find((l) => l.id === leadId);
        return updateDoc(doc(db, "leads", leadId), {
          assignedTo: bulkReassignTo,
          status: "Pending",
          dateAssigned: bulkReassignDate,
          notes: [
            ...(currentLead.notes || []),
            {
              text: `Bulk reassigned by ${managerName}`,
              status: "Pending",
              date: new Date().toISOString(),
            },
          ],
        });
      });

      await Promise.all(updatePromises);

      setLeads(updatedLeads);
      filterLeads(updatedLeads, activeKPI);
      setSelectedLeads([]);
      setBulkReassignPopup(false);
      setSuccessMessage("Leads bulk reassigned successfully.");
      setErrorMessage("");
    } catch (error) {
      console.error("Error bulk reassigning leads:", error);
      setErrorMessage("Failed to bulk reassign leads. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const formatToCustomDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", { hour12: true });
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">
        Agents Dashboard
      </h1>

      {selectedMember && (
        <button
          onClick={() => setSelectedMember(null)}
          className="mb-6 bg-red-600 px-6 py-2 rounded-lg shadow-md hover:bg-red-700 transition"
        >
          Back to Agents
        </button>
      )}

      {!selectedMember ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} onClick={fetchLeads} />
          ))}
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-semibold mb-4">
            Leads for {membersMap[selectedMember]}
          </h2>

          {/* KPI BOXES */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 mb-6">
            {[
              { label: "All", value: kpiData.total },
              { label: "Contacted", value: kpiData.contacted },
              { label: "Pending", value: kpiData.pending },
              { label: "Interested", value: kpiData.interested },
              { label: "Didn't Pick", value: kpiData.didntPick },
            ].map(({ label, value }) => (
              <div
                key={label}
                className={`p-6 rounded-lg border border-gray-700 shadow-lg text-center cursor-pointer ${
                  activeKPI === label ? "bg-blue-600" : "bg-gray-800"
                } hover:bg-blue-700 transition transform hover:scale-105`}
                onClick={() => filterLeads(leads, label)}
              >
                <p className="text-lg text-gray-100">{label} Leads</p>
                <p className="text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between mb-4 space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                {selectedLeads.length === filteredLeads.length &&
                filteredLeads.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </button>
              <button
                onClick={handleSelect25}
                className="bg-green-500 px-4 py-2 rounded-lg hover:bg-green-600 transition"
              >
                Select 25 Leads
              </button>
              <button
                onClick={openBulkReassignPopup}
                className="bg-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
              >
                Bulk Reassign
              </button>
              <button
                onClick={handleUnassignLeads}
                className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Unassign Selected
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-red-500 mb-4">{errorMessage}</p>
          )}
          {successMessage && (
            <p className="text-green-500 mb-4">{successMessage}</p>
          )}

          <div className="overflow-x-auto border border-gray-700 rounded-lg">
            <table className="min-w-full bg-gray-800 rounded-lg">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={
                        filteredLeads.length > 0 &&
                        selectedLeads.length === filteredLeads.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="p-4 text-left text-gray-400">Lead Name</th>
                  <th className="p-4 text-left text-gray-400">Phone</th>
                  <th className="p-4 text-left text-gray-400">Status</th>
                  <th className="p-4 text-left text-gray-400">
                    Assigned Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-700 transition cursor-pointer"
                    onClick={() => openLeadDetails(lead)}
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleLeadSelection(lead.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">
                      {lead.leadName}
                    </td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">
                      {lead.phone}
                    </td>
                    <td className="p-4 border-b border-gray-700 text-gray-100">
                      {lead.status}
                    </td>
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

          {selectedLead && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg max-w-md w-full max-h-screen overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">
                  {selectedLead.leadName}
                </h2>
                <p className="mb-2">
                  <strong>Phone:</strong> {selectedLead.phone}
                </p>
                <p className="mb-2">
                  <strong>Status:</strong> {selectedLead.status}
                </p>
                <p className="mb-2">
                  <strong>Assigned Date:</strong>{" "}
                  {formatDate(selectedLead.dateAssigned)}
                </p>

                {/* Status History Section */}
                <div className="mb-4">
                  <p className="text-sm font-bold mb-2">Notes:</p>
                  {selectedLead.notes && selectedLead.notes.length > 0 ? (
                    [...selectedLead.notes]
                      .reverse()
                      .map((note, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded mb-3">
                          <p>
                            <strong>Status:</strong> {note.status}
                          </p>
                          <p>
                            <strong>Note:</strong> {note.text}
                          </p>
                          {note.followUpDate && (
                            <p>
                              <strong>Follow-up Date:</strong>{" "}
                              {formatDate(note.followUpDate)}
                            </p>
                          )}
                          {note.followUpTime && (
                            <p>
                              <strong>Follow-up Time:</strong>{" "}
                              {note.followUpTime}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            <strong>Status Update Time:</strong>{" "}
                            {formatToCustomDateTime(note.date)}
                          </p>
                          {note.updatedBy && (
                            <p className="text-xs text-gray-500">
                              <strong>Updated By:</strong> {note.updatedBy}
                            </p>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-400">No notes available.</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Reassign To:</label>
                  <select
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded"
                  >
                    <option value="">-- Select Agent --</option>
                    {members
                      .filter((member) => member.id !== selectedLead.assignedTo)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Assignment Date:</label>
                  <input
                    type="date"
                    value={reassignDate}
                    onChange={(e) => setReassignDate(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded"
                  />
                </div>
                {errorMessage && (
                  <p className="text-red-500 mb-4">{errorMessage}</p>
                )}
                {successMessage && (
                  <p className="text-green-500 mb-4">{successMessage}</p>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={closeLeadDetails}
                    className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleReassignLead}
                    className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Reassign Lead
                  </button>
                </div>
              </div>
            </div>
          )}

          {bulkReassignPopup && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg max-w-md w-full max-h-screen overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Bulk Reassign</h2>
                <div className="mb-4">
                  <label className="block mb-2">Reassign To:</label>
                  <select
                    value={bulkReassignTo}
                    onChange={(e) => setBulkReassignTo(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded"
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
                  <label className="block mb-2">Assignment Date:</label>
                  <input
                    type="date"
                    value={bulkReassignDate}
                    onChange={(e) => setBulkReassignDate(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded"
                  />
                </div>
                {errorMessage && (
                  <p className="text-red-500 mb-4">{errorMessage}</p>
                )}
                {successMessage && (
                  <p className="text-green-500 mb-4">{successMessage}</p>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={closeBulkReassignPopup}
                    className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkReassign}
                    className="bg-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
                  >
                    Bulk Reassign
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Members;
