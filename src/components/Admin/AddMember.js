import React, { useState, useEffect } from "react";
import { db, functions } from "../../context/FirebaseContext";
import { httpsCallable } from "firebase/functions";
import { doc, collection, getDocs, updateDoc } from "firebase/firestore";

const AddMember = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("member");
  const [referralLink, setReferralLink] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("active");
  const [assignedManager, setAssignedManager] = useState("");
  const [members, setMembers] = useState([]);
  
  const [editMode, setEditMode] = useState(false);
  const [editMemberId, setEditMemberId] = useState(null);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Fetch all members on load
  useEffect(() => {
    refreshMembers();
  }, []);

  const refreshMembers = async () => {
    const querySnapshot = await getDocs(collection(db, "members"));
    const membersData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setMembers(membersData);
  };

  const resetForm = (keepSuccess = false) => {
    setName("");
    setPhone("");
    setRole("member");
    setReferralLink("");
    setEmail("");
    setPassword("");
    setStatus("active");
    setEditMode(false);
    setEditMemberId(null);
    setAssignedManager("");
    setError("");
    if (!keepSuccess) {
      setSuccess(false);
    }
  };

  // Add new member
  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!status) {
      setError("Status is required.");
      return;
    }

    try {
      const createMember = httpsCallable(functions, 'createMember');
      const result = await createMember({
        email,
        password,
        name,
        phone,
        role,
        referralLink,
        status,
        ...(role === 'member' && assignedManager ? { assignedManager } : {})
      });

      console.log(result.data.message);

      setSuccess(true);
      resetForm(true); // Keep success message
      refreshMembers();
    } catch (err) {
      console.error("Error adding member:", err);
      // Detailed error message if email already exists
      const errorMessage = err.message.includes('already-exists') 
        ? "A member with this email already exists." 
        : err.message;
      setError(`Failed to add member: ${errorMessage}`);
    }
  };

  const handleEdit = (member) => {
    setEditMode(true);
    setEditMemberId(member.id);
    setName(member.name);
    setPhone(member.phone);
    setRole(member.role);
    setReferralLink(member.referralLink);
    setEmail(member.email);
    setStatus(member.status || "active");
    setAssignedManager(member.assignedManager || "");
    setSuccess(false);
    setError("");
  };

  // Update existing member
  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!status) {
      setError("Status is required.");
      return;
    }

    try {
      const memberRef = doc(db, "members", editMemberId);
      await updateDoc(memberRef, {
        name,
        phone,
        role,
        referralLink,
        email,
        status,
        ...(role === 'member' ? { assignedManager: assignedManager || "" } : {})
      });
      setSuccess(true);
      resetForm(true); // Keep success message
      refreshMembers();
    } catch (err) {
      console.error("Error updating member:", err);
      setError("Failed to update member. Please try again.");
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-6 text-center">Add Agent</h1>
        {success && !editMode && <p className="text-green-500 mb-4 text-center">Operation successful!</p>}
        {error && !editMode && <p className="text-red-500 mb-4 text-center">{error}</p>}

        {/* Add Agent Form */}
        {!editMode && (
          <form onSubmit={handleAddMember} className="space-y-4">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="member">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {role === 'member' && (
              <select
                value={assignedManager}
                onChange={(e) => setAssignedManager(e.target.value)}
                className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
              >
                <option value="">-- Select Assigned Manager (Optional) --</option>
                {members.filter(m => m.role === 'manager').map(manager => (
                  <option key={manager.id} value={manager.id}>{manager.name} ({manager.email})</option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="Referral Link"
              value={referralLink}
              onChange={(e) => setReferralLink(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="new-password" // Helps prevent generic email autofill
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="submit"
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded w-full font-bold transition"
            >
              Add Agent
            </button>
          </form>
        )}

        <h2 className="text-xl font-extrabold mt-10 mb-4">All Agents</h2>
        <div className="overflow-x-auto bg-gray-800 rounded shadow-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="p-3 text-left text-gray-300 font-bold uppercase text-sm tracking-wider">
                  Name
                </th>
                <th className="p-3 text-left text-gray-300 font-bold uppercase text-sm tracking-wider">
                  Email
                </th>
                <th className="p-3 text-left text-gray-300 font-bold uppercase text-sm tracking-wider">
                  Role
                </th>
                <th className="p-3 text-left text-gray-300 font-bold uppercase text-sm tracking-wider">
                  Status
                </th>
                <th className="p-3 text-left text-gray-300 font-bold uppercase text-sm tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-700 transition">
                  <td className="p-3 text-gray-100">{member.name}</td>
                  <td className="p-3 text-gray-100">{member.email}</td>
                  <td className="p-3 text-gray-100">{member.role}</td>
                  <td className="p-3 text-gray-100">{member.status || "active"}</td>
                  <td className="p-3 text-gray-100">
                    <button
                      onClick={() => handleEdit(member)}
                      className="bg-yellow-500 px-4 py-2 rounded font-bold hover:bg-yellow-600 transition text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-3 text-center text-gray-400">No agents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Popup Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md bg-gray-800 p-6 rounded shadow-lg border border-gray-700">
            <h2 className="text-xl font-extrabold mb-4 text-center">Edit Agent</h2>
            {success && <p className="text-green-500 mb-4 text-center">Operation successful!</p>}
            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {role === 'member' && (
                <select
                  value={assignedManager}
                  onChange={(e) => setAssignedManager(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                >
                  <option value="">-- Select Assigned Manager (Optional) --</option>
                  {members.filter(m => m.role === 'manager').map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.name} ({manager.email})</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="Referral Link"
                value={referralLink}
                onChange={(e) => setReferralLink(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="w-full p-3 bg-red-500 hover:bg-red-600 rounded font-bold transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full p-3 bg-blue-500 hover:bg-blue-600 rounded font-bold transition text-center"
                >
                  Update Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMember;
