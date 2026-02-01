// MemberLogs.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import {
  collection,
  query,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  format,
  isSameDay,
  parseISO,
  differenceInMinutes,
} from "date-fns";

const MemberLogs = () => {
  // State Variables
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState({});
  const [leads, setLeads] = useState({});
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  ); // Default to today
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState("");

  // Fetch Logs, Members, and Leads from Firestore
  const fetchLogsAndDetails = async () => {
    try {
      // Fetch Logs
      const logsQuery = query(
        collection(db, "userLogs"),
        orderBy("timestamp", "desc")
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch Members
      const membersSnapshot = await getDocs(collection(db, "members"));
      const membersData = {};
      membersSnapshot.docs.forEach((doc) => {
        membersData[doc.id] = doc.data().name;
      });

      // Fetch Leads
      const leadsSnapshot = await getDocs(collection(db, "leads"));
      const leadsData = {};
      leadsSnapshot.docs.forEach((doc) => {
        leadsData[doc.id] = doc.data().leadName;
      });

      setLogs(logsData);
      setMembers(membersData);
      setLeads(leadsData);
    } catch (err) {
      console.error("Error fetching logs, members, and leads:", err);
    }
  };

  // Calculate Total Time Spent for Selected Member with Gap Handling
  const calculateTotalTime = (logs) => {
    if (logs.length === 0) return "";

    // Convert and sort timestamps in ascending order
    const sortedLogs = logs
      .map((log) => new Date(log.timestamp).getTime())
      .sort((a, b) => a - b);

    let totalMinutes = 0;
    let sessionStart = sortedLogs[0];
    let previousTimestamp = sortedLogs[0];

    for (let i = 1; i < sortedLogs.length; i++) {
      const currentTimestamp = sortedLogs[i];
      const gap = differenceInMinutes(
        new Date(currentTimestamp),
        new Date(previousTimestamp)
      );

      if (gap <= 10) {
        // Continue the current session
        previousTimestamp = currentTimestamp;
      } else {
        // End the current session and add its duration
        const sessionEnd = previousTimestamp;
        const sessionDuration = differenceInMinutes(
          new Date(sessionEnd),
          new Date(sessionStart)
        );
        if (sessionDuration > 0) {
          totalMinutes += sessionDuration;
        }

        // Start a new session
        sessionStart = currentTimestamp;
        previousTimestamp = currentTimestamp;
      }
    }

    // Add the duration of the last session
    const lastSessionDuration = differenceInMinutes(
      new Date(previousTimestamp),
      new Date(sessionStart)
    );
    if (lastSessionDuration > 0) {
      totalMinutes += lastSessionDuration;
    }

    if (totalMinutes <= 0) return ""; // Avoid showing negative or zero time
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""} ` : ""}${
      minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""}` : ""
    }`.trim();
  };

  // Filter Logs by Member and Date
  const filterLogs = () => {
    let filtered = logs;

    if (selectedMember) {
      filtered = filtered.filter((log) => log.userId === selectedMember);
    }

    if (selectedDate) {
      filtered = filtered.filter((log) =>
        isSameDay(parseISO(log.timestamp), new Date(selectedDate))
      );
    }

    setFilteredLogs(groupLogsByLead(filtered));

    if (selectedMember) {
      const memberTime = calculateTotalTime(filtered);
      setTotalTimeSpent(memberTime);
    } else {
      setTotalTimeSpent(""); // Clear total time if no member is selected
    }
  };

  // Group Logs by Lead
  const groupLogsByLead = (logs) => {
    const groupedLogs = [];
    let currentLead = null;
    let currentGroup = [];

    logs.forEach((log) => {
      const leadId = log.metadata?.leadId || "unknown";
      if (leadId !== currentLead) {
        if (currentGroup.length > 0) groupedLogs.push(currentGroup);
        currentGroup = [];
        currentLead = leadId;
      }
      currentGroup.push(log);
    });

    if (currentGroup.length > 0) groupedLogs.push(currentGroup);
    return groupedLogs;
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchLogsAndDetails();
  }, []);

  // Re-filter logs whenever dependencies change
  useEffect(() => {
    filterLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember, selectedDate, logs]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen font-sans">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-wide text-gray-100">
          Member Logs
        </h1>
      </header>

      {/* Filters Section */}
      <section className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
        {/* Member Filter */}
        <div className="flex flex-col w-full md:w-1/2">
          <label htmlFor="member" className="text-gray-300 mb-2 font-semibold">
            Filter by Member
          </label>
          <select
            id="member"
            className="w-full p-3 bg-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
          >
            <option value="">-- All Members --</option>
            {Object.entries(members).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col w-full md:w-1/2">
          <label htmlFor="date" className="text-gray-300 mb-2 font-semibold">
            Filter by Date
          </label>
          <input
            id="date"
            type="date"
            className="w-full p-3 bg-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </section>

      {/* Total Time Spent */}
      {selectedMember && totalTimeSpent && (
        <div className="mb-6 text-lg text-gray-300 text-center">
          Total Time Spent by {members[selectedMember]}: {totalTimeSpent}
        </div>
      )}

      {/* Logs Display */}
      <section>
        {filteredLogs.length === 0 ? (
          <p className="text-gray-400 mt-6 text-center">
            No logs found for the selected filters.
          </p>
        ) : (
          <div className="space-y-6">
            {filteredLogs.map((group, index) => (
              <div
                key={index}
                className="bg-gray-800 p-6 rounded-lg shadow-md transition hover:shadow-lg"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">
                  Lead: {leads[group[0].metadata?.leadId] || "Not Found"}
                </h2>
                <ul className="space-y-3">
                  {group.map((log) => (
                    <li
                      key={log.id}
                      className="flex justify-between items-center p-3 bg-gray-700 rounded-md"
                    >
                      <div>
                        <span className="text-sm sm:text-base">
                          {format(new Date(log.timestamp), "hh:mm a")} -{" "}
                          <span className="font-medium">{log.action}</span>
                          {log.metadata?.leadName && (
                            <span className="italic text-gray-400">
                              {" "}
                              ({log.metadata.leadName})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="italic text-gray-400 text-xs sm:text-sm">
                        by {members[log.userId] || "Unknown Member"}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MemberLogs;
