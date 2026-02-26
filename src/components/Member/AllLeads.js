import React, { useState, useEffect } from "react";
import ProcessingModal from "../Shared/ProcessingModal";
import { db, auth } from "../../context/FirebaseContext";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { format, addDays, isBefore, isSameDay } from "date-fns";
import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";

const AllLeads = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [status, setStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [notes, setNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("assignedTo", "==", auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const leadsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort leads by dateAssigned (newest first)
        leadsData.sort((a, b) => new Date(b.dateAssigned) - new Date(a.dateAssigned));

        setLeads(leadsData);
        setFilteredLeads(leadsData);
      } catch (err) {
        console.error("Error fetching leads:", err);
      }
    };

    fetchLeads();
  }, []);

  const filterLeads = () => {
    const searchTerm = search.toLowerCase();
    const filtered = leads.filter((lead) => {
      const matchesSearch =
        lead.leadName.toLowerCase().includes(searchTerm) || // Search by name
        lead.phone && lead.phone.includes(searchTerm);      // Search by phone number
      const matchesStatus = statusFilter ? lead.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
    setFilteredLeads(filtered);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    filterLeads();
  };

  const handleFilterByStatus = (e) => {
    setStatusFilter(e.target.value);
    filterLeads();
  };

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setStatus("");
    setFollowUpDate("");
    setFollowUpTime("");
    setNotes("");
  };

  const closeLeadDetails = () => {
    setSelectedLead(null);
    setStatus("");
    setFollowUpDate("");
    setFollowUpTime("");
    setNotes("");
  };

  const handleStatusChange = async () => {
    if (!status || (["Interested", "Requested Call Back"].includes(status) && !followUpDate)) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsProcessing(true);
    setProcessMessage("Updating status...");

    try {
      const leadRef = doc(db, "leads", selectedLead.id);
      const newNotes = [
        ...(selectedLead.notes || []),
        {
          text: notes || "",
          status,
          date: new Date().toISOString(),
          updatedBy: "member",
          followUpDate,
          followUpTime,
        },
      ];

      const updatePayload = {
        status,
        notes: newNotes,
        dateUpdated: today,
        followUpDate: followUpDate || null,
        followUpTime: followUpTime || null,
      };

      await updateDoc(leadRef, updatePayload);
      setSuccessMessage("Status updated successfully.");

      // Refresh the lead list
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === selectedLead.id ? { ...lead, ...updatePayload } : lead
        )
      );
      closeLeadDetails();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsAppModal = (lead) => {
    setSelectedLead(lead);
    setShowWhatsAppModal(true);
    setPreviewMessage("");
  };

  const closeWhatsAppModal = () => {
    setShowWhatsAppModal(false);
    setSelectedTemplate("");
    setPreviewMessage("");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "dd-MM-yyyy");
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4 font-bold">All Leads</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by Name or Number"
          value={search}
          onChange={handleSearch}
          className="p-2 bg-gray-800 rounded w-full sm:w-auto"
        />
        <select
          value={statusFilter}
          onChange={handleFilterByStatus}
          className="p-2 bg-gray-800 rounded w-full sm:w-auto"
        >
          <option value="">Filter by Status</option>
          <option value="Pending">Pending</option>
          <option value="Interested">Interested</option>
          <option value="Not Interested">Not Interested</option>
          <option value="Requested Call Back">Requested Call Back</option>
        </select>
      </div>

      {/* Leads Table */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="bg-gray-800 p-4 rounded shadow-lg cursor-pointer hover:bg-gray-700 relative"
            onClick={() => openLeadDetails(lead)}
          >
            <h2 className="text-lg font-bold">{lead.leadName}</h2>
            <p className="text-sm text-gray-400">Assigned: {formatDate(lead.dateAssigned)}</p>
          </div>
        ))}
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded max-w-md w-full max-h-screen overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selectedLead.leadName}</h2>
              <div className="flex space-x-4">
                {/* <FaWhatsapp
                  onClick={() => openWhatsAppModal(selectedLead)}
                  className="text-green-500 text-2xl cursor-pointer"
                /> */}
                <FaPhoneAlt
                  onClick={() => window.open(`tel:${selectedLead.phone}`)}
                  className="text-blue-500 text-2xl cursor-pointer"
                />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              <strong>Assigned Date:</strong> {formatDate(selectedLead.dateAssigned)}
            </p>

            {/* Status Update */}
            <div className="mb-4">
              <label className="block mb-2 text-gray-400">Update Status</label>
              <select
                className="w-full p-2 bg-gray-700 rounded"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">-- Select Status --</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Didn't Pick">Didn't Pick</option>
                <option value="Interested">Interested</option>
                <option value="Requested Call Back">Requested Call Back</option>
              </select>
            </div>

            {["Interested", "Requested Call Back"].includes(status) && (
              <>
                <div className="mb-4">
                  <label className="block mb-2 text-gray-400">Follow-Up Date</label>
                  <input
                    type="date"
                    className="w-full p-2 bg-gray-700 rounded"
                    value={followUpDate}
                    min={today}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2 text-gray-400">Follow-Up Time</label>
                  <input
                    type="time"
                    className="w-full p-2 bg-gray-700 rounded"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div className="mb-4">
              <label className="block mb-2 text-gray-400">Notes</label>
              <textarea
                className="w-full p-2 bg-gray-700 rounded"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            {/* Status History */}
            <div className="mb-6">
              <h3 className="text-gray-400 font-bold mb-2">Status History</h3>
              {selectedLead.notes && selectedLead.notes.length > 0 ? (
                [...selectedLead.notes].reverse().map((note, index) => (
                  <div key={index} className="bg-gray-700 p-2 rounded mb-2 shadow-sm">
                    <p>
                      <strong>Status:</strong> {note.status}
                    </p>
                    <p>
                      <strong>Note:</strong> {note.text}
                    </p>
                    {note.followUpDate && (
                      <p>
                        <strong>Follow-Up:</strong>{" "}
                        {formatDate(note.followUpDate)}{" "}
                        {note.followUpTime && `at ${note.followUpTime}`}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {format(new Date(note.date), "dd-MM-yyyy HH:mm")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No history available.</p>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={closeLeadDetails}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
              >
                Close
              </button>
              <button
                onClick={handleStatusChange}
                className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded max-w-md w-full shadow-lg max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Send WhatsApp</h2>
            <div className="mb-4">
              <label className="block mb-2 text-gray-400">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              >
                <option value="">-- Select Template --</option>
                {/* Template list goes here */}
              </select>
            </div>
            {previewMessage && (
              <div className="bg-gray-700 p-4 rounded mb-4 shadow-sm">
                <strong className="block text-gray-400 mb-2">Preview:</strong>
                <p className="text-gray-200">{previewMessage}</p>
                <button
                  onClick={() => window.open(`https://wa.me/${selectedLead.phone}?text=${encodeURIComponent(previewMessage)}`)}
                  className="mt-2 bg-green-500 px-4 py-2 rounded hover:bg-green-600"
                >
                  Send WhatsApp
                </button>
              </div>
            )}
            <button
              onClick={closeWhatsAppModal}
              className="bg-red-500 px-4 py-2 rounded w-full hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      <ProcessingModal isOpen={isProcessing} message={processMessage} />
    </div>
  );
};

export default AllLeads;