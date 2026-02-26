import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../context/FirebaseContext";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc
} from "firebase/firestore";

// Custom hook to detect mobile devices (using 640px as breakpoint)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

const ManagerDashboard = () => {
  // Get today's date in YYYY-MM-DD format.
  const todayStr = new Date().toISOString().split("T")[0];

  // States for leads, members, modals, reports, etc.
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [kpiData, setKpiData] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    interested: 0,
    duplicated: 0,
    followUp: 0,
  });
  const [selectedKpi, setSelectedKpi] = useState("All");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState("day"); // "day" or "user"
  const [reportStartDate, setReportStartDate] = useState(todayStr);
  const [reportEndDate, setReportEndDate] = useState(todayStr);
  const [reportText, setReportText] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Helper to append ordinal suffixes to day numbers
  const ordinalSuffix = (n) => {
    if (n > 3 && n < 21) return "th";
    switch (n % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  // Helper to normalize status strings (if needed)
  const normalizeStatus = (status) => {
    if (!status) return "";
    return status.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // -------------------------------
  // Helper Functions for Date Formatting
  // -------------------------------
  const formatToCustomDateTime = (dateString) => {
    if (!dateString) return "Not Set";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedHours = hours % 12 || 12;
    const amPm = hours < 12 ? "AM" : "PM";
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    return `${day}${ordinalSuffix(day)} ${month} ${year}, ${formattedHours}:${formattedMinutes} ${amPm}`;
  };

  const formatToCustomDate = (dateInput) => {
    if (!dateInput) return "Not Set";
    const date = new Date(dateInput);
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}${ordinalSuffix(day)} ${month} ${year}`;
  };

  const formatFollowUpTime = (timeString) => {
    if (!timeString) return "";
    const [hourStr, minute] = timeString.split(":");
    const hour = parseInt(hourStr, 10);
    const formattedHour = hour % 12 || 12;
    const amPm = hour < 12 ? "AM" : "PM";
    return `${formattedHour}:${minute} ${amPm}`;
  };

  const formatFollowUpDateTime = (lead) => {
    // If status is "Didn't Pick" or "Not Interested", no follow-up is required
    if (normalizeStatus(lead.status) === "didntpick" || normalizeStatus(lead.status) === "notinterested") {
      return "Not required";
    }
    if (!lead.followUpDate) return "Not required";
    const datePart = formatToCustomDate(lead.followUpDate);
    const timePart = lead.followUpTime ? `, ${formatFollowUpTime(lead.followUpTime)}` : "";
    return `${datePart}${timePart}`;
  };

  // -------------------------------
  // Helper to get last updated timestamp for sorting leads.
  // -------------------------------
  const getLastUpdatedTime = (lead) => {
    if (lead.notes && lead.notes.length > 0) {
      const latestNoteDate = lead.notes
        .map((n) => new Date(n.date))
        .reduce((max, d) => (d > max ? d : max), new Date(lead.dateAssigned || 0));
      return latestNoteDate.getTime();
    }
    return lead.dateAssigned ? new Date(lead.dateAssigned).getTime() : 0;
  };

  // -------------------------------
  // CONTACTED HELPER
  // -------------------------------
  // A lead is considered "contacted" if its status is NOT "Pending"
  const isContacted = (lead) => lead.status !== "Pending";

  // -------------------------------
  // Data Fetching & KPI Calculation
  // -------------------------------
  const refreshData = useCallback(async () => {
    try {
      const managerId = localStorage.getItem("uid");
      const membersSnapshot = await getDocs(collection(db, "members"));
      const managerData = membersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .find((doc) => doc.id === managerId);
      if (managerData?.assignedMembers) {
        const assignedMembersDocs = membersSnapshot.docs.filter((doc) =>
          managerData.assignedMembers.includes(doc.id)
        );
        const membersArr = assignedMembersDocs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          status: doc.data().status,
        }));
        setAssignedMembers(membersArr);
        const memberMap = {};
        membersArr.forEach((member) => {
          memberMap[member.id] = member.name;
        });
        setMembersMap(memberMap);

        // Fetch leads for these members.
        const leadsSnapshot = await getDocs(collection(db, "leads"));
        const leadsData = leadsSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((lead) => Object.keys(memberMap).includes(lead.assignedTo));
        // Sort leads by last updated time.
        leadsData.sort((a, b) => getLastUpdatedTime(b) - getLastUpdatedTime(a));
        setLeads(leadsData);
        setFilteredLeads(leadsData);

        // Compute duplicates based on phone number.
        const phoneCount = {};
        leadsData.forEach((lead) => {
          const p = lead.phone || "";
          phoneCount[p] = (phoneCount[p] || 0) + 1;
        });
        const duplicatedLeads = leadsData.filter((lead) => phoneCount[lead.phone] > 1);

        // Compute KPIs using our isContacted helper.
        const total = leadsData.length;
        const pending = leadsData.filter((lead) => lead.status === "Pending").length;
        const contacted = leadsData.filter(isContacted).length;
        const interested = leadsData.filter(
          (lead) => lead.status === "Interested" || lead.status === "Requested Call Back"
        ).length;
                const duplicated = duplicatedLeads.length;
        const followUp = leadsData.filter((lead) => lead.status === "Requested Call Back").length;
        setKpiData({ total, pending, contacted, interested, duplicated, followUp });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // -------------------------------
  // Filtering Leads by KPI Selection
  // -------------------------------
  const filterLeadsByKPI = (status) => {
    setSelectedKpi(status);
    let filtered = [];
    if (status === "All") {
      filtered = [...leads];
    } else if (status === "Contacted") {
      filtered = leads.filter(isContacted);
    } else if (status === "Pending") {
      filtered = leads.filter((lead) => lead.status === "Pending");
    } else if (status === "Interested") {
      filtered = leads.filter((lead) => lead.status === "Interested");
    } else if (status === "Duplicated") {
      const phoneCount = {};
      leads.forEach((lead) => {
        const p = lead.phone || "";
        phoneCount[p] = (phoneCount[p] || 0) + 1;
      });
      filtered = leads.filter((lead) => phoneCount[lead.phone] > 1);
    } else if (status === "FollowUp") {
      filtered = leads.filter((lead) => lead.status === "Requested Call Back");
    }
    filtered.sort((a, b) => getLastUpdatedTime(b) - getLastUpdatedTime(a));
    setFilteredLeads(filtered);
    setSelectedLeads([]);
  };

  // -------------------------------
  // Lead Selection and Deletion
  // -------------------------------
  const openLeadDetails = (lead) => setSelectedLead(lead);
  const closeLeadDetails = () => setSelectedLead(null);

  const handleDocumentation = async (e, lead) => {
    e.stopPropagation();
    if (window.confirm("Do you want to start the documentation process?")) {
      try {
        const docRef = doc(db, "documentation", lead.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           alert("Documentation already started for this lead.");
           return;
        }
        await setDoc(docRef, {
           docId: lead.id,
           originalLeadId: lead.id,
           leadName: lead.leadName || "",
           phone: lead.phone || "",
           assignedTo: lead.assignedTo || "",
           dateAdded: new Date().toISOString()
        });
        alert("Lead copied to Documentation successfully!");
      } catch (err) {
        console.error("Error creating documentation: ", err);
        alert("Failed to start documentation process.");
      }
    }
  };

  const handleSelectLead = (id) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter((leadId) => leadId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const leadId of selectedLeads) {
        await deleteDoc(doc(db, "leads", leadId));
      }
      const remaining = leads.filter((lead) => !selectedLeads.includes(lead.id));
      setLeads(remaining);
      filterLeadsByKPI(selectedKpi);
      setSelectedLeads([]);
      setShowDeleteConfirmation(false);
    } catch (err) {
      console.error("Error deleting selected leads:", err);
    }
  };

  // -------------------------------
  // Report Generation
  // -------------------------------
  // In our reports, we count a lead as "contacted" if its status is not "Pending".
  // We also include a "pending" count.
  const generateReport = () => {
    let report = "";
    // Use all leads for reporting.
    let filteredLeadsForReport = leads;

    if (reportType === "user") {
      if (!selectedUser) {
        report = "Please select a user for the report.";
      } else {
        // Filter leads for the selected user.
        filteredLeadsForReport = filteredLeadsForReport.filter(
          (lead) => lead.assignedTo === selectedUser
        );
        const overallTotal = filteredLeadsForReport.length;
        // Count based on our helper.
        const overallContacted = filteredLeadsForReport.filter(isContacted).length;
        const overallPending = filteredLeadsForReport.filter((l) => l.status === "Pending").length;
        const overallInterested = filteredLeadsForReport.filter((l) => l.status === "Interested").length;
        const overallNotInterested = filteredLeadsForReport.filter((l) => normalizeStatus(l.status) === "notinterested").length;
        const overallDidntPick = filteredLeadsForReport.filter((l) => normalizeStatus(l.status) === "didntpick").length;
        const overallFollowUp = filteredLeadsForReport.filter((l) => l.status === "Requested Call Back").length;

        report += `User Wise Report for ${membersMap[selectedUser] || "Unknown User"}\n`;
        if (reportStartDate && reportEndDate) {
          report += `For ${formatToCustomDate(reportStartDate)} to ${formatToCustomDate(reportEndDate)}\n\n`;
        } else {
          report += "For All Time\n\n";
        }
        report += `Overall Summary:\n`;
        report += `  Total Leads: ${overallTotal}\n`;
        report += `  Contacted: ${overallContacted}\n`;
        report += `  Pending: ${overallPending}\n`;
        report += `  Interested: ${overallInterested}\n`;
        report += `  Not Interested: ${overallNotInterested}\n`;
        report += `  Didn't Pick: ${overallDidntPick}\n`;
        report += `  FollowUp: ${overallFollowUp}\n\n`;

        // Date breakdown: if a date range is provided, use that; otherwise, use the min/max from leads.
        let startDate, endDate;
        if (reportStartDate && reportEndDate) {
          startDate = new Date(reportStartDate);
          endDate = new Date(reportEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else if (filteredLeadsForReport.length > 0) {
          startDate = new Date(Math.min(...filteredLeadsForReport.map(lead => new Date(lead.dateAssigned))));
          endDate = new Date(Math.max(...filteredLeadsForReport.map(lead => new Date(lead.dateAssigned))));
          endDate.setHours(23,59,59,999);
        } else {
          report += "No leads available for breakdown.\n";
          setReportText(report);
          return;
        }
        const dateArray = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dateArray.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        dateArray.forEach((dateObj) => {
          const dateStr = formatToCustomDate(dateObj);
          const leadsForDate = filteredLeadsForReport.filter((lead) => {
            const d = lead.notes && lead.notes.length > 0 ? new Date(lead.notes[lead.notes.length - 1].date) : new Date(lead.dateAssigned);
            return (
              d.getFullYear() === dateObj.getFullYear() &&
              d.getMonth() === dateObj.getMonth() &&
              d.getDate() === dateObj.getDate()
            );
          });
          if (leadsForDate.length === 0) {
            report += `Date: ${dateStr}: didn't worked\n`;
          } else {
            const contactedCount = leadsForDate.filter(isContacted).length;
            const pendingCount = leadsForDate.filter((l) => l.status === "Pending").length;
            const interestedCount = leadsForDate.filter((l) => l.status === "Interested").length;
            const notInterestedCount = leadsForDate.filter((l) => normalizeStatus(l.status) === "notinterested").length;
            const didntPickCount = leadsForDate.filter((l) => normalizeStatus(l.status) === "didntpick").length;
            const followUpCount = leadsForDate.filter((l) => l.status === "Requested Call Back").length;
            report += `Date: ${dateStr}\n`;
            report += `  Contacted: ${contactedCount}\n`;
            report += `  Pending: ${pendingCount}\n`;
            report += `  Interested: ${interestedCount}\n`;
            report += `  Not Interested: ${notInterestedCount}\n`;
            report += `  Didn't Pick: ${didntPickCount}\n`;
            report += `  FollowUp: ${followUpCount}\n`;
          }
        });
      }
    } else if (reportType === "day") {
      // Use the provided date range to generate the daily report.
      let startDate, endDate;
      if (reportStartDate && reportEndDate) {
        startDate = new Date(reportStartDate);
        endDate = new Date(reportEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (reportStartDate) {
        startDate = new Date(reportStartDate);
        endDate = new Date(reportStartDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        if (filteredLeadsForReport.length > 0) {
          startDate = new Date(Math.min(...filteredLeadsForReport.map(lead => new Date(lead.dateAssigned))));
          endDate = new Date(Math.max(...filteredLeadsForReport.map(lead => new Date(lead.dateAssigned))));
          endDate.setHours(23,59,59,999);
        } else {
          report += "No leads available for report.";
          setReportText(report);
          return;
        }
      }

      // Build an array of dates spanning from startDate to endDate.
      const dateArray = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const activeMembers = assignedMembers.filter(
        (member) => member.status.toLowerCase() !== "inactive"
      );
      let overallContacted = 0,
          overallPending = 0,
          overallInterested = 0,
          overallNotInterested = 0,
          overallDidntPick = 0,
          overallFollowUp = 0;
      
      // Aggregate counts across all active members for the date range.
      activeMembers.forEach((member) => {
        const memberLeads = filteredLeadsForReport.filter(
          (lead) => lead.assignedTo === member.id
        );
        dateArray.forEach((dateObj) => {
          const leadsForDate = memberLeads.filter((l) => {
            const d = l.notes && l.notes.length > 0 ? new Date(l.notes[l.notes.length - 1].date) : new Date(l.dateAssigned);
            return (
              d.getFullYear() === dateObj.getFullYear() &&
              d.getMonth() === dateObj.getMonth() &&
              d.getDate() === dateObj.getDate()
            );
          });
          overallContacted += leadsForDate.filter(isContacted).length;
          overallPending += leadsForDate.filter((l) => l.status === "Pending").length;
          overallInterested += leadsForDate.filter((l) => l.status === "Interested").length;
          overallNotInterested += leadsForDate.filter((l) => normalizeStatus(l.status) === "notinterested").length;
          overallDidntPick += leadsForDate.filter((l) => normalizeStatus(l.status) === "didntpick").length;
          overallFollowUp += leadsForDate.filter((l) => l.status === "Requested Call Back").length;
        });
      });
      
      report += `Daily Report from ${formatToCustomDate(startDate)} to ${formatToCustomDate(endDate)}\n\n`;
      report += "=== Active Users Aggregate Report ===\n";
      report += `  Contacted: ${overallContacted}\n`;
      report += `  Pending: ${overallPending}\n`;
      report += `  Interested: ${overallInterested}\n`;
      report += `  Not Interested: ${overallNotInterested}\n`;
      report += `  Didn't Pick: ${overallDidntPick}\n`;
      report += `  FollowUp: ${overallFollowUp}\n\n`;

      activeMembers.forEach((member) => {
        report += `Member: ${member.name}\n`;
        dateArray.forEach((dateObj) => {
          const dateStr = formatToCustomDate(dateObj);
          const leadsForDate = filteredLeadsForReport.filter((lead) => {
            if (lead.assignedTo !== member.id) return false;
            const d = lead.notes && lead.notes.length > 0 ? new Date(lead.notes[lead.notes.length - 1].date) : new Date(lead.dateAssigned);
            return (
              d.getFullYear() === dateObj.getFullYear() &&
              d.getMonth() === dateObj.getMonth() &&
              d.getDate() === dateObj.getDate()
            );
          });
          if (leadsForDate.length === 0) {
            report += `  Date: ${dateStr}: didn't work\n`;
          } else {
            const contactedCount = leadsForDate.filter(isContacted).length;
            const pendingCount = leadsForDate.filter((l) => l.status === "Pending").length;
            const interestedCount = leadsForDate.filter((l) => l.status === "Interested").length;
            const notInterestedCount = leadsForDate.filter((l) => normalizeStatus(l.status) === "notinterested").length;
            const didntPickCount = leadsForDate.filter((l) => normalizeStatus(l.status) === "didntpick").length;
            const followUpCount = leadsForDate.filter((l) => l.status === "Requested Call Back").length;
            report += `  Date: ${dateStr}\n`;
            report += `    Contacted: ${contactedCount}\n`;
            report += `    Pending: ${pendingCount}\n`;
            report += `    Interested: ${interestedCount}\n`;
            report += `    Not Interested: ${notInterestedCount}\n`;
            report += `    Didn't Pick: ${didntPickCount}\n`;
            report += `    FollowUp: ${followUpCount}\n`;
          }
        });
        report += "\n";
      });
    }
    setReportText(report);
  };

  // Function to add a note to a lead
  const handleAddNoteToLead = async () => {
    if (!selectedLead || !newNoteText.trim()) {
      // Optionally, set an error message here to inform the user
      return;
    }
    try {
      const leadRef = doc(db, "leads", selectedLead.id);
      const managerName = localStorage.getItem("managerName") || "Manager"; // Get manager's name
      await updateDoc(leadRef, {
        notes: arrayUnion({
          text: newNoteText.trim(),
          status: "Manager Note", // Or a more generic status like "Note"
          date: new Date().toISOString(),
          updatedBy: managerName, // Store who added the note
        }),
      });
      setNewNoteText(""); // Clear the textarea
      closeLeadDetails(); // Close the modal
      refreshData(); // Refresh the dashboard to show the new note
    } catch (error) {
      console.error("Error adding note to lead:", error);
      // Optionally, set an error message here
    }
  };

  // -------------------------------
  // Duplicates Grouping for the "Duplicated" KPI view
  // -------------------------------
  let duplicatesGrouped = {};
  if (selectedKpi === "Duplicated") {
    const phoneCount = {};
    filteredLeads.forEach((lead) => {
      const p = lead.phone || "";
      phoneCount[p] = (phoneCount[p] || 0) + 1;
    });
    filteredLeads.forEach((lead) => {
      const p = lead.phone || "";
      if (phoneCount[p] > 1) {
        if (!duplicatesGrouped[p]) {
          duplicatesGrouped[p] = [];
        }
        duplicatesGrouped[p].push(lead);
      }
    });
  }

  // Use custom hook to detect mobile devices.
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 sm:mb-0">
          Manager Dashboard
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded transition font-bold"
          >
            Generate Report
          </button>
          <button
            onClick={refreshData}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition font-bold"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4 sm:mb-6">
          {[
            { label: "Total Leads", value: kpiData.total, key: "All" },
            { label: "Contacted", value: kpiData.contacted, key: "Contacted" },
            { label: "Pending", value: kpiData.pending, key: "Pending" },
            { label: "Interested", value: kpiData.interested, key: "Interested" },
            { label: "Duplicated", value: kpiData.duplicated || 0, key: "Duplicated" },
            { label: "Call Back", value: kpiData.followUp || 0, key: "FollowUp" },
          ].map((kpi) => (
            <div
              key={kpi.key}
              className={`bg-gradient-to-r from-blue-500 to-blue-700 p-3 rounded-lg shadow text-center cursor-pointer transition border ${
                selectedKpi === kpi.key ? "border-2 border-white" : "border-transparent"
              }`}
              onClick={() => filterLeadsByKPI(kpi.key)}
            >
              <p className="text-xs font-bold">{kpi.label}</p>
              <p className="text-lg font-extrabold">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Delete Button for Duplicated Leads */}
        {selectedKpi === "Duplicated" && selectedLeads.length > 0 && (
          <div className="mb-4 text-center">
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold"
            >
              Delete Selected
            </button>
          </div>
        )}

        {/* Leads Table / Grouped Duplicates */}
        {selectedKpi !== "Duplicated" ? (
          <div className="overflow-x-auto border border-gray-700 rounded-lg shadow-lg">
            <table className="min-w-full bg-gray-800">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Lead Name</th>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Phone</th>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Status</th>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Assigned To</th>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Updated Date</th>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Follow Up</th>
                  <th className="p-3 text-left uppercase text-xs font-bold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer hover:bg-gray-700 transition"
                    onClick={() => openLeadDetails(lead)}
                  >
                    <td className="p-3 text-xs">{lead.leadName}</td>
                    <td className="p-3 text-xs">{lead.phone}</td>
                    <td className="p-3 text-xs">
                      {normalizeStatus(lead.status) === "didntpick" ? "Didn't Pick" : lead.status}
                    </td>
                    <td className="p-3 text-xs">{membersMap[lead.assignedTo] || "Unassigned"}</td>
                    <td className="p-3 text-xs">
                      {lead.notes && lead.notes.length > 0
                        ? formatToCustomDateTime(lead.notes[lead.notes.length - 1].date)
                        : formatToCustomDateTime(lead.dateAssigned)}
                    </td>
                    <td className="p-3 text-xs">{formatFollowUpDateTime(lead)}</td>
                    <td className="p-3 text-xs">
                        <button
                           onClick={(e) => handleDocumentation(e, lead)}
                           className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2 rounded shadow transition"
                        >
                           Documentation
                        </button>
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
        ) : (
          // Duplicated Leads grouped by phone
          Object.keys(duplicatesGrouped).length > 0 ? (
            <div className="space-y-6">
              {Object.keys(duplicatesGrouped).map((phone) => {
                const sortedGroup = duplicatesGrouped[phone].sort(
                  (a, b) => getLastUpdatedTime(b) - getLastUpdatedTime(a)
                );
                return (
                  <div key={phone} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
                    <h3 className="text-lg font-bold mb-4">Phone: {phone}</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="p-3">
                              <input
                                type="checkbox"
                                onChange={() => {
                                  const groupLeads = sortedGroup;
                                  const allSelected = groupLeads.every((l) => selectedLeads.includes(l.id));
                                  if (allSelected) {
                                    setSelectedLeads((prev) =>
                                      prev.filter((id) => !groupLeads.map((g) => g.id).includes(id))
                                    );
                                  } else {
                                    setSelectedLeads((prev) => {
                                      const newIds = groupLeads.map((g) => g.id).filter((id) => !prev.includes(id));
                                      return [...prev, ...newIds];
                                    });
                                  }
                                }}
                                checked={sortedGroup.every((l) => selectedLeads.includes(l.id))}
                                className="w-4 h-4"
                              />
                            </th>
                            <th className="p-3 uppercase text-xs font-bold text-gray-300">Lead Name</th>
                            <th className="p-3 uppercase text-xs font-bold text-gray-300">Status</th>
                            <th className="p-3 uppercase text-xs font-bold text-gray-300">Assigned To</th>
                            <th className="p-3 uppercase text-xs font-bold text-gray-300">Assigned Date</th>
                            <th className="p-3 uppercase text-xs font-bold text-gray-300">Follow Up</th>
                            <th className="p-3 uppercase text-xs font-bold text-gray-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGroup.map((lead) => (
                            <tr
                              key={lead.id}
                              className={`cursor-pointer hover:bg-gray-700 transition ${selectedLeads.includes(lead.id) ? "bg-gray-700" : ""}`}
                              onClick={() => openLeadDetails(lead)}
                            >
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedLeads.includes(lead.id)}
                                  onChange={() => handleSelectLead(lead.id)}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="p-3 text-xs">{lead.leadName}</td>
                              <td className="p-3 text-xs">
                                {normalizeStatus(lead.status) === "didntpick" ? "Didn't Pick" : lead.status}
                              </td>
                              <td className="p-3 text-xs">{membersMap[lead.assignedTo] || "Unassigned"}</td>
                              <td className="p-3 text-xs">{formatToCustomDateTime(lead.dateAssigned)}</td>
                              <td className="p-3 text-xs">{formatFollowUpDateTime(lead)}</td>
                              <td className="p-3 text-xs">
                                  <button
                                     onClick={(e) => handleDocumentation(e, lead)}
                                     className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2 rounded shadow transition"
                                  >
                                     Documentation
                                  </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400">No duplicated leads found.</p>
          )
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex justify-center items-end sm:items-center p-4">
          <div className={`${isMobile ? "w-full h-1/2" : "w-full sm:max-w-sm"} bg-gray-800 p-6 ${isMobile ? "rounded-t-lg" : "rounded-lg"} shadow-lg overflow-y-auto`}>
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
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

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex justify-center items-end sm:items-center p-4">
          <div className={`${isMobile ? "w-full h-full" : "w-full sm:max-w-md"} bg-gray-800 p-6 ${isMobile ? "" : "rounded-lg"} border border-gray-700 shadow-lg overflow-y-auto relative`}>
            <button
              onClick={closeLeadDetails}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4">{selectedLead.leadName}</h2>
            <p className="mb-2"><strong>Phone:</strong> {selectedLead.phone}</p>
            <p className="mb-2">
              <strong>Status:</strong>{" "}
              {normalizeStatus(selectedLead.status) === "didntpick" ? "Didn't Pick" : selectedLead.status}
            </p>
            <p className="mb-2">
              <strong>Assigned To:</strong> {membersMap[selectedLead.assignedTo] || "Unassigned"}
            </p>
            <p className="mb-2">
              <strong>Date Assigned:</strong>{" "}
              {formatToCustomDateTime(selectedLead.dateAssigned)}
            </p>
            <p className="mb-2">
              <strong>Date Updated:</strong>{" "}
              {selectedLead.notes && selectedLead.notes.length > 0
                ? formatToCustomDateTime(selectedLead.notes[selectedLead.notes.length - 1].date)
                : formatToCustomDateTime(selectedLead.dateAssigned)}
            </p>
            <p className="mb-2">
              <strong>Follow Up:</strong>{" "}
              {(normalizeStatus(selectedLead.status) === "didntpick" ||
                normalizeStatus(selectedLead.status) === "notinterested")
                ? "Not required"
                : selectedLead.followUpDate
                ? (
                    <>
                      {formatToCustomDate(selectedLead.followUpDate)}
                      {selectedLead.followUpTime && `, ${formatFollowUpTime(selectedLead.followUpTime)}`}
                    </>
                  )
                : "Not required"}
            </p>
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">Notes:</p>
              {selectedLead.notes && selectedLead.notes.length > 0 ? (
                [...selectedLead.notes].reverse().map((note, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg mb-3">
                    <p>
                      <strong>Status:</strong>{" "}
                      {normalizeStatus(note.status) === "didntpick"
                        ? "Didn't Pick"
                        : note.status || "N/A"}
                    </p>
                    <p><strong>Note:</strong> {note.text}</p>
                    {note.followUpDate && (
                      <p>
                        <strong>Follow-up Date:</strong>{" "}
                        {note.followUpTime
                          ? `${formatToCustomDate(note.followUpDate)}, ${formatFollowUpTime(note.followUpTime)}`
                          : formatToCustomDate(note.followUpDate)}
                      </p>
                    )}
                    {note.followUpTime && !note.followUpDate && (
                      <p><strong>Follow-up Time:</strong> {formatFollowUpTime(note.followUpTime)}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      <strong>Date:</strong> {formatToCustomDateTime(note.date)}
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
            {/* Add new note section */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 class="text-md font-bold mb-2">Add New Note</h3>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Type your note here..."
                rows="3"
                className="w-full p-2 rounded bg-gray-700 text-white resize-none mb-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleAddNoteToLead}
                disabled={!newNoteText.trim()}
                className={`bg-green-500 px-4 py-2 rounded-lg w-full hover:bg-green-600 transition font-bold text-sm ${!newNoteText.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Save Note
              </button>
            </div>
            <button
              onClick={closeLeadDetails}
              className="bg-red-500 px-4 py-2 rounded-lg w-full hover:bg-red-600 transition font-bold text-sm mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex justify-center items-end sm:items-center p-4">
          <div className={`${isMobile ? "w-full h-full" : "w-full sm:max-w-lg"} bg-gray-800 p-6 ${isMobile ? "" : "rounded-lg"} shadow-lg overflow-y-auto`}>
            <h2 className="text-xl font-bold mb-4">Generate Report</h2>
            <div className="mb-4">
              <label className="block mb-2 font-bold">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setSelectedUser("");
                }}
                className="w-full p-2 rounded bg-gray-700 text-white"
              >
                <option value="day">Day Basis (with Date Range)</option>
                <option value="user">User Basis (with Date Range)</option>
              </select>
            </div>
            {reportType === "user" && (
              <div className="mb-4">
                <label className="block mb-2 font-bold">Select User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white"
                >
                  <option value="">-- Select User --</option>
                  {assignedMembers
                    .filter((member) => member.status.toLowerCase() !== "inactive")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block mb-2 font-bold">Select Start Date (Optional)</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
              <label className="block mt-4 mb-2 font-bold">Select End Date (Optional)</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="mb-4">
              <button
                onClick={generateReport}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded transition font-bold w-full"
              >
                Generate
              </button>
            </div>
            {reportText && (
              <div className="mb-4">
                <label className="block mb-2 font-bold">Report Preview</label>
                <textarea
                  readOnly
                  value={reportText}
                  rows="10"
                  className="w-full p-2 rounded bg-gray-700 text-white resize-none"
                />
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
