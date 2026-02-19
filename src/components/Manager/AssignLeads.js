import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import { collection, getDocs, addDoc, getDoc, doc, query, where } from "firebase/firestore";
import { parseImportData, parsePasteData } from "../../utils/fileImport";

const AssignLeads = () => {
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dateAssigned, setDateAssigned] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [members, setMembers] = useState([]);
  const [existingLead, setExistingLead] = useState(null);

  // Import States
  const [importMode, setImportMode] = useState("file"); // 'file' or 'paste'
  const [pasteContent, setPasteContent] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [csvStatus, setCsvStatus] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssignedMembers = async () => {
      try {
        const managerId = localStorage.getItem("uid"); 
        const querySnapshot = await getDocs(collection(db, "members"));

        const managerData = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .find((doc) => doc.id === managerId);

        const assignedMembersIds = managerData?.assignedMembers || [];
        const assignedMembers = querySnapshot.docs
          .filter((doc) => assignedMembersIds.includes(doc.id))
          .map((doc) => ({ id: doc.id, ...doc.data() }));

        setMembers(assignedMembers);
      } catch (err) {
        console.error("Error fetching members:", err);
        setError("Failed to fetch members. Please try again.");
      }
    };

    fetchAssignedMembers();
  }, []);

  useEffect(() => {
    // Auto select current date by default
    const today = new Date().toISOString().split("T")[0];
    setDateAssigned(today);
  }, []);

  const checkDuplicateLead = async (phone) => {
    const leadsRef = collection(db, "leads");
    const qRes = await getDocs(query(leadsRef, where("phone", "==", phone)));

    if (!qRes.empty) {
      const lead = qRes.docs[0].data();
      let assignedToName = lead.assignedToName;

      if (!assignedToName && lead.assignedTo) {
        const memberDoc = await getDoc(doc(db, "members", lead.assignedTo));
        assignedToName = memberDoc.exists() ? memberDoc.data().name : "N/A";
      }

      return {
        exists: true,
        lead: {
          ...lead,
          assignedToName: assignedToName || "N/A",
        },
      };
    }
    return { exists: false, lead: null };
  };

  const handleAssignLead = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setExistingLead(null);

    if (!leadName || !phone || !assignedTo || !dateAssigned) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate phone: must be exactly 10 digits, no +91 or 91
    const phoneTrimmed = phone.trim();
    if (!/^\d{10}$/.test(phoneTrimmed)) {
      setError("Phone number must be exactly 10 digits and should not contain +91 or 91.");
      return;
    }

    try {
      const { exists, lead } = await checkDuplicateLead(phoneTrimmed);
      if (exists) {
        setExistingLead(lead);
        setError(`Lead already exists and is assigned to someone.`);
        return;
      }

      const newNotes = [
        {
          text: `Lead assigned by ${localStorage.getItem("managerName") || "Manager"}`,
          status: "Assigned",
          date: new Date().toISOString(),
        },
      ];

      if (customNote.trim() !== "") {
        newNotes.push({
          text: customNote.trim(),
          status: "Note", // Or any other status you deem appropriate
          date: new Date().toISOString(),
        });
      }

      await addDoc(collection(db, "leads"), {
        leadName,
        phone: phoneTrimmed,
        assignedTo,
        assignedToName: members.find((m) => m.id === assignedTo)?.name || "N/A",
        dateAssigned,
        status: "Pending",
        notes: newNotes, // Use the newNotes array
      });

      setSuccess(true);
      setLeadName("");
      setPhone("");
      setAssignedTo("");
      setDateAssigned(new Date().toISOString().split("T")[0]); // Reset to today
      setCustomNote(""); // Reset custom note
    } catch (err) {
      console.error("Error assigning lead:", err);
      setError("Failed to assign lead. Try again.");
    }
  };

  const processLeadsData = async (leads) => {
    setCsvLoading(true);
    setCsvStatus([]);
    setCsvData([]);
    
    const statusChecks = [];

    for (const lead of leads) {
      const phoneTrimmed = (lead.phone || "").trim();
      if (!lead.name || !phoneTrimmed) continue;

      // Validate phone
      if (!/^\d{10}$/.test(phoneTrimmed)) {
        statusChecks.push({
          ...lead,
          phone: phoneTrimmed,
          status: "Invalid Phone"
        });
        continue;
      }

      const { exists, lead: existing } = await checkDuplicateLead(phoneTrimmed);
      statusChecks.push({
        ...lead,
        phone: phoneTrimmed,
        status: exists ? `Already Assigned to ${existing.assignedToName}` : "Available",
      });
    }

    // Ensure each phone number is only "Available" once.
    const seenPhones = new Set();
    const finalStatusChecks = statusChecks.map((lead) => {
      if (lead.status === "Available") {
        if (seenPhones.has(lead.phone)) {
          // Mark this as duplicate in CSV
          return { ...lead, status: "Duplicate in CSV" };
        } else {
          seenPhones.add(lead.phone);
          return lead;
        }
      } else {
        return lead;
      }
    });

    setCsvStatus(finalStatusChecks);
    setCsvData(leads);
    setCsvLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError("No file selected.");
      return;
    }

    try {
      setCsvLoading(true);
      const leads = await parseImportData(file);
      await processLeadsData(leads);
    } catch (err) {
      console.error("Import Error:", err);
      setError(typeof err === 'string' ? err : "Failed to import file.");
      setCsvLoading(false);
    }
  };

  const handlePasteParse = async () => {
    if (!pasteContent.trim()) {
      setError("Please paste some data first.");
      return;
    }
    setError("");
    setSuccess(false);

    try {
      setCsvLoading(true);
      const leads = parsePasteData(pasteContent);
      if (leads.length === 0) {
        setError("No valid leads found in pasted text. Ensure format is correct (Name, Phone).");
        setCsvLoading(false);
        return;
      }
      await processLeadsData(leads);
    } catch (err) {
      console.error("Paste Parse Error:", err);
      setError("Failed to parse pasted data.");
      setCsvLoading(false);
    }
  };

  const handleAssignCsvLeads = async () => {
    setError("");
    setSuccess(false);
    setAssigningLoading(true); // Show assigning leads animation

    if (!assignedTo || !dateAssigned) {
      setError("Please select a member and date to assign the leads.");
      setAssigningLoading(false);
      return;
    }

    const assignableLeads = csvStatus.filter((lead) => lead.status === "Available");
    if (assignableLeads.length === 0) {
      setError("No assignable leads found. All leads are already assigned, invalid or duplicates in CSV.");
      setAssigningLoading(false);
      return;
    }

    try {
      const leadsCollection = collection(db, "leads");

      for (const lead of assignableLeads) {
        await addDoc(leadsCollection, {
          leadName: lead.name,
          phone: lead.phone,
          assignedTo,
          assignedToName: members.find((m) => m.id === assignedTo)?.name || "",
          dateAssigned,
          status: "Pending",
          notes: [
            {
              text: `Lead assigned by ${localStorage.getItem("managerName") || "Manager"}`,
              status: "Assigned",
              date: new Date().toISOString(),
            },
          ],
        });
      }

      setSuccess(true);
      setCsvData([]);
      setCsvStatus([]);
      setPasteContent("");
      setAssignedTo("");
      setDateAssigned(new Date().toISOString().split("T")[0]); // Reset date to today
    } catch (err) {
      console.error("Error assigning CSV leads:", err);
      setError("Failed to assign leads. Try again.");
    } finally {
      setAssigningLoading(false); // Stop assigning animation
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 text-center tracking-wider text-gray-100">
          Assign Leads
        </h1>

        {success && <p className="text-green-500 mb-4 text-center">Lead(s) assigned successfully!</p>}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        {existingLead && (
          <p className="text-yellow-500 mb-4 text-center">
            Existing Lead: {existingLead.leadName} - {existingLead.phone} assigned to {existingLead.assignedToName}.
          </p>
        )}

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-10 space-y-4">
          <h2 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-2">Manual Assignment</h2>
           <form onSubmit={handleAssignLead} className="space-y-4">
            <div>
              <label className="block mb-2 text-gray-400 font-bold">Lead Name</label>
              <input
                type="text"
                placeholder="Enter Lead Name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-400 font-bold">Phone</label>
              <input
                type="text"
                placeholder="10-digit phone number (no +91, no 91)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-400 font-bold">Assign To</label>
              <select
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">-- Select Member --</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-gray-400 font-bold">Date Assigned</label>
              <input
                type="date"
                value={dateAssigned}
                onChange={(e) => setDateAssigned(e.target.value)}
                min={minDate}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-400 font-bold">Note (Optional)</label>
              <textarea
                placeholder="Add an initial note for this lead"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <button
              type="submit"
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded w-full font-bold transition"
            >
              Assign Lead
            </button>
          </form>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 space-y-4 relative">
          <h2 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-2">
            Import Leads (CSV, Excel)
          </h2>

           {/* Import Mode Toggle */}
           <div className="flex space-x-4 mb-4">
              <button 
                onClick={() => setImportMode("file")}
                className={`px-4 py-2 rounded font-bold transition ${importMode === "file" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              >
                  Upload File
              </button>
              <button 
                onClick={() => setImportMode("paste")}
                className={`px-4 py-2 rounded font-bold transition ${importMode === "paste" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              >
                  Paste Data
              </button>
          </div>

          <p className="text-sm text-gray-400 mb-2">
            {importMode === "file" 
                ? 'Upload a CSV or Excel file with "name" and "phone" columns.'
                : 'Paste your lead data here (e.g. copied from Excel).'}
             Phone must be 10 digits (no +91).
          </p>

          {importMode === "file" && (
            <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {importMode === "paste" && (
            <div className="space-y-2">
                <textarea
                    rows="5"
                    className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    placeholder={`Name\tPhone\nJohn Doe\t9876543210\n...`}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                />
                <button
                    onClick={handlePasteParse}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold transition"
                >
                    Parse Paste Data
                </button>
            </div>
          )}

          {csvLoading && (
            <div className="text-center text-yellow-500 font-bold">Processing data... Please wait.</div>
          )}

          {csvStatus.length > 0 && !csvLoading && (
            <div className="overflow-x-auto border border-gray-700 rounded bg-gray-700 p-3 mt-4">
              <h3 className="text-gray-300 font-bold mb-2">Import Summary</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="p-2 text-gray-300 font-bold uppercase">Name</th>
                    <th className="p-2 text-gray-300 font-bold uppercase">Phone</th>
                    <th className="p-2 text-gray-300 font-bold uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csvStatus.map((lead, index) => (
                    <tr key={index} className="border-b border-gray-600 hover:bg-gray-600 transition">
                      <td className="p-2 text-gray-100">{lead.name}</td>
                      <td className="p-2 text-gray-100">{lead.phone}</td>
                      <td
                        className={`p-2 font-bold ${
                          lead.status === "Available"
                            ? "text-green-500"
                            : lead.status === "Invalid Phone"
                            ? "text-red-500"
                            : lead.status.includes("Duplicate in CSV")
                            ? "text-purple-500"
                            : lead.status.includes("Already Assigned")
                            ? "text-yellow-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {lead.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block mb-2 text-gray-400 font-bold">Assign To</label>
            <select
              className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-gray-400 font-bold">Date Assigned</label>
            <input
              type="date"
              value={dateAssigned}
              onChange={(e) => setDateAssigned(e.target.value)}
              min={minDate}
              className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-500 mb-4 text-center font-bold">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-500 mb-4 text-center font-bold">
              Lead(s) assigned successfully!
            </p>
          )}

          {assigningLoading && (
            <div className="text-center text-yellow-500 font-bold">Assigning leads... Please wait.</div>
          )}

          {!assigningLoading && (
            <button
              onClick={handleAssignCsvLeads}
              disabled={csvData.length === 0}
              className={`p-3 rounded w-full font-bold transition ${
                csvData.length === 0
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              Assign Leads
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignLeads;
