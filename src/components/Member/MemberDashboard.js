import React, { useState, useEffect, useMemo } from "react";
import Confetti from "react-confetti";
import ProcessingModal from "../Shared/ProcessingModal";
import { db, auth } from "../../context/FirebaseContext";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  format,
  isSameDay,
  addDays,
  parseISO,
  compareAsc,
  isToday,
} from "date-fns";
import {
  FaPhoneAlt,
  FaWhatsapp,
  FaSearch,
  FaCopy,
  FaFileAlt,
  FaRegSmile,
  FaRegMeh,
  FaRegFrown,
  FaExclamationTriangle, // For warning icon
} from "react-icons/fa";

// Define Status Enumeration for Consistency
const STATUS = {
  PENDING: "Pending",
  NOT_INTERESTED: "Not Interested",
  DIDNT_PICK: "Didn't Pick",
  INTERESTED: "Interested",
  REQUESTED_CALL_BACK: "Requested Call Back",
  CONVERTED: "Converted",
};

// Define Reasons for "Not Interested" Status
const NOT_INTERESTED_REASONS = [
  "Students",
  "Already doing course",
  "Not interested in course",
  "Working",
  "Other",
];

const today = format(new Date(), "yyyy-MM-dd");

// Helper function to format time to AM/PM (for display purposes)
const formatTime = (time) => {
  if (!time) return "";
  const [hour, minute] = time.split(":");
  const date = new Date();
  date.setHours(parseInt(hour, 10));
  date.setMinutes(parseInt(minute, 10));
  return format(date, "hh:mm a");
};

// Helper function to generate time options in 15-minute increments
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hh = hour.toString().padStart(2, "0");
      const mm = minute.toString().padStart(2, "0");
      times.push(`${hh}:${mm}`);
    }
  }
  return times;
};

// Helper function to identify bulk notes in the 'text' field
const isBulkNote = (text) => {
  if (typeof text !== "string") return false;
  const lowerText = text.toLowerCase();
  const isBulk =
    lowerText.includes("bulk assigned") || lowerText.includes("bulk unassigned");
  if (isBulk) {
    console.log(`Bulk note detected in text: "${text}"`);
  }
  return isBulk;
};

// Helper function to format date and time in AM/PM
const getFormattedDateTime = (date, time) => {
  if (!date) return "";
  if (time) {
    const dateTime = parseISO(`${date}T${time}`);
    if (isNaN(dateTime)) return "";
    return format(dateTime, "dd-MM-yyyy hh:mm a");
  }
  const dateObj = parseISO(date);
  if (isNaN(dateObj)) return "";
  return format(dateObj, "dd-MM-yyyy");
};

const MemberDashboard = () => {
  // State Declarations
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [memberData, setMemberData] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(STATUS.PENDING);
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [status, setStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [whatsAppCopySuccess, setWhatsAppCopySuccess] = useState("");
  const [notInterestedReason, setNotInterestedReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState("");

  // New feature states
  const dailyGoal = 25; // Fixed daily goal (non-editable)
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");

  // Log events to Firestore "logs" collection
  const logEvent = async (eventType, eventData = {}) => {
    try {
      await addDoc(collection(db, "logs"), {
        userId: auth.currentUser.uid,
        userName: memberData?.name || "Unknown",
        eventType,
        eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error logging event:", error);
    }
  };

  // Fetch data from Firestore
  const fetchLeadsAndTemplates = async () => {
    try {
      const leadsQuery = query(
        collection(db, "leads"),
        where("assignedTo", "==", auth.currentUser.uid)
      );
      const leadsSnapshot = await getDocs(leadsQuery);
      const leadsData = leadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);
      filterLeadsByKpi(STATUS.PENDING, leadsData); // Default KPI

      const templatesSnapshot = await getDocs(collection(db, "templates"));
      const templatesData = templatesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTemplates(templatesData);

      const memberDoc = await getDoc(doc(db, "members", auth.currentUser.uid));
      if (memberDoc.exists()) {
        setMemberData(memberDoc.data());
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchLeadsAndTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // Filter leads based on selected KPI
  const filterLeadsByKpi = (kpi, leadsData = leads) => {
    setSelectedKpi(kpi);
    let filtered = [];
    if (kpi === STATUS.PENDING) {
      filtered = leadsData.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.PENDING.toLowerCase()
      );
    } else if (kpi === "Contacted") {
      filtered = leadsData.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() !== STATUS.PENDING.toLowerCase() &&
          lead.dateUpdated === today
      );
    } else if (kpi === "Follow-Up") {
      filtered = leadsData.filter((lead) => {
        return (
          lead.status &&
          [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status) &&
          lead.followUpDate
        );
      });
      filtered.sort((a, b) => {
        const todayDate = new Date();
        const aDate = parseISO(a.followUpDate);
        const bDate = parseISO(b.followUpDate);
        const isAToday = isSameDay(aDate, todayDate);
        const isBToday = isSameDay(bDate, todayDate);
        if (isAToday && !isBToday) return -1;
        if (!isAToday && isBToday) return 1;
        if (isAToday && isBToday) {
          if (a.followUpTime && b.followUpTime) {
            return compareAsc(
              parseISO(`1970-01-01T${a.followUpTime}:00Z`),
              parseISO(`1970-01-01T${b.followUpTime}:00Z`)
            );
          } else if (a.followUpTime) return -1;
          else if (b.followUpTime) return 1;
          else return 0;
        }
        if (aDate < bDate) return -1;
        if (aDate > bDate) return 1;
        if (a.followUpTime && b.followUpTime) {
          return compareAsc(
            parseISO(`1970-01-01T${a.followUpTime}:00Z`),
            parseISO(`1970-01-01T${b.followUpTime}:00Z`)
          );
        } else if (a.followUpTime) return -1;
        else if (b.followUpTime) return 1;
        else return 0;
      });
    } else if (kpi === "All") {
      filtered = leadsData.filter((lead) => {
        if (
          lead.status &&
          [STATUS.DIDNT_PICK.toLowerCase(), STATUS.NOT_INTERESTED.toLowerCase()].includes(
            lead.status.trim().toLowerCase()
          )
        ) {
          return lead.dateUpdated === today;
        }
        return true;
      });
    }
    setFilteredLeads(filtered);
  };

  // Open Lead Details Modal
  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setStatus("");
    setNotes("");
    setFollowUpDate("");
    setFollowUpTime("");
    setSelectedTemplate("");
    setPreviewMessage("");
    setStatusUpdateError("");
    setSuccessMessage("");
    setCopySuccess("");
    setNotInterestedReason("");
  };

  const closeLeadDetails = () => {
    setSelectedLead(null);
    setStatus("");
    setNotes("");
    setFollowUpDate("");
    setFollowUpTime("");
    setSelectedTemplate("");
    setPreviewMessage("");
    setStatusUpdateError("");
    setSuccessMessage("");
    setCopySuccess("");
    setNotInterestedReason("");
  };

  const handleDocumentation = async (e, lead) => {
    e.stopPropagation();
    if (window.confirm("Do you want to start the documentation process?")) {
      setIsProcessing(true);
      setProcessMessage("Starting documentation process...");
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
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // WhatsApp Modal handling
  const openWhatsAppModal = (lead) => {
    setSelectedLead(lead);
    setShowWhatsAppModal(true);
    setWhatsAppCopySuccess("");
  };

  const closeWhatsAppModal = () => {
    setShowWhatsAppModal(false);
    setSelectedTemplate("");
    setPreviewMessage("");
    setWhatsAppCopySuccess("");
  };

  const handleTemplateSelection = (templateContent) => {
    if (!memberData || !selectedLead) return;
    const message = templateContent
      .replace("{member name}", memberData.name || "")
      .replace("{phone number}", memberData.number || "")
      .replace("{link}", memberData.referralLink || "")
      .replace("{lead name}", selectedLead.leadName || "");
    setSelectedTemplate(templateContent);
    setPreviewMessage(message);
    setWhatsAppCopySuccess("");
  };

  const sendWhatsApp = () => {
    const phoneNumber = `+91${selectedLead.phone}`;
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      previewMessage
    )}`;
    window.open(whatsappURL, "_blank");
    closeWhatsAppModal();
  };

  // Handle Status Change and Update Lead
  const handleStatusChange = async () => {
    setStatusUpdateError("");
    setSuccessMessage("");

    if (!status) {
      setStatusUpdateError("Please select a status.");
      return;
    }

    if (["Interested", "Requested Call Back"].includes(status)) {
      if (!followUpDate) {
        setStatusUpdateError("Follow-Up Date is required for the selected status.");
        return;
      }
      if (followUpTime) {
        const selectedDate = new Date(followUpDate);
        const now = new Date();
        if (isSameDay(selectedDate, now)) {
          const [hour, minute] = followUpTime.split(":");
          const selectedDateTime = new Date();
          selectedDateTime.setHours(parseInt(hour, 10));
          selectedDateTime.setMinutes(parseInt(minute, 10));
          if (selectedDateTime < now) {
            setStatusUpdateError("Cannot select past time for today.");
            return;
          }
        }
      }
    }

    if (status === STATUS.NOT_INTERESTED && !notInterestedReason) {
      setStatusUpdateError("Please select a reason for 'Not Interested'.");
      return;
    }

    setIsProcessing(true);
    setProcessMessage("Updating lead status...");

    try {
      const leadRef = doc(db, "leads", selectedLead.id);
      const newNotes = [
        ...(selectedLead.notes || []),
        {
          text: notes || "",
          status,
          date: new Date().toISOString(),
          updatedBy: memberData?.name || "Agent",
          followUpDate:
            ["Interested", "Requested Call Back"].includes(status) ? followUpDate : null,
          followUpTime:
            ["Interested", "Requested Call Back"].includes(status) ? followUpTime || null : null,
          reason: status === STATUS.NOT_INTERESTED ? notInterestedReason : null,
        },
      ];

      let updatePayload = { status, notes: newNotes, dateUpdated: today };

      if (status === STATUS.DIDNT_PICK) {
        const nextDate = addDays(new Date(), 1);
        updatePayload = {
          ...updatePayload,
          followUpDate: selectedLead.rescheduled ? null : format(nextDate, "yyyy-MM-dd"),
          rescheduled: true,
        };
      } else {
        updatePayload = {
          ...updatePayload,
          followUpDate:
            ["Interested", "Requested Call Back"].includes(status) ? followUpDate : null,
          followUpTime:
            ["Interested", "Requested Call Back"].includes(status) ? followUpTime || null : null,
        };
      }

      await updateDoc(leadRef, updatePayload);
      setSuccessMessage("Status updated successfully.");
      closeLeadDetails();
      fetchLeadsAndTemplates();
    } catch (err) {
      console.error("Error updating status:", err);
      setStatusUpdateError("Failed to update status.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Daily Work Report
  const generateDailyReport = () => {
    if (!memberData) {
      alert("Agent data not available.");
      return;
    }
    const currentDate = new Date();
    const formattedDate = format(currentDate, "MMMM dd, yyyy");
    const formattedTime = format(currentDate, "hh:mm a");
    const callsMadeToday = leads.filter((lead) => lead.dateUpdated === today).length;
    const statusBreakdownToday = {
      Pending: leads.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.PENDING.toLowerCase() &&
          lead.dateUpdated === today
      ).length,
      Interested: leads.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.INTERESTED.toLowerCase() &&
          lead.dateUpdated === today
      ).length,
      "Requested Call Back": leads.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.REQUESTED_CALL_BACK.toLowerCase() &&
          lead.dateUpdated === today
      ).length,
      "Not Interested": leads.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.NOT_INTERESTED.toLowerCase() &&
          lead.dateUpdated === today
      ).length,
      "Didn't Pick (Dead Lead)": leads.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.DIDNT_PICK.toLowerCase() &&
          lead.dateUpdated === today
      ).length,
      Converted: leads.filter(
        (lead) =>
          lead.status &&
          lead.status.trim().toLowerCase() === STATUS.CONVERTED.toLowerCase() &&
          lead.dateUpdated === today
      ).length,
    };

    const followUpsScheduledToday = leads.filter(
      (lead) =>
        lead.followUpDate === today &&
        [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status)
    ).length;

    const followUpsScheduledTomorrow = leads.filter((lead) => {
      if (!lead.followUpDate) return false;
      const fDate = parseISO(lead.followUpDate);
      if (isNaN(fDate)) return false;
      const tomorrow = addDays(new Date(), 1);
      return (
        isSameDay(fDate, tomorrow) &&
        [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status)
      );
    }).length;

    const report = `
📅 **Daily Work Report - ${formattedDate} ${formattedTime}**

**👤 Name:** ${memberData.name || "N/A"}  
**📊 Total Calls Made Today:** ${callsMadeToday}

**📊 Status Breakdown Today:**  
- Pending: ${statusBreakdownToday.Pending}  
- Interested: ${statusBreakdownToday.Interested}  
- Requested Call Back: ${statusBreakdownToday["Requested Call Back"]}  
- Not Interested: ${statusBreakdownToday["Not Interested"]}  
- Didn't Pick (Dead Lead): ${statusBreakdownToday["Didn't Pick (Dead Lead)"]}  
- Converted: ${statusBreakdownToday.Converted}

**🔄 Follow-Ups Scheduled:**  
- Today: ${followUpsScheduledToday}  
- Tomorrow: ${followUpsScheduledTomorrow}
    `.trim();

    setReportMessage(report);
    setShowReportModal(true);
  };

  // Search filtering
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const displayedLeads = useMemo(() => {
    if (!searchQuery) return filteredLeads;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return filteredLeads.filter(
      (lead) =>
        (lead.leadName && lead.leadName.toLowerCase().includes(lowerCaseQuery)) ||
        (lead.phone && lead.phone.includes(lowerCaseQuery))
    );
  }, [searchQuery, filteredLeads]);

  // Count calls made today and check if exactly equal to the goal
  const callsMadeCount = leads.filter((lead) => lead.dateUpdated === today).length;
  const goalAchieved = callsMadeCount === dailyGoal;

  // Calculate missed follow-ups (for days before today)
  const missedFollowupCount = useMemo(() => {
    return leads.filter(
      (lead) =>
        lead.followUpDate &&
        [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status) &&
        lead.followUpDate < today
    ).length;
  }, [leads]);

  // Calculate follow-ups scheduled for today
  const todayFollowupCount = useMemo(() => {
    return leads.filter(
      (lead) =>
        lead.followUpDate === today &&
        [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status)
    ).length;
  }, [leads]);

  // Total pending follow-ups include missed and today's
  const totalPendingFollowupCount = missedFollowupCount + todayFollowupCount;

  // Show mood popup only after at least 2 calls are made (not on initial load)
  useEffect(() => {
    const moodFlag = localStorage.getItem(`moodShown_${today}`);
    if (callsMadeCount >= 2 && !moodFlag) {
      setShowMoodPopup(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callsMadeCount, today]);

  const handleMoodSelection = (selectedMood) => {
    localStorage.setItem(`moodShown_${today}`, "true");
    setShowMoodPopup(false);
    logEvent("MoodSelected", { mood: selectedMood });
  };

  // Show confetti when goal is reached exactly (if not already shown)
  useEffect(() => {
    const partyFlag = localStorage.getItem(`partyShown_${today}`);
    if (goalAchieved && !partyFlag) {
      setShowConfetti(true);
      localStorage.setItem(`partyShown_${today}`, "true");
      logEvent("GoalCompleted", { callsMadeCount, dailyGoal });
      setTimeout(() => setShowConfetti(false), 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalAchieved, callsMadeCount, today, dailyGoal]);

  // Show feedback modal after goal is reached, with a Skip option
  useEffect(() => {
    const feedbackFlag = localStorage.getItem(`feedbackGiven_${today}`);
    if (goalAchieved && !feedbackFlag) {
      setTimeout(() => setShowFeedbackModal(true), 6000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalAchieved, today]);

  // Require nonempty feedback text on submission
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      alert("Feedback is required. Please enter your feedback or click Skip.");
      return;
    }
    setIsProcessing(true);
    setProcessMessage("Submitting feedback...");
    try {
      await logEvent("FeedbackSubmitted", { feedback: feedbackText });
      localStorage.setItem(`feedbackGiven_${today}`, "true");
      setFeedbackText("");
      setShowFeedbackModal(false);
    } catch (err) {
      console.error("Error submitting feedback:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFeedbackSkip = () => {
    localStorage.setItem(`feedbackGiven_${today}`, "true");
    setShowFeedbackModal(false);
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-900 text-white min-h-screen font-sans">
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      {/* Enhanced Warning UI for Pending Follow-Ups */}
      {totalPendingFollowupCount > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-700 via-red-600 to-red-500 rounded-lg shadow-2xl flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-white mr-3 text-3xl" />
            <div>
              <p className="text-2xl font-extrabold text-white">
                {totalPendingFollowupCount} Pending Follow-Up
                {totalPendingFollowupCount > 1 ? "s" : ""}
              </p>
              <p className="text-lg text-white">
                {missedFollowupCount > 0
                  ? `${missedFollowupCount} missed, `
                  : ""}
                {todayFollowupCount} scheduled for today.
              </p>
            </div>
          </div>
          <button
            onClick={() => filterLeadsByKpi("Follow-Up")}
            className="mt-4 sm:mt-0 px-6 py-3 bg-white text-red-700 font-bold rounded hover:bg-gray-100 transition"
          >
            View Follow-Ups
          </button>
        </div>
      )}

      <h1 className="text-xl sm:text-2xl font-extrabold mb-4 text-center tracking-wider text-gray-100">
        Agent Dashboard
      </h1>

      {/* Search Bar and Generate Report Button */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="relative w-full sm:w-auto mb-4 sm:mb-0">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or number..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <button
          onClick={generateDailyReport}
          className="flex items-center bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-bold"
        >
          <FaFileAlt className="mr-2" />
          Generate Report
        </button>
      </div>

      {/* KPI Section */}
      <div className="mb-5">
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto sm:overflow-x-visible">
          {["All", "Contacted", "Pending", "Follow-Up"].map((kpi) => {
            let count = 0;
            const leadsExcludingBulk = leads.filter(
              (lead) => lead.status && !isBulkNote(lead.text)
            );
            if (kpi === "All") {
              count = leadsExcludingBulk.filter((lead) => {
                if (
                  lead.status &&
                  [STATUS.DIDNT_PICK.toLowerCase(), STATUS.NOT_INTERESTED.toLowerCase()].includes(
                    lead.status.trim().toLowerCase()
                  )
                ) {
                  return lead.dateUpdated === today;
                }
                return true;
              }).length;
            } else if (kpi === "Contacted") {
              count = leadsExcludingBulk.filter(
                (lead) =>
                  lead.status &&
                  lead.status.trim().toLowerCase() !== STATUS.PENDING.toLowerCase() &&
                  lead.dateUpdated === today
              ).length;
            } else if (kpi === "Pending") {
              count = leadsExcludingBulk.filter(
                (lead) =>
                  lead.status &&
                  lead.status.trim().toLowerCase() === STATUS.PENDING.toLowerCase()
              ).length;
            } else if (kpi === "Follow-Up") {
              count = leadsExcludingBulk.filter((lead) => {
                return (
                  lead.status &&
                  [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status) &&
                  lead.followUpDate
                );
              }).length;
            }
            const isActive = selectedKpi === kpi;
            return (
              <div
                key={kpi}
                className={`flex-shrink-0 sm:flex-shrink sm:flex-grow cursor-pointer p-2 sm:p-3 rounded-lg shadow text-center border border-gray-700 transition ${
                  isActive ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"
                } min-w-[110px] sm:min-w-0`}
                onClick={() => filterLeadsByKpi(kpi)}
              >
                <p className="text-xs sm:text-sm font-bold text-white">
                  {kpi} Leads
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-white">
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Daily Goal with Progress Bar */}
      <div className="mb-4 p-2 bg-gray-800 rounded text-center">
        <div className="w-full bg-gray-700 rounded-full h-3 mb-1">
          <div
            className="bg-green-500 h-3 rounded-full"
            style={{ width: `${Math.min((callsMadeCount / dailyGoal) * 100, 100)}%` }}
          ></div>
        </div>
        <span className="text-sm">
          {callsMadeCount <= dailyGoal
            ? `${callsMadeCount} of ${dailyGoal} calls made today`
            : `Target achieved (${callsMadeCount} calls made)`}
        </span>
      </div>

      {/* Leads Section */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayedLeads.length > 0 ? (
          displayedLeads.map((lead) => {
            let badgeContent = "";
            let badgeColor = "";
            if (
              lead.status &&
              lead.status.trim().toLowerCase() === STATUS.PENDING.toLowerCase()
            ) {
              badgeContent = "New";
              badgeColor = "bg-green-500";
            } else if (
              lead.status &&
              lead.status.trim().toLowerCase() === STATUS.NOT_INTERESTED.toLowerCase()
            ) {
              badgeContent = "Not Interested";
              badgeColor = "bg-red-500";
            } else if (
              lead.status &&
              lead.status.trim().toLowerCase() === STATUS.DIDNT_PICK.toLowerCase()
            ) {
              badgeContent = "Dead Lead";
              badgeColor = "bg-red-600";
            } else if (
              lead.status &&
              lead.status.trim().toLowerCase() === STATUS.CONVERTED.toLowerCase()
            ) {
              badgeContent = "Converted";
              badgeColor = "bg-green-700";
            } else if (
              lead.status &&
              [STATUS.INTERESTED, STATUS.REQUESTED_CALL_BACK].includes(lead.status)
            ) {
              const followUpDateObj = parseISO(lead.followUpDate);
              const isFollowUpToday = isToday(followUpDateObj);
              badgeContent = isFollowUpToday
                ? lead.followUpTime
                  ? `Today ${formatTime(lead.followUpTime)}`
                  : "Today"
                : format(followUpDateObj, "dd-MM-yyyy");
              badgeContent = `Follow-Up: ${badgeContent}`;
              badgeColor = "bg-yellow-500";
            }
            return (
              <div
                key={lead.id}
                className="bg-gray-800 p-3 rounded-lg shadow border border-gray-700 cursor-pointer hover:shadow-xl hover:bg-gray-700 transition relative"
                onClick={() => openLeadDetails(lead)}
              >
                <h2 className="text-base sm:text-lg font-bold text-gray-100 mb-0.5">
                  {lead.leadName}
                </h2>
                <p className="text-xs text-gray-400">
                  Assigned: {format(new Date(lead.dateAssigned), "dd-MM-yyyy")}
                </p>
                <span
                  className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs text-white ${badgeColor}`}
                >
                  {badgeContent}
                </span>
                <div className="mt-3 text-right">
                  <button
                    onClick={(e) => handleDocumentation(e, lead)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded shadow transition"
                  >
                    Documentation
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="col-span-full text-center text-gray-400">
            {selectedKpi === "All"
              ? "No leads found."
              : selectedKpi === "Pending"
              ? "No pending leads found."
              : selectedKpi === "Contacted"
              ? "No contacted leads found for today."
              : selectedKpi === "Follow-Up"
              ? "No follow-up leads found."
              : "No leads found."}
          </p>
        )}
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="relative w-full max-w-md">
            <div className="bg-gray-800 bg-opacity-90 backdrop-filter backdrop-blur-md p-6 rounded-lg border border-gray-700 shadow-2xl max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-100">
                  {selectedLead.leadName}
                </h2>
                <div className="flex space-x-4">
                  <FaWhatsapp
                    onClick={() => openWhatsAppModal(selectedLead)}
                    className="text-green-500 text-2xl cursor-pointer hover:text-green-400 transition"
                    title="Send WhatsApp"
                  />
                  <FaPhoneAlt
                    onClick={() => window.open(`tel:${selectedLead.phone}`)}
                    className="text-blue-500 text-2xl cursor-pointer hover:text-blue-400 transition"
                    title="Call Phone Number"
                  />
                  <FaCopy
                    onClick={() => {
                      navigator.clipboard
                        .writeText(selectedLead.phone)
                        .then(() => {
                          setCopySuccess("Phone number copied to clipboard!");
                          setTimeout(() => setCopySuccess(""), 2000);
                        })
                        .catch((err) => {
                          console.error("Failed to copy: ", err);
                          setCopySuccess("Failed to copy phone number.");
                          setTimeout(() => setCopySuccess(""), 2000);
                        });
                    }}
                    className="text-gray-400 text-2xl cursor-pointer hover:text-gray-300 transition"
                    title="Copy phone number"
                  />
                </div>
              </div>
              {copySuccess && (
                <p className="text-green-500 text-sm mb-4">{copySuccess}</p>
              )}
              <p className="text-sm sm:text-md text-gray-400 mb-4">
                <strong className="text-gray-200">Assigned Date:</strong>{" "}
                {format(new Date(selectedLead.dateAssigned), "dd-MM-yyyy")}
              </p>

              {/* Status Update */}
              <div className="mb-4">
                <label className="block mb-2 text-gray-200 font-bold">
                  Update Status
                </label>
                <select
                  className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">-- Select Status --</option>
                  <option value={STATUS.NOT_INTERESTED}>
                    {STATUS.NOT_INTERESTED}
                  </option>
                  <option value={STATUS.DIDNT_PICK}>
                    {STATUS.DIDNT_PICK}
                  </option>
                  <option value={STATUS.INTERESTED}>
                    {STATUS.INTERESTED}
                  </option>
                  <option value={STATUS.REQUESTED_CALL_BACK}>
                    {STATUS.REQUESTED_CALL_BACK}
                  </option>
                  <option value={STATUS.CONVERTED}>{STATUS.CONVERTED}</option>
                </select>
              </div>

              {/* Reason Dropdown for "Not Interested" */}
              {status === STATUS.NOT_INTERESTED && (
                <div className="mb-4">
                  <label className="block mb-2 text-gray-200 font-bold">
                    Reason for Not Interested
                  </label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={notInterestedReason}
                    onChange={(e) => setNotInterestedReason(e.target.value)}
                  >
                    <option value="">-- Select Reason --</option>
                    {NOT_INTERESTED_REASONS.map((reason, index) => (
                      <option key={index} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Follow-Up Date and Time for specific statuses */}
              {["Interested", "Requested Call Back"].includes(status) && (
                <>
                  <div className="mb-4">
                    <label className="block mb-2 text-gray-200 font-bold">
                      Follow-Up Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={followUpDate}
                      min={today}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2 text-gray-200 font-bold">
                      Follow-Up Time (Optional)
                    </label>
                    <select
                      value={followUpTime}
                      onChange={(e) => {
                        const selectedTime = e.target.value;
                        if (followUpDate === today) {
                          const now = new Date();
                          const [selHour, selMinute] = selectedTime.split(":").map(Number);
                          const selectedDateTime = new Date();
                          selectedDateTime.setHours(selHour, selMinute, 0, 0);
                          if (selectedDateTime < now) {
                            alert("Cannot select past time for today");
                            return;
                          }
                        }
                        setFollowUpTime(selectedTime);
                      }}
                      className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Time --</option>
                      {generateTimeOptions().map((timeOption) => (
                        <option key={timeOption} value={timeOption}>
                          {formatTime(timeOption)}
                        </option>
                      ))}
                    </select>
                    {followUpTime && (
                      <p className="mt-1 text-xs text-gray-400">
                        Selected Time: {formatTime(followUpTime)}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Notes */}
              <div className="mb-4">
                <label className="block mb-2 text-gray-200 font-bold">
                  Notes
                </label>
                <textarea
                  className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              {/* Status History */}
              <div className="mb-6">
                <h3 className="text-gray-200 font-bold mb-2">
                  Status History
                </h3>
                {selectedLead.notes && selectedLead.notes.length > 0 ? (
                  selectedLead.notes
                    .filter((note) => !isBulkNote(note.text))
                    .slice()
                    .reverse()
                    .map((note, index) => (
                      <div
                        key={index}
                        className="bg-gray-700 p-3 rounded-lg mb-3 shadow-sm text-xs"
                      >
                        <p className="text-gray-100 font-semibold">
                          <strong>Status:</strong> {note.status || "N/A"}
                        </p>
                        <p className="text-gray-300">
                          <strong>Note:</strong> {note.text || "N/A"}
                        </p>
                        {note.followUpDate && (
                          <p className="text-gray-300">
                            <strong>Follow-Up:</strong>{" "}
                            {getFormattedDateTime(note.followUpDate, note.followUpTime)}
                          </p>
                        )}
                        {note.reason && (
                          <p className="text-gray-300">
                            <strong>Reason:</strong> {note.reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {format(new Date(note.date), "dd-MM-yyyy hh:mm a")}
                        </p>
                        {note.updatedBy && (
                          <p className="text-xs text-gray-500">
                            <strong>Updated By:</strong> {note.updatedBy}
                          </p>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-gray-400 text-xs">No history available.</p>
                )}
              </div>

              {statusUpdateError && (
                <p className="text-red-500 mb-2 text-sm animate-pulse">
                  {statusUpdateError}
                </p>
              )}
              {successMessage && (
                <p className="text-green-500 mb-2 text-sm animate-pulse">
                  {successMessage}
                </p>
              )}

              <div className="flex justify-between">
                <button
                  onClick={closeLeadDetails}
                  className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition text-sm font-bold"
                >
                  Close
                </button>
                <button
                  onClick={handleStatusChange}
                  className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition text-sm font-bold"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="relative w-full max-w-md">
            <div className="bg-gray-800 bg-opacity-90 backdrop-filter backdrop-blur-md p-6 rounded-lg border border-gray-700 shadow-2xl max-h-[80vh] overflow-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-100">
                Send WhatsApp
              </h2>
              <div className="mb-4">
                <label className="block mb-2 text-gray-200 font-bold">
                  Select Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelection(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.content}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              {previewMessage && (
                <div className="relative bg-gray-700 p-4 rounded-lg mb-4 shadow-sm">
                  <strong className="block text-gray-200 mb-2">
                    Preview:
                  </strong>
                  <p className="text-gray-100 whitespace-pre-wrap">
                    {previewMessage}
                  </p>
                  <FaCopy
                    onClick={() => {
                      navigator.clipboard
                        .writeText(previewMessage)
                        .then(() => {
                          setWhatsAppCopySuccess("Message copied to clipboard!");
                          setTimeout(() => setWhatsAppCopySuccess(""), 2000);
                        })
                        .catch((err) => {
                          console.error("Failed to copy: ", err);
                          setWhatsAppCopySuccess("Failed to copy message.");
                          setTimeout(() => setWhatsAppCopySuccess(""), 2000);
                        });
                    }}
                    className="text-gray-400 text-xl cursor-pointer hover:text-gray-300 transition absolute top-2 right-2"
                    title="Copy message"
                  />
                  {whatsAppCopySuccess && (
                    <p className="text-green-500 text-sm mt-2">
                      {whatsAppCopySuccess}
                    </p>
                  )}
                  <button
                    onClick={sendWhatsApp}
                    className="mt-3 bg-green-500 px-4 py-2 rounded hover:bg-green-600 transition text-sm font-bold"
                  >
                    Send WhatsApp
                  </button>
                </div>
              )}
              <button
                onClick={closeWhatsAppModal}
                className="bg-red-500 px-4 py-2 rounded w-full hover:bg-red-600 transition text-sm font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Work Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="relative w-full max-w-lg">
            <div className="bg-gray-800 bg-opacity-90 backdrop-filter backdrop-blur-md p-6 rounded-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-100">
                  Daily Work Report
                </h2>
                <div className="flex space-x-2">
                  <FaCopy
                    onClick={() => {
                      navigator.clipboard
                        .writeText(reportMessage)
                        .then(() => {
                          alert("Report copied to clipboard!");
                        })
                        .catch((err) => {
                          console.error("Failed to copy: ", err);
                          alert("Failed to copy report.");
                        });
                    }}
                    className="text-gray-400 text-xl cursor-pointer hover:text-gray-300 transition"
                    title="Copy Report"
                  />
                  <FaWhatsapp
                    onClick={() => {
                      const whatsappURL = `https://wa.me/?text=${encodeURIComponent(
                        reportMessage
                      )}`;
                      window.open(whatsappURL, "_blank");
                    }}
                    className="text-green-500 text-xl cursor-pointer hover:text-green-400 transition"
                    title="Share via WhatsApp"
                  />
                </div>
              </div>
              <textarea
                readOnly
                value={reportMessage}
                className="w-full p-4 bg-gray-700 rounded-lg focus:outline-none resize-none text-sm text-white"
                rows={15}
              ></textarea>
              <button
                onClick={() => setShowReportModal(false)}
                className="mt-4 bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition text-sm font-bold w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mood Popup Modal */}
      {showMoodPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-2xl text-center max-w-sm">
            <h2 className="text-lg font-bold mb-3">How are you feeling today?</h2>
            <p className="mb-3 text-xs text-gray-400">
              (We won't share this data with others.)
            </p>
            <div className="flex justify-around mb-3">
              <button
                onClick={() => handleMoodSelection("Happy")}
                className="flex flex-col items-center bg-green-600 p-3 rounded hover:bg-green-500"
              >
                <FaRegSmile className="text-xl" />
                <span className="text-xs">Happy</span>
              </button>
              <button
                onClick={() => handleMoodSelection("Neutral")}
                className="flex flex-col items-center bg-yellow-600 p-3 rounded hover:bg-yellow-500"
              >
                <FaRegMeh className="text-xl" />
                <span className="text-xs">Neutral</span>
              </button>
              <button
                onClick={() => handleMoodSelection("Sad")}
                className="flex flex-col items-center bg-red-600 p-3 rounded hover:bg-red-500"
              >
                <FaRegFrown className="text-xl" />
                <span className="text-xs">Sad</span>
              </button>
            </div>
            <button
              onClick={() => setShowMoodPopup(false)}
              className="bg-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal (smaller) */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-auto">
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-2xl text-center" style={{ maxWidth: "250px" }}>
            <h2 className="text-base font-bold mb-2 text-white">We Value Your Feedback</h2>
            <textarea
              placeholder="Please share your feedback..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-xs mb-2 resize-none"
              rows={2}
            ></textarea>
            <div className="flex justify-between">
              <button
                onClick={handleFeedbackSkip}
                className="bg-gray-600 px-2 py-1 rounded text-xs font-bold hover:bg-gray-500"
              >
                Skip
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="bg-blue-500 px-2 py-1 rounded text-xs font-bold hover:bg-blue-600"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <ProcessingModal isOpen={isProcessing} message={processMessage} />
    </div>
  );
};

export default MemberDashboard;
