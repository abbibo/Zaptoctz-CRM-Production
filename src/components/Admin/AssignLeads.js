import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import { collection, getDocs, addDoc, query, where, getDoc, doc } from "firebase/firestore";
import { parseImportData, parsePasteData, cleanPhoneNumber } from "../../utils/fileImport";

const AssignLeads = () => {
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dateAssigned, setDateAssigned] = useState("");
  const [members, setMembers] = useState([]);
  
  // Import States
  const [importMode, setImportMode] = useState("file"); // 'file' or 'paste'
  const [pasteContent, setPasteContent] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [csvStatus, setCsvStatus] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "members"));
        const membersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersData);
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };
    fetchMembers();
  }, []);

  const checkDuplicateLead = async (phoneNumber) => {
    const leadsRef = collection(db, "leads");
    const qRes = await getDocs(query(leadsRef, where("phone", "==", phoneNumber)));

    if (!qRes.empty) {
      const lead = qRes.docs[0].data();
      let assignedToName = lead.assignedToName;

      if (!assignedToName && lead.assignedTo) {
        const memberDoc = await getDoc(doc(db, "members", lead.assignedTo));
        assignedToName = memberDoc.exists() ? memberDoc.data().name : "Unknown";
      }

      return {
        exists: true,
        lead: {
          ...lead,
          assignedToName: assignedToName || "Unknown",
        },
      };
    }
    return { exists: false, lead: null };
  };

  const handleAssignLead = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!leadName || !phone || !assignedTo || !dateAssigned) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate phone number: 10 digits, no +91 or 91
    const phoneCleaned = cleanPhoneNumber(phone);
    if (!/^\d{10}$/.test(phoneCleaned)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      const { exists, lead } = await checkDuplicateLead(phoneCleaned);
      if (exists) {
        setError(`Lead already exists and is assigned to ${lead.assignedToName}.`);
        return;
      }

      await addDoc(collection(db, "leads"), {
        leadName,
        phone: phoneCleaned,
        assignedTo,
        assignedToName: members.find((m) => m.id === assignedTo)?.name || "Unknown",
        dateAssigned,
        status: "Pending",
        notes: [
          {
            text: `Lead assigned by Manager`,
            status: "Assigned",
            date: new Date().toISOString(),
          },
        ],
      });
      setSuccess(true);
      setLeadName("");
      setPhone("");
      setAssignedTo("");
      setDateAssigned("");
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
      const name = lead.name?.trim();
      // Clean phone: remove spaces/dashes? The requirement says "no +91 or 91", implies raw digits.
      // But user input might have dashes. Let's try to just check digits.
      // Current logic strictly enforces 10 digits.
      let phoneNum = lead.phone?.trim();
      
      // Attempt to clean simple separators if needed, but requirements were strict.
      // Let's stick to strict 10 digits check for now, consistent with manual entry.
      // maybe strip non-digits?
      // phoneNum = phoneNum.replace(/\D/g, ''); 

      if (!name || !phoneNum) continue;

      // Validate phone
      // Note: lead.phone is already cleaned by normalizeLead in fileImport.js
      // We double check if it's 10 digits.
      if (!/^\d{10}$/.test(phoneNum)) {
        statusChecks.push({
          ...lead,
          phone: phoneNum,
          status: "Invalid Phone",
        });
        continue;
      }

      const { exists, lead: existing } = await checkDuplicateLead(phoneNum);
      statusChecks.push({
        ...lead,
        phone: phoneNum,
        status: exists ? `Assigned to ${existing.assignedToName}` : "Available",
      });
    }

    setCsvStatus(statusChecks);
    setCsvData(leads);
    setCsvLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setError("");
    setSuccess(false);

    if (!file) return;

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
      } catch(err) {
        console.error("Paste Parse Error:", err);
        setError("Failed to parse pasted data.");
        setCsvLoading(false);
      }
  };

  const handleAssignCsvLeads = async () => {
    setError("");
    setSuccess(false);

    if (!assignedTo || !dateAssigned) {
      setError("Please select a member and date to assign the leads.");
      return;
    }

    const assignableLeads = csvStatus.filter((lead) => lead.status === "Available");
    if (assignableLeads.length === 0) {
      setError("No assignable leads found. All leads are already assigned or invalid.");
      return;
    }

    try {
      const leadsCollection = collection(db, "leads");

      for (const lead of assignableLeads) {
        await addDoc(leadsCollection, {
          leadName: lead.name,
          phone: lead.phone,
          assignedTo,
          assignedToName: members.find((m) => m.id === assignedTo)?.name || "Unknown",
          dateAssigned,
          status: "Pending",
          notes: [
            {
              text: `Lead assigned by Manager`,
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
      setDateAssigned("");
    } catch (err) {
      console.error("Error assigning CSV leads:", err);
      setError("Failed to assign leads. Try again.");
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
                <option value="">-- Select Agent --</option>
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
            <button
              type="submit"
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded w-full font-bold transition"
            >
              Assign Lead
            </button>
          </form>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 space-y-4">
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

          {csvLoading && <p className="text-yellow-400 animate-pulse">Processing data...</p>}

          {csvStatus.length > 0 && (
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

          {csvData.length > 0 && (
            <>
              <div>
                <label className="block mb-2 text-gray-400 font-bold">Assign To</label>
                <select
                  className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">-- Select Agent --</option>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignLeads;
