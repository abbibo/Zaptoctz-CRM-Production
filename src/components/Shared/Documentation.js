import React, { useState, useEffect } from "react";
import { useFirebase } from "../../context/FirebaseContext";
import { db } from "../../context/FirebaseContext";
import { collection, getDocs } from "firebase/firestore";
import { FaCopy, FaExclamationTriangle, FaCheckCircle, FaFileAlt } from "react-icons/fa";

// Required fields as per the instructions
const REQUIRED_FIELDS = [
  "studentName", "studentNumber", "studentEmail", "dob", "nationality",
  "religion", "community", "casteName", "bloodGroup", "aadhaarNumber",
  "courseApplied", "collegeName",
  "fatherName", "fatherOccupation", "fatherPhone",
  "motherName", "motherPhone",
  "residentialAddress",
  "schoolName12th", "board12th", "percentage12th", "yearOfPassing12th",
  "driveLink" // The single google drive folder link
];

const REQUIRED_FIELD_LABELS = {
  studentName: "Student Name",
  studentNumber: "Student Number",
  studentEmail: "Student Email ID",
  dob: "Date of Birth",
  nationality: "Nationality",
  religion: "Religion",
  community: "Community",
  casteName: "Caste Name",
  bloodGroup: "Blood Group",
  aadhaarNumber: "Aadhaar Number",
  courseApplied: "Course Applied For",
  collegeName: "College Name",
  fatherName: "Father's Name",
  fatherOccupation: "Father's Occupation",
  fatherPhone: "Father's Mobile Number",
  motherName: "Mother's Name",
  motherPhone: "Mother's Mobile Number",
  residentialAddress: "Residential Address",
  schoolName12th: "12th School Name",
  board12th: "12th Board",
  percentage12th: "12th Percentage",
  yearOfPassing12th: "12th Year of Passing",
  driveLink: "Documents Drive Link"
};

const Documentation = () => {
  const { user, role } = useFirebase();
  const [documentedLeads, setDocumentedLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [selectedLead, setSelectedLead] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  const fetchDocumentedLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let validMemberIds = [];

      // If manager, we need to know who is under them
      if (role === "manager") {
         const membersSnapshot = await getDocs(collection(db, "members"));
         const managerData = membersSnapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .find((d) => d.id === user.uid);
            
         if (managerData?.assignedMembers) {
            validMemberIds = managerData.assignedMembers;
         }
      }

      const docsSnapshot = await getDocs(collection(db, "documentation"));
      let docsData = docsSnapshot.docs.map(d => ({ docId: d.id, ...d.data() }));

      if (role === "manager") {
         docsData = docsData.filter(d => validMemberIds.includes(d.assignedTo) || d.assignedTo === user.uid);
      } else if (role === "member") {
         docsData = docsData.filter(d => d.assignedTo === user.uid);
      }

      // Check completion status for each
      docsData = docsData.map(doc => {
         const missingFields = REQUIRED_FIELDS.filter(f => !doc[f] || String(doc[f]).trim() === "");
         return {
             ...doc,
             missingFields,
             isCompleted: missingFields.length === 0
         };
      });

      setDocumentedLeads(docsData);
    } catch (err) {
      console.error("Error fetching documentation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentedLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const copyFormLink = (docId) => {
      const link = `${window.location.origin}/documentation-form/${docId}`;
      navigator.clipboard.writeText(link);
      alert("Form link copied to clipboard!");
  };

  const copyFormData = (lead) => {
      let dataText = `Documentation for ${lead.leadName}\n\n`;
      Object.keys(REQUIRED_FIELD_LABELS).forEach(key => {
          dataText += `${REQUIRED_FIELD_LABELS[key]}: ${lead[key] || "N/A"}\n`;
      });
      navigator.clipboard.writeText(dataText);
      alert("Form data copied to clipboard!");
  };

  const StatusBadge = ({ lead }) => {
      const isPending = !lead.isCompleted;
      return (
          <button 
             onClick={() => { setSelectedLead(lead); setShowStatusModal(true); }}
             className={`flex items-center px-3 py-1 rounded-full text-xs font-bold ${isPending ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "bg-green-500 hover:bg-green-600 text-white"}`}
          >
             {isPending ? (
                <><FaExclamationTriangle className="mr-1" /> Pending</>
             ) : (
                <><FaCheckCircle className="mr-1" /> Completed</>
             )}
          </button>
      );
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-6">Loading Documentation...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 font-sans">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-6">Documentation Section</h1>

        <div className="overflow-x-auto border border-gray-700 rounded-lg shadow-lg">
            <table className="min-w-full bg-gray-800">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="p-3 text-left font-bold text-gray-300 text-sm">Lead Name</th>
                        <th className="p-3 text-left font-bold text-gray-300 text-sm">Phone</th>
                        <th className="p-3 text-left font-bold text-gray-300 text-sm">Status</th>
                        <th className="p-3 text-center font-bold text-gray-300 text-sm">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {documentedLeads.length === 0 ? (
                        <tr><td colSpan="4" className="p-4 text-center text-gray-400">No documentation found.</td></tr>
                    ) : (
                        documentedLeads.map(lead => (
                            <tr key={lead.docId} className="border-b border-gray-700 hover:bg-gray-700 transition">
                                <td className="p-3 text-sm">{lead.leadName}</td>
                                <td className="p-3 text-sm">{lead.phone}</td>
                                <td className="p-3">
                                    <StatusBadge lead={lead} />
                                </td>
                                <td className="p-3 flex justify-center space-x-2">
                                    <button 
                                      onClick={() => copyFormLink(lead.docId)}
                                      className="bg-blue-600 hover:bg-blue-500 p-2 rounded text-white flex items-center shadow"
                                      title="Copy public form link"
                                    >
                                        <FaCopy className="mr-1" /> Link
                                    </button>
                                    <button 
                                      onClick={() => { setSelectedLead(lead); setShowDataModal(true); }}
                                      className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded text-white flex items-center shadow"
                                      title="View filled data"
                                    >
                                        <FaFileAlt className="mr-1" /> Data
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Status Details Modal */}
        {showStatusModal && selectedLead && (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-600 shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        {selectedLead.isCompleted ? <><FaCheckCircle className="text-green-500 mr-2" /> Completion Status</> : <><FaExclamationTriangle className="text-yellow-500 mr-2" /> Pending Details</>}
                    </h2>
                    
                    {selectedLead.isCompleted ? (
                        <p className="text-green-400 font-semibold mb-4">All required fields and documents are completed!</p>
                    ) : (
                        <>
                            <p className="text-gray-300 mb-2 font-medium">Missing or incomplete fields:</p>
                            <ul className="list-disc list-inside text-red-400 mb-4 bg-gray-900 p-3 rounded">
                                {selectedLead.missingFields.map(field => (
                                    <li key={field}>{REQUIRED_FIELD_LABELS[field] || field}</li>
                                ))}
                            </ul>
                        </>
                    )}
                    
                    <div className="flex justify-end">
                        <button onClick={() => setShowStatusModal(false)} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white font-bold">Close</button>
                    </div>
                </div>
            </div>
        )}

        {/* Form Data Viewer Modal */}
        {showDataModal && selectedLead && (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl border border-gray-600 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-4 text-indigo-400">Documentation Data</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {Object.keys(REQUIRED_FIELD_LABELS).map(key => (
                            <div key={key} className="bg-gray-700 p-3 rounded">
                                <p className="text-xs text-gray-400 font-bold uppercase">{REQUIRED_FIELD_LABELS[key]}</p>
                                {key === "driveLink" && selectedLead[key] ? (
                                    <a href={selectedLead[key]} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                                        View Documents
                                    </a>
                                ) : (
                                    <p className="text-white font-medium">{selectedLead[key] || <span className="text-gray-500 italic">Not provided</span>}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end space-x-3">
                        {role === "manager" && (
                            <button onClick={() => copyFormData(selectedLead)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold flex items-center">
                                <FaCopy className="mr-2" /> Copy All Data
                            </button>
                        )}
                        <button onClick={() => setShowDataModal(false)} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white font-bold">Close</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default Documentation;
