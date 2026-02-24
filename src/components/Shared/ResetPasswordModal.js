import React, { useState } from "react";
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const ResetPasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!currentPassword || !newPassword) {
      setError("Please fill in both fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user to verify current password
      // Note: The user explicitly requested to skip this step and just check the current password. 
      //       However, in Firebase Client SDK, the ONLY secure and supported way to verify a user's 
      //       current password (without a custom backend endpoint taking the password or having access 
      //       to raw passwords which Firebase doesn't allow) is to re-authenticate the user with their credentials.
      //       I will add a comment explaining this in the PR/to the user.
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Successfully re-authenticated, now update the password
      await updatePassword(user, newPassword);

      setSuccessMessage("Your password has been reset successfully");
      setCurrentPassword("");
      setNewPassword("");
      
      // Close modal after brief delay on success
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 2000);

    } catch (err) {
      console.error("Password reset error:", err);
      // Determine error type based on Firebase error code
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Current password is incorrect");
      } else if (err.code === "auth/weak-password") {
         setError("New password is too weak.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 font-sans">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative border border-gray-700">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Reset Password</h2>

        {error && (
          <div className="mb-4 bg-red-900 border border-red-500 text-red-100 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-900 border border-green-500 text-green-100 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
              disabled={loading || successMessage}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
              disabled={loading || successMessage}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || successMessage}
              className={`w-full p-3 rounded font-bold text-white transition ${
                loading || successMessage 
                  ? 'bg-blue-600 opacity-70 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
