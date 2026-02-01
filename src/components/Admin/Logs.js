import React, { useState, useEffect } from "react";
import { db, auth } from "../../context/FirebaseContext";
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { format, parseISO } from "date-fns";

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper function to fetch logs from the "logs" collection, sorted by timestamp descending
  const fetchLogs = async () => {
    try {
      const logsQuery = query(
        collection(db, "logs"),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(logsQuery);
      const logsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLogs(logsData);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to fetch logs.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch admin information from the "members" collection
  const fetchAdminData = async () => {
    try {
      const adminDoc = await getDoc(doc(db, "members", auth.currentUser.uid));
      if (adminDoc.exists()) {
        setAdminData(adminDoc.data());
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError("Failed to fetch admin data.");
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchAdminData();
  }, []);

  // Format eventData based on eventType
  const formatEventData = (eventType, eventData) => {
    if (!eventData) return "N/A";
    if (eventType === "GoalCompleted") {
      // Expect eventData like: { callsMadeCount: X, dailyGoal: Y }
      const { callsMadeCount, dailyGoal } = eventData;
      return `Goal Completed: ${callsMadeCount} calls made out of ${dailyGoal}`;
    }
    if (eventType === "FeedbackSubmitted") {
      // Expect eventData like: { feedback: "Some text" }
      return `Feedback Submitted: ${eventData.feedback}`;
    }
    if (eventType === "MoodSelected") {
      // Expect eventData like: { mood: "Happy" }
      return `Mood Selected: ${eventData.mood}`;
    }
    return JSON.stringify(eventData);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold">
          Admin Dashboard
        </h1>
        {adminData && (
          <p className="mt-2 text-xl text-gray-300">
            Welcome, {adminData.name}!
          </p>
        )}
      </header>

      {/* Main Content */}
      {loading ? (
        <p className="text-center text-lg">Loading logs...</p>
      ) : error ? (
        <p className="text-center text-red-500 text-lg">{error}</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-lg">No logs found.</p>
      ) : (
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide">
                  User Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide">
                  Event Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide">
                  Event Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-600 transition-colors duration-200"
                >
                  <td className="px-4 py-3 text-sm">
                    {log.timestamp
                      ? format(parseISO(log.timestamp), "PPpp")
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {log.userName || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {log.eventType || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatEventData(log.eventType, log.eventData)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
