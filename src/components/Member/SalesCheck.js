import React, { useState, useEffect } from "react";
import { auth, db } from "../../context/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";

export default function SalesCheck() {
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [referralUsers, setReferralUsers] = useState([]);
  const [error, setError] = useState("");

  // Helper function to format date and time.
  // It checks if the timestamp has a toDate() method, else assumes it is a valid Date.
  const formatDateTime = (timestamp) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      return "Invalid Date";
    }
  };

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }

      try {
        // Fetch user doc from 'members' collection.
        const userDocRef = doc(db, "members", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          setError("User data not found.");
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const referralLink = userData.referralLink;
        if (!referralLink) {
          setError("No referral link found for this user.");
          setLoading(false);
          return;
        }

        // Extract the last 8 characters from referralLink.
        const referralCode = referralLink.slice(-8);
        console.log("Referral Code extracted:", referralCode);

        // Call the /check-sales endpoint.
        const response = await fetch("https://payments.zaptockz.online/check-sales", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ referralCode }),
        });

        if (!response.ok) {
          // Try to extract an error message from the response.
          let respData;
          try {
            respData = await response.json();
          } catch (parseError) {
            console.error("Error parsing error response:", parseError);
          }
          const errorMsg = respData && respData.message 
            ? respData.message 
            : `Failed to fetch sales data. (HTTP ${response.status})`;
          setError(errorMsg);
          setLoading(false);
          return;
        }

        const result = await response.json();
        console.log("Response from /check-sales:", result);

        // Check if the expected properties exist.
        if (typeof result.totalSales === "undefined") {
          console.error("totalSales not found in the response:", result);
          setError("Sales data is incomplete.");
          setLoading(false);
          return;
        }

        setTotalSales(result.totalSales);
        setTotalUnpaid(result.totalUnpaid);
        setReferralUsers(result.referralUsers || []);
      } catch (err) {
        console.error("Error fetching sales:", err);
        setError("Failed to fetch sales data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <p>Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Sales Check</h1>
      <div className="mb-8 p-4 bg-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-semibold">Total Sales (Paid Users)</h2>
          <p className="text-4xl font-bold">{totalSales}</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Total Unpaid Users</h2>
          <p className="text-4xl font-bold">{totalUnpaid}</p>
        </div>
      </div>

      {/* Referral Users Table */}
      <div className="mb-8 overflow-x-auto">
        <h4 className="text-xl font-semibold mb-4">Referral Users</h4>
        {referralUsers.length === 0 ? (
          <p>No users found for the entered referral code.</p>
        ) : (
          <table className="min-w-full bg-gray-800 rounded-lg">
            <thead>
              <tr>
                <th className="py-3 px-6 text-left">Email</th>
                <th className="py-3 px-6 text-left">Paid</th>
                <th className="py-3 px-6 text-left">Payment Date and Time</th>
                <th className="py-3 px-6 text-left">Registration Time</th>
              </tr>
            </thead>
            <tbody>
              {referralUsers.map((user) => (
                <tr key={user.uid} className="border-t border-gray-700">
                  <td className="py-3 px-6">{user.email}</td>
                  <td className="py-3 px-6">{user.paid ? "Paid" : "Unpaid"}</td>
                  <td className="py-3 px-6">
                    {user.paid && user.paymentDate
                      ? formatDateTime(user.paymentDate)
                      : "Not Paid"}
                  </td>
                  <td className="py-3 px-6">
                    {user.registrationTime
                      ? formatDateTime(user.registrationTime)
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
