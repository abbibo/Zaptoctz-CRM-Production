import React, { useState, useEffect } from "react";
import { db, auth } from "../../context/FirebaseContext";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { parseImportData, parsePasteData, cleanPhoneNumber } from "../../utils/fileImport";

const AddLead = () => {
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [existingLead, setExistingLead] = useState(null);
  const [dateAssigned, setDateAssigned] = useState(new Date().toISOString().split("T")[0]);

  // Import States
  const [importMode, setImportMode] = useState("file"); // 'file' or 'paste'
  const [pasteContent, setPasteContent] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [csvStatus, setCsvStatus] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userDoc = await getDoc(doc(db, "members", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        } else {
          setError("Unable to fetch user information.");
        }
      } catch (err) {
        console.error("Error fetching user name:", err);
        setError("Error fetching user information. Please try again.");
      }
    };

    fetchUserName();
  }, []);

  const formatDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const checkDuplicateLead = async (phone) => {
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const lead = querySnapshot.docs[0].data();
      return { exists: true, lead };
    }
    return { exists: false, lead: null };
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setExistingLead(null);

    if (!leadName || !phone || !dateAssigned) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate phone number
    const phoneCleaned = cleanPhoneNumber(phone);
    if (!/^\d{10}$/.test(phoneCleaned)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      const { exists, lead } = await checkDuplicateLead(phoneCleaned);
      if (exists) {
        setExistingLead(lead);
        setError(`This lead already exists and is assigned to ${lead.assignedToName || 'Unknown'}.`);
        return;
      }

      await addDoc(collection(db, "leads"), {
        leadName,
        phone: phoneCleaned,
        assignedTo: auth.currentUser.uid,
        assignedToName: userName,
        assignedBy: userName,
        dateAssigned,
        status: "Pending",
        notes: [
          {
            text: `Lead added by ${userName}`,
            status: "Added",
            date: new Date().toISOString(),
          },
        ],
      });

      setSuccess(true);
      setLeadName("");
      setPhone("");
      setDateAssigned(new Date().toISOString().split("T")[0]);
    } catch (err) {
      console.error("Error adding lead:", err);
      setError("Failed to add lead. Please try again.");
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

      if (!/^\d{10}$/.test(phoneTrimmed)) {
        statusChecks.push({
          ...lead,
          phone: phoneTrimmed,
          status: "Invalid Phone",
        });
        continue;
      }

      const { exists, lead: existing } = await checkDuplicateLead(phoneTrimmed);
      statusChecks.push({
        ...lead,
        phone: phoneTrimmed,
        status: exists ? `Assigned to ${existing.assignedToName || 'Unknown'}` : "Available",
      });
    }

    setCsvStatus(statusChecks);
    setCsvData(leads);
    setCsvLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setCsvError("");
    setCsvSuccess("");

    if (!file) return;

    try {
      setCsvLoading(true);
      const leads = await parseImportData(file);
      await processLeadsData(leads);
    } catch (err) {
      console.error("Import Error:", err);
      setCsvError(typeof err === "string" ? err : "Failed to import file.");
      setCsvLoading(false);
    }
  };

  const handlePasteParse = async () => {
    if (!pasteContent.trim()) {
      setCsvError("Please paste some data first.");
      return;
    }
    setCsvError("");
    setCsvSuccess("");

    try {
      setCsvLoading(true);
      const leads = parsePasteData(pasteContent);
      if (leads.length === 0) {
        setCsvError("No valid leads found in pasted text. Ensure format is correct (Name, Phone).");
        setCsvLoading(false);
        return;
      }
      await processLeadsData(leads);
    } catch (err) {
      console.error("Paste Parse Error:", err);
      setCsvError("Failed to parse pasted data.");
      setCsvLoading(false);
    }
  };

  const handleAddCsvLeads = async () => {
    setCsvError("");
    setCsvSuccess("");

    const assignableLeads = csvStatus.filter((lead) => lead.status === "Available");
    if (assignableLeads.length === 0) {
      setCsvError("No assignable leads found. All leads are already assigned or invalid.");
      return;
    }

    try {
      const leadsCollection = collection(db, "leads");

      for (const lead of assignableLeads) {
        await addDoc(leadsCollection, {
          leadName: lead.name,
          phone: lead.phone,
          assignedTo: auth.currentUser.uid,
          assignedToName: userName,
          assignedBy: userName,
          // Member dashboard has dateAssigned for manual entry. For CSV bulk addition, we'll
          // also use the manual entry date picker, so it needs to be the same UI as manual assignment.
          // Wait, Admin dashboard shows Date Assigned AFTER importing CSV.
          // I'll use the existing state `dateAssigned` which is initialized to today.
          dateAssigned,
          status: "Pending",
          notes: [
            {
              text: `Lead added by ${userName}`,
              status: "Added",
              date: new Date().toISOString(),
            },
          ],
        });
      }

      setCsvSuccess(`${assignableLeads.length} leads added successfully.`);
      setCsvData([]);
      setCsvStatus([]);
      setPasteContent("");
      // keep dateAssigned as is (e.g., today)
    } catch (err) {
      console.error("Error adding CSV leads:", err);
      setCsvError("Failed to add CSV leads. Please try again.");
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 text-center tracking-wider text-gray-100">
          Add Lead
        </h1>

        {success && <p className="text-green-500 mb-4 text-center">Lead added successfully!</p>}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        {/* Removed Existing Lead box as it's now in the error message for parity with Admin */}

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-10 space-y-4">
          <h2 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-2">Manual Addition</h2>
          <form onSubmit={handleAddLead} className="space-y-4">
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
              Add Lead
            </button>
          </form>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 space-y-4">
          <h2 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-2">
            Import Leads (CSV, Excel)
          </h2>

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
            {" "}Phone must be 10 digits (no +91).
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

          {csvError && <p className="text-red-500 text-center font-bold">{csvError}</p>}
          {csvSuccess && <p className="text-green-500 text-center font-bold">{csvSuccess}</p>}

          {csvData.length > 0 && (
            <>
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
                onClick={handleAddCsvLeads}
                disabled={csvData.length === 0}
                className={`p-3 rounded w-full font-bold transition ${
                  csvData.length === 0
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                Add Leads
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLead;
