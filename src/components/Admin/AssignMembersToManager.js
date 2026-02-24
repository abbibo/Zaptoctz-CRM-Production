import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";

const AssignMembersToManager = () => {
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  // Fetch managers and members initially
  useEffect(() => {
    const fetchData = async () => {
      try {
        const membersSnapshot = await getDocs(collection(db, "members"));
        const allMembers = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setManagers(allMembers.filter((m) => m.role === "manager"));
        setMembers(allMembers.filter((m) => m.role === "member"));
      } catch (err) {
        console.error("Error fetching members:", err);
        setError("Failed to fetch data. Please try again.");
      }
    };

    fetchData();
  }, []);

  const handleManagerChange = async (managerId) => {
    setSelectedManager(managerId);
    setAssignedMembers([]);
    setError("");
    setSuccess(false);

    if (!managerId) return;

    setLoadingAssigned(true);
    try {
      const managerDoc = await getDoc(doc(db, "members", managerId));
      if (managerDoc.exists()) {
        const data = managerDoc.data();
        setAssignedMembers(data.assignedMembers || []);
      } else {
        setAssignedMembers([]);
      }
    } catch (err) {
      console.error("Error fetching assigned members:", err);
      setError("Failed to fetch assigned members. Please try again.");
    }
    setLoadingAssigned(false);
  };

  const handleAssign = async () => {
    setError("");
    setSuccess(false);

    if (!selectedManager) {
      setError("Please select a manager.");
      return;
    }

    try {
      const managerRef = doc(db, "members", selectedManager);
      await updateDoc(managerRef, {
        assignedMembers,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Error assigning members:", err);
      setError("Failed to assign members. Please try again.");
    }
  };

  // UI Improvements:
  // - Dark gradient background
  // - Show current assigned members distinctly
  // - Clear instructions and spacing
  // - Mobile friendly, stacked layout
  // - Subtle hover and focus states for inputs and buttons

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 text-center tracking-wider text-gray-100">
          Assign Agents to Manager
        </h1>
        {success && <p className="text-green-500 mb-4 text-center font-bold">Members assigned successfully!</p>}
        {error && <p className="text-red-500 mb-4 text-center font-bold">{error}</p>}

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 space-y-4">
          <div>
            <label className="block mb-2 text-gray-400 font-bold">Select Manager</label>
            <select
              className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedManager}
              onChange={(e) => handleManagerChange(e.target.value)}
            >
              <option value="">-- Select a Manager --</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
          </div>

          {loadingAssigned ? (
            <p className="text-gray-300">Loading assigned members...</p>
          ) : (
            selectedManager && (
              <>
                <div>
                  <label className="block mb-2 text-gray-400 font-bold">Agents</label>
                  <p className="text-sm text-gray-400 mb-2">
                    Check the members you want to assign. Uncheck any currently assigned members you want to remove.
                  </p>
                  <div className="max-h-64 overflow-y-auto border border-gray-700 rounded p-3 space-y-2">
                    {members.map((member) => {
                      const isAssigned = assignedMembers.includes(member.id);
                      return (
                        <div key={member.id} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2 w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-400"
                            checked={isAssigned}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAssignedMembers((prev) =>
                                checked
                                  ? [...prev, member.id]
                                  : prev.filter((id) => id !== member.id)
                              );
                            }}
                          />
                          <label className="text-gray-200">
                            {member.name} ({member.email})
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  className={`p-3 rounded font-bold w-full transition mt-4 ${
                    !selectedManager ? "bg-gray-600 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                  }`}
                  onClick={handleAssign}
                  disabled={!selectedManager}
                >
                  Assign Agents
                </button>
              </>
            )
          )}
        </div>

        {selectedManager && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mt-10">
            <h2 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-2 mb-4">
              Currently Assigned Members
            </h2>
            {assignedMembers.length === 0 ? (
              <p className="text-gray-300">No members assigned yet.</p>
            ) : (
              <ul className="list-disc pl-6 text-gray-200 space-y-1">
                {assignedMembers.map((memberId) => {
                  const member = members.find((m) => m.id === memberId);
                  if (!member) return null;
                  return (
                    <li key={memberId} className="text-sm">
                      {member.name} ({member.email})
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignMembersToManager;
