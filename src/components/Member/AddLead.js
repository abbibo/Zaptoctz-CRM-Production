import React, { useState, useEffect } from "react";
import { db, auth } from "../../context/FirebaseContext";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Papa from "papaparse";
import { cleanPhoneNumber } from "../../utils/fileImport";

const AddLead = () => {
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [existingLead, setExistingLead] = useState(null);
  const [csvLeads, setCsvLeads] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateAssigned, setDateAssigned] = useState(new Date().toISOString().split("T")[0]);

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

    if (!leadName || !phone) {
      setError("Lead Name and Phone are required.");
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
        setError("This lead already exists.");
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

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    setCsvError("");
    setCsvSuccess("");
    setCsvLeads([]);
    setLoading(true);

    if (!file) {
      setCsvError("No file selected. Please upload a valid CSV file.");
      setLoading(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        const leadsWithStatus = [];

        for (const lead of data) {
          const { name, phone } = lead;
          if (!name || !phone) continue;

          const phoneCleaned = cleanPhoneNumber(phone);
          if (!/^\d{10}$/.test(phoneCleaned)) {
            leadsWithStatus.push({
              ...lead,
              phone: phoneCleaned,
              status: "Invalid Phone",
            });
            continue;
          }

          const { exists } = await checkDuplicateLead(phoneCleaned);
          leadsWithStatus.push({
            ...lead,
            phone: phoneCleaned,
            status: exists ? `Number already assigned to Self/Someonelse` : "Available",
          });
        }

        setCsvLeads(leadsWithStatus);
        setLoading(false);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        setCsvError("Failed to parse CSV. Please ensure the file is correctly formatted.");
        setLoading(false);
      },
    });
  };

  const handleAddCsvLeads = async () => {
    if (csvLeads.length === 0) {
      setCsvError("No leads available for addition.");
      return;
    }

    try {
      const validLeads = csvLeads.filter((lead) => lead.status === "Available");
      for (const lead of validLeads) {
        const { name, phone } = lead;

        await addDoc(collection(db, "leads"), {
          leadName: name,
          phone,
          assignedTo: auth.currentUser.uid,
          assignedToName: userName,
          assignedBy: userName,
          dateAssigned: formatDate(),
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

      setCsvSuccess(`${validLeads.length} leads added successfully.`);
      setCsvLeads([]);
    } catch (err) {
      console.error("Error adding CSV leads:", err);
      setCsvError("Failed to add CSV leads. Please try again.");
    }
  };

  return (
    <div className="p-4 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-extrabold mb-4 text-center tracking-wider text-gray-100">
          Add Lead
        </h1>

        {success && <p className="text-green-500 mb-4 text-center">Lead added successfully!</p>}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        {existingLead && (
          <p className="text-yellow-500 mb-4 text-center">
            Existing Lead: {existingLead.leadName} - {existingLead.phone}.
          </p>
        )}

        <form onSubmit={handleAddLead} className="space-y-4 bg-gray-800 p-6 rounded shadow-lg border border-gray-700 mb-8">
          <p className="text-sm text-gray-400 mb-4">
            Phone number must be exactly 10 digits and should not contain +91 or 91.
          </p>
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
            <div
              className="cursor-pointer bg-gray-700 p-3 rounded mb-4 select-none"
              onClick={() => document.getElementById("dateAssigned").showPicker()}
            >
              {dateAssigned}
            </div>
            <input
              id="dateAssigned"
              type="date"
              value={dateAssigned}
              onChange={(e) => setDateAssigned(e.target.value)}
              min={formatDate()}
              className="hidden"
            />
          </div>
          <button
            type="submit"
            className="p-3 bg-blue-500 hover:bg-blue-600 rounded w-full font-bold transition"
          >
            Add Lead
          </button>
        </form>

        <hr className="my-8 border-gray-700" />

        <h2 className="text-2xl font-extrabold mb-4 text-center">Add Leads via CSV</h2>
        <div className="bg-gray-800 p-6 rounded shadow-lg border border-gray-700 space-y-4">
          <p className="text-sm text-gray-400 mb-2">
            Please ensure your CSV follows the format in 
            <a href="https://crm.zaptockz.online/Sample.csv" download className="text-blue-400 underline ml-1">Sample.csv</a>.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Phone number must be exactly 10 digits and should not contain +91 or 91.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && <p className="text-yellow-500 text-center">Processing CSV... Please wait.</p>}
          {csvError && <p className="text-red-500 text-center">{csvError}</p>}
          {csvSuccess && <p className="text-green-500 text-center">{csvSuccess}</p>}
          {csvLeads.length > 0 && (
            <div className="overflow-x-auto border border-gray-700 rounded shadow-inner bg-gray-700 p-3">
              <h3 className="text-gray-300 mb-2 font-bold">CSV Upload Summary</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="p-2 text-gray-300 font-bold uppercase text-sm">Name</th>
                    <th className="p-2 text-gray-300 font-bold uppercase text-sm">Phone</th>
                    <th className="p-2 text-gray-300 font-bold uppercase text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csvLeads.map((lead, index) => (
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
              <button
                onClick={handleAddCsvLeads}
                className="p-3 bg-blue-500 hover:bg-blue-600 rounded mt-4 w-full font-bold transition"
              >
                Add Available Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLead;
