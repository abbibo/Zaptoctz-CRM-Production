import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../context/FirebaseContext";
import { collection, getDocs } from "firebase/firestore";

/* ================================================================
   1) HELPER / UTILITY FUNCTIONS
   ================================================================ */

// For date formatting to "22nd Feb 2024"
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatFancyDate(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";

  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

function normalizeStatus(status) {
  if (!status) return "";
  return status.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isContacted(lead) {
  return normalizeStatus(lead.status) !== "pending";
}

function getLatestUpdatedTime(lead) {
  let latest = lead.dateAssigned ? new Date(lead.dateAssigned) : null;
  if (lead.notes && lead.notes.length > 0) {
    const maxNote = lead.notes
      .map((n) => new Date(n.date))
      .reduce((acc, d) => (d > acc ? d : acc), new Date(0));
    if (!latest || maxNote > latest) {
      latest = maxNote;
    }
  }
  return latest ? latest.getTime() : 0;
}

function didUserWorkToday(userId, allLeads) {
  // If the user updated/assigned any lead after midnight
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const userLeads = allLeads.filter((l) => l.assignedTo === userId);
  return userLeads.some((lead) => getLatestUpdatedTime(lead) >= startOfDay.getTime());
}

/* ================================================================
   2) MAIN DASHBOARD COMPONENT
   ================================================================ */
export default function UserPerformanceDashboard() {
  // Firestore data
  const [members, setMembers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);

  // Filter
  const [filterMode, setFilterMode] = useState("today"); // "today", "all", or "custom"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // On mount -> fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const membersSnap = await getDocs(collection(db, "members"));
      const membersData = membersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const leadsSnap = await getDocs(collection(db, "leads"));
      const leadsData = leadsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMembers(membersData);
      setLeads(leadsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-apply date filter whenever leads or filter changes
  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, filterMode]);

  // 2B) Apply date filter
  function applyFilter() {
    if (!leads || leads.length === 0) {
      setFilteredLeads([]);
      return;
    }

    if (filterMode === "all") {
      setFilteredLeads(leads);
      return;
    }

    if (filterMode === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = leads.filter((lead) => {
        if (!lead.dateAssigned) return false;
        const assigned = new Date(lead.dateAssigned);
        return assigned >= today && assigned < tomorrow;
      });
      setFilteredLeads(res);
      return;
    }

    // filterMode === "custom"
    if (!startDate && !endDate) {
      setFilteredLeads(leads);
      return;
    }
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    if (e) e.setHours(23, 59, 59, 999);

    const res = leads.filter((lead) => {
      if (!lead.dateAssigned) return false;
      const assigned = new Date(lead.dateAssigned);
      if (s && assigned < s) return false;
      if (e && assigned > e) return false;
      return true;
    });
    setFilteredLeads(res);
  }

  // 2C) Compute user performance
  function getUserPerformance(userId) {
    const userLeads = filteredLeads.filter((l) => l.assignedTo === userId);

    const total = userLeads.length;
    const contactedCount = userLeads.filter(isContacted).length;
    const pendingCount = userLeads.filter((l) => normalizeStatus(l.status) === "pending").length;
    const interestedCount = userLeads.filter((l) => normalizeStatus(l.status) === "interested").length;
    const notInterestedCount = userLeads.filter((l) => normalizeStatus(l.status) === "notinterested").length;
    const didntPickCount = userLeads.filter((l) => normalizeStatus(l.status) === "didntpick").length;
    const requestCallbackCount = userLeads.filter((l) => normalizeStatus(l.status) === "requestedcallback").length;
    const convertedCount = userLeads.filter((l) => normalizeStatus(l.status) === "converted").length;

    const contactRate = total > 0 ? (contactedCount / total) * 100 : 0;
    const interestedRate = contactedCount > 0 ? (interestedCount / contactedCount) * 100 : 0;
    const conversionRate = contactedCount > 0 ? (convertedCount / contactedCount) * 100 : 0;

    return {
      total,
      contactedCount,
      pendingCount,
      interestedCount,
      notInterestedCount,
      didntPickCount,
      requestCallbackCount,
      convertedCount,
      contactRate,
      interestedRate,
      conversionRate,
      userLeads,
    };
  }

  // 2D) Overall KPI from filteredLeads
  function getOverallKPI() {
    const total = filteredLeads.length;
    const contacted = filteredLeads.filter(isContacted).length;
    const interested = filteredLeads.filter((l) => normalizeStatus(l.status) === "interested").length;
    const converted = filteredLeads.filter((l) => normalizeStatus(l.status) === "converted").length;
    return { total, contacted, interested, converted };
  }

  // 2E) Group members by dept, skipping inactive
  function groupByDept() {
    const deptMap = {};
    members.forEach((m) => {
      if (!m.status || m.status.toLowerCase() === "inactive") return;
      const d = m.dept || "No Dept";
      if (!deptMap[d]) deptMap[d] = [];
      deptMap[d].push(m);
    });
    return deptMap;
  }

  // 2F) Open/Close modals
  function openUserModal(user) {
    setSelectedUser(user);
    setShowUserModal(true);
  }
  function closeUserModal() {
    setSelectedUser(null);
    setShowUserModal(false);
  }

  function openLeadModal(lead) {
    setSelectedLead(lead);
    setShowLeadModal(true);
  }
  function closeLeadModal() {
    setSelectedLead(null);
    setShowLeadModal(false);
  }

  // 2G) Export CSV
  function exportToCSV() {
    const deptMap = groupByDept();
    const header = [
      "Department",
      "User Name",
      "Total",
      "Contacted",
      "Interested",
      "Converted",
      "Pending",
      "Not Interested",
      "Didn't Pick",
      "Requested Callback",
      "Contact Rate (%)",
      "Interested Rate (%)",
      "Conversion Rate (%)"
    ];
    const rows = [];
    Object.keys(deptMap).forEach((dept) => {
      deptMap[dept].forEach((u) => {
        const p = getUserPerformance(u.id);
        rows.push([
          dept,
          u.name || "",
          p.total,
          p.contactedCount,
          p.interestedCount,
          p.convertedCount,
          p.pendingCount,
          p.notInterestedCount,
          p.didntPickCount,
          p.requestCallbackCount,
          p.contactRate.toFixed(1),
          p.interestedRate.toFixed(1),
          p.conversionRate.toFixed(1),
        ]);
      });
    });

    const csvContent =
      header.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "UserPerformance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ================================================================
     3) RENDER
     ================================================================ */
  const deptMap = groupByDept();
  const overallKPI = getOverallKPI();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* NAVBAR */}
      <header className="bg-gray-800 p-4 shadow-md flex items-center justify-between">
        <h1 className="text-xl font-extrabold">User Performance Dashboard</h1>
        <button
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-bold text-sm"
        >
          Refresh
        </button>
      </header>

      {/* OVERALL KPI CARDS */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex flex-wrap gap-4 justify-center sm:justify-start">
        {[
          { label: "Total Leads", value: overallKPI.total || 0, color: "bg-blue-600" },
          { label: "Contacted", value: overallKPI.contacted || 0, color: "bg-green-600" },
          { label: "Interested", value: overallKPI.interested || 0, color: "bg-yellow-500" },
          { label: "Converted", value: overallKPI.converted || 0, color: "bg-purple-600" },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`px-4 py-2 ${kpi.color} rounded-md shadow text-xs sm:text-sm font-bold flex flex-col items-center justify-center`}
          >
            <span>{kpi.label}</span>
            <span className="text-xl sm:text-2xl">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        {/* Filter Radios */}
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="filterMode"
              value="today"
              checked={filterMode === "today"}
              onChange={() => setFilterMode("today")}
              className="form-radio text-blue-400 h-4 w-4"
            />
            <span className="ml-2 text-sm font-bold">Today</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="filterMode"
              value="all"
              checked={filterMode === "all"}
              onChange={() => setFilterMode("all")}
              className="form-radio text-blue-400 h-4 w-4"
            />
            <span className="ml-2 text-sm font-bold">All</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="filterMode"
              value="custom"
              checked={filterMode === "custom"}
              onChange={() => setFilterMode("custom")}
              className="form-radio text-blue-400 h-4 w-4"
            />
            <span className="ml-2 text-sm font-bold">Custom</span>
          </label>
        </div>

        {filterMode === "custom" && (
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-bold mb-1">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-700 text-white p-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-700 text-white p-2 rounded text-sm"
              />
            </div>
            <button
              onClick={applyFilter}
              className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded font-bold text-sm"
            >
              Apply
            </button>
          </div>
        )}

        <button
          onClick={exportToCSV}
          className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded font-bold text-sm"
        >
          Export CSV
        </button>
      </div>

      {/* ERROR / LOADING */}
      {error && (
        <div className="bg-red-700 p-3 text-sm text-center">{error}</div>
      )}
      {loading && (
        <p className="text-center text-gray-400 mt-4">Loading data...</p>
      )}

      {/* MAIN CONTENT */}
      <main className="p-4 flex-1 overflow-auto">
        {Object.keys(deptMap).map((dept) => (
          <section key={dept} className="mb-8">
            <h2 className="text-lg font-bold mb-3 border-l-4 border-blue-500 pl-2">
              Sales Team
            </h2>

            {/* USER GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {deptMap[dept].map((user) => {
                const perf = getUserPerformance(user.id);
                const hasWorked = didUserWorkToday(user.id, leads);

                return (
                  <div
                    key={user.id}
                    className="bg-gray-800 p-4 rounded-lg shadow flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-md font-bold">
                        {user.name || "Unnamed"}
                      </h3>
                      {/* No activity label if filter "today" */}
                      {filterMode === "today" && !hasWorked && (
                        <span className="text-[10px] bg-red-600 px-2 py-1 rounded-full text-white">
                          No Activity
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3 text-xs">
                      <span className="bg-blue-700 px-2 py-1 rounded-full">
                        Total: {perf.total}
                      </span>
                      <span className="bg-green-700 px-2 py-1 rounded-full">
                        Contacted: {perf.contactedCount}
                      </span>
                      <span className="bg-purple-700 px-2 py-1 rounded-full">
                        Converted: {perf.convertedCount}
                      </span>
                    </div>

                    {/* PROGRESS BARS */}
                    <div className="mb-1 text-xs flex justify-between">
                      <span>Contact Rate</span>
                      <span>{perf.contactRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded mb-2">
                      <div
                        className="bg-blue-500 h-2 rounded"
                        style={{ width: `${perf.contactRate}%` }}
                      />
                    </div>

                    <div className="mb-1 text-xs flex justify-between">
                      <span>Interested</span>
                      <span>{perf.interestedRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded mb-2">
                      <div
                        className="bg-green-500 h-2 rounded"
                        style={{ width: `${perf.interestedRate}%` }}
                      />
                    </div>

                    <div className="mb-1 text-xs flex justify-between">
                      <span>Conversion</span>
                      <span>{perf.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded mb-4">
                      <div
                        className="bg-purple-500 h-2 rounded"
                        style={{ width: `${perf.conversionRate}%` }}
                      />
                    </div>

                    <button
                      onClick={() => openUserModal(user)}
                      className="bg-indigo-600 hover:bg-indigo-700 py-2 px-3 rounded font-bold text-sm mt-auto"
                    >
                      View Performance
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* USER DETAIL MODAL */}
      {showUserModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          getUserPerformance={getUserPerformance}
          onClose={closeUserModal}
          onLeadClick={openLeadModal}
        />
      )}

      {/* LEAD DETAIL MODAL */}
      {showLeadModal && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={closeLeadModal}
        />
      )}
    </div>
  );
}

/* ================================================================
   4) USER DETAIL MODAL
   ================================================================ */
function UserDetailModal({ user, getUserPerformance, onClose, onLeadClick }) {
  const [activeTab, setActiveTab] = useState("all");
  const perf = getUserPerformance(user.id);
  const allLeads = perf.userLeads;

  const handleOuterClick = (e) => {
    e.stopPropagation();
    onClose();
  };
  const handleInnerClick = (e) => {
    e.stopPropagation();
  };

  function leadsForTab(tab) {
    let list = [...allLeads];
    if (tab === "all") {
      // no filter
    } else if (tab === "contacted") {
      list = list.filter(isContacted);
    } else {
      list = list.filter((l) => normalizeStatus(l.status) === tab);
    }
    list.sort((a, b) => getLatestUpdatedTime(b) - getLatestUpdatedTime(a));
    return list;
  }

  const tabs = [
    { key: "all", label: "All" },
    { key: "contacted", label: "Contacted" },
    { key: "pending", label: "Pending" },
    { key: "interested", label: "Interested" },
    { key: "converted", label: "Converted" },
    { key: "notinterested", label: "Not Interested" },
    { key: "didntpick", label: "Didn't Pick" },
    { key: "requestedcallback", label: "Call Back" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={handleOuterClick}
    >
      <div
        className="relative bg-gray-800 w-full max-w-3xl rounded-lg shadow-lg flex flex-col max-h-[90vh]"
        onClick={handleInnerClick}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center bg-gray-900 p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold">
            {user.name} - Performance
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* TABS */}
        <div className="flex overflow-x-auto bg-gray-900 p-2 border-b border-gray-700">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 text-sm font-bold rounded whitespace-nowrap mr-2 ${
                activeTab === t.key
                  ? "bg-blue-700 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="overflow-auto p-4 flex-1">
          <LeadList leads={leadsForTab(activeTab)} onLeadClick={onLeadClick} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   5) LEAD LIST
   ================================================================ */
function LeadList({ leads, onLeadClick }) {
  if (!leads || leads.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center">No leads found.</p>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const latest = getLatestUpdatedTime(lead);
        return (
          <div
            key={lead.id}
            onClick={() => onLeadClick(lead)}
            className="bg-gray-700 hover:bg-gray-600 transition p-3 rounded cursor-pointer"
          >
            <h4 className="font-bold text-sm mb-1">
              {lead.leadName || "N/A"}
            </h4>
            <p className="text-xs text-gray-300">
              Phone: {lead.phone || "N/A"}
            </p>
            <p className="text-xs text-gray-400">
              Status: {lead.status || "N/A"}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Updated:{" "}
              {latest ? new Date(latest).toLocaleString() : "N/A"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   6) LEAD DETAIL MODAL
   ================================================================ */
function LeadDetailModal({ lead, onClose }) {
  const sortedNotes = (lead.notes || []).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const handleOuterClick = (e) => {
    e.stopPropagation();
    onClose();
  };
  const handleInnerClick = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={handleOuterClick}
    >
      <div
        className="bg-gray-800 w-full max-w-md rounded-lg shadow-lg flex flex-col max-h-[90vh]"
        onClick={handleInnerClick}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center bg-gray-900 p-4 border-b border-gray-700">
          <h4 className="text-lg font-bold">
            Lead Detail - {lead.leadName || "N/A"}
          </h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 space-y-2 overflow-auto">
          <p className="text-sm">
            <span className="font-bold">Phone:</span> {lead.phone || "N/A"}
          </p>
          <p className="text-sm">
            <span className="font-bold">Status:</span> {lead.status || "N/A"}
          </p>
          <p className="text-sm">
            <span className="font-bold">Date Assigned:</span>{" "}
            {lead.dateAssigned ? formatFancyDate(lead.dateAssigned) : "N/A"}
          </p>

          {/* NOTES */}
          <div>
            <h5 className="font-bold mb-2">Notes</h5>
            {sortedNotes.length === 0 ? (
              <p className="text-xs text-gray-400">No notes found.</p>
            ) : (
              sortedNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700 p-2 rounded mb-2 text-xs text-gray-200"
                >
                  <p className="font-bold">
                    Status: {note.status || "N/A"}
                  </p>
                  {note.text && <p className="mt-1">{note.text}</p>}
                  {note.followUpDate && (
                    <p className="text-[11px] mt-1 text-gray-400">
                      Follow-up: {formatFancyDate(note.followUpDate)}
                      {note.followUpTime ? ` at ${note.followUpTime}` : ""}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">
                    {note.date ? formatFancyDate(note.date) : ""}
                    {note.updatedBy && ` • Updated by: ${note.updatedBy}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-900 p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
