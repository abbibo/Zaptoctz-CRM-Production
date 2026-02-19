import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../context/FirebaseContext";
import { collection, getDocs } from "firebase/firestore";

const AdminDashboard = () => {
  const [kpi, setKpi] = useState({ 
    totalLeads: 0, 
    contacted: 0, 
    pending: 0, 
    interested: 0,
    totalMembers: 0,
    activeMembers: 0
  });

  useEffect(() => {
    const fetchKpiData = async () => {
      try {
        // Fetch Leads
        const leadsSnapshot = await getDocs(collection(db, "leads"));
        const leads = leadsSnapshot.docs.map((doc) => doc.data());

        const pendingLeads = leads.filter((lead) => lead.status === "Pending");
        const contactedLeads = leads.filter((lead) => lead.status !== "Pending");
        const interestedLeads = leads.filter((lead) => lead.status === "Interested");

        // Fetch Members
        const membersSnapshot = await getDocs(collection(db, "members"));
        const members = membersSnapshot.docs.map((doc) => doc.data());

        // Filter for role 'member' specifically, or count all users in 'members' collection if that's the definition of "Registered Members"
        // Based on plan: "Registered Members" are users with role: 'member'
        const registeredMembers = members.filter(m => m.role === 'member');
        const activeMembers = registeredMembers.filter(m => m.status === 'active');

        setKpi({
          totalLeads: leads.length,
          contacted: contactedLeads.length,
          pending: pendingLeads.length,
          interested: interestedLeads.length,
          totalMembers: registeredMembers.length,
          activeMembers: activeMembers.length,
        });
      } catch (err) {
        console.error("Error fetching KPI data:", err);
      }
    };

    fetchKpiData();
  }, []);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen text-white font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-100 tracking-wide">
            Admin Dashboard
          </h1>
        </header>

        {/* KPI Section */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
              Total Leads
            </p>
            <p className="text-3xl font-extrabold text-gray-100">{kpi.totalLeads}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
              Contacted Leads
            </p>
            <p className="text-3xl font-extrabold text-gray-100">{kpi.contacted}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
              Pending Leads
            </p>
            <p className="text-3xl font-extrabold text-gray-100">{kpi.pending}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
              Interested Leads
            </p>
            <p className="text-3xl font-extrabold text-gray-100">{kpi.interested}</p>
          </div>
           <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
              Total Members
            </p>
            <p className="text-3xl font-extrabold text-gray-100">{kpi.totalMembers}</p>
          </div>
           <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center border border-gray-700 hover:bg-gray-700 transition transform hover:scale-105">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">
              Active Members
            </p>
            <p className="text-3xl font-extrabold text-gray-100">{kpi.activeMembers}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/admin-dashboard/add-member"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">Add Member</p>
          </Link>
          <Link
            to="/admin-dashboard/assign-leads"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">Assign Leads</p>
          </Link>
          <Link
            to="/admin-dashboard/add-template"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">Add WhatsApp Template</p>
          </Link>
          <Link
            to="/admin-dashboard/assign-members-to-manager"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">Assign Members to Manager</p>
          </Link>
          <Link
            to="/admin-dashboard/all-leads"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">All Leads</p>
          </Link>
          <Link
            to="/admin-dashboard/all-members"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">All Members</p>
          </Link>
          <Link
            to="/admin-dashboard/logs"
            className="block p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-2xl hover:bg-gray-700 transition transform hover:scale-105 text-center"
          >
            <p className="text-lg font-bold text-gray-100">Logs</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
