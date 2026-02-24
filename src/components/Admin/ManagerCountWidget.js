import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const ManagerCountWidget = () => {
  const [managerCount, setManagerCount] = useState(0);

  useEffect(() => {
    // Query users with the "manager" role
    const q = query(collection(db, "members"), where("role", "==", "manager"));
    
    // onSnapshot ensures we get real-time updates and pagination-independent accuracy
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setManagerCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching manager count:", error);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
      <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
        Total Managers
      </p>
      <p className="text-3xl font-extrabold text-gray-100">{managerCount}</p>
    </div>
  );
};

export default ManagerCountWidget;
