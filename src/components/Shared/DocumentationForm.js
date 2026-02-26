import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../context/FirebaseContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const REQUIRED_FIELDS = [
  "studentName", "studentNumber", "studentEmail", "dob", "nationality",
  "religion", "community", "casteName", "bloodGroup", "aadhaarNumber",
  "courseApplied", "collegeName",
  "fatherName", "fatherOccupation", "fatherPhone",
  "motherName", "motherPhone",
  "residentialAddress",
  "schoolName12th", "board12th", "percentage12th", "yearOfPassing12th",
  "driveLink" 
];

const DocumentationForm = () => {
  const { docId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docData, setDocData] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const docRef = doc(db, "documentation", docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDocData(docSnap.data());
          // Initialize form
          const initialData = {};
          REQUIRED_FIELDS.forEach(f => {
            initialData[f] = docSnap.data()[f] || "";
          });
          setFormData(initialData);
        } else {
          setMessage("Invalid or expired link. Please contact your agent.");
        }
      } catch (err) {
        setMessage("Error loading form.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [docId]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const docRef = doc(db, "documentation", docId);
      await updateDoc(docRef, formData);
      setMessage("Form saved successfully! You can close this page or continue editing.");
    } catch (err) {
      console.error(err);
      setMessage("Error saving form. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><p className="text-xl">Loading Form...</p></div>;

  if (!docData) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><p className="text-red-500 text-xl font-bold">{message}</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        
        <div className="bg-indigo-600 text-white p-6 text-center">
            <h1 className="text-3xl font-extrabold mb-2">Student Documentation Form</h1>
            <p className="text-indigo-200">Please fill out all the required details to complete your application.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            {message && (
                <div className={`p-4 rounded-lg font-bold ${message.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {message}
                </div>
            )}

            {/* 1. Personal Information */}
            <section>
                <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2 text-gray-800">1. Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Student Name" name="studentName" value={formData.studentName} onChange={handleChange} required />
                    <Input label="Student Number" name="studentNumber" value={formData.studentNumber} onChange={handleChange} required />
                    <Input label="Student Email ID" name="studentEmail" type="email" value={formData.studentEmail} onChange={handleChange} required />
                    <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                    <Input label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} required />
                    <Input label="Religion" name="religion" value={formData.religion} onChange={handleChange} required />
                    <Input label="Community" name="community" value={formData.community} onChange={handleChange} required />
                    <Input label="Caste Name" name="casteName" value={formData.casteName} onChange={handleChange} required />
                    <Input label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} required />
                    <Input label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} required />
                </div>
            </section>

            {/* 2. Course Details */}
            <section>
                <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2 text-gray-800">2. Course Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Course Applied For" name="courseApplied" value={formData.courseApplied} onChange={handleChange} required />
                    <Input label="College Name" name="collegeName" value={formData.collegeName} onChange={handleChange} required />
                </div>
            </section>

            {/* 3. Parent / Guardian Details */}
            <section>
                <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2 text-gray-800">3. Parent / Guardian Details</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Father's Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                            <Input label="Occupation" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} required />
                            <Input label="Mobile Number" name="fatherPhone" value={formData.fatherPhone} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2 mt-4">Mother's Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} required />
                            <Input label="Mobile Number" name="motherPhone" value={formData.motherPhone} onChange={handleChange} required />
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Address Details */}
            <section>
                <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2 text-gray-800">4. Address Details</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Residential Address *</label>
                        <textarea name="residentialAddress" value={formData.residentialAddress} onChange={handleChange} rows="3" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                </div>
            </section>

            {/* 5. Educational Qualification */}
            <section>
                <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2 text-gray-800">5. Educational Qualification (12th Standard)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="School Name" name="schoolName12th" value={formData.schoolName12th} onChange={handleChange} required />
                    <Input label="Board" name="board12th" value={formData.board12th} onChange={handleChange} required />
                    <Input label="Percentage (%)" name="percentage12th" type="number" step="0.01" value={formData.percentage12th} onChange={handleChange} required />
                    <Input label="Year of Passing" name="yearOfPassing12th" type="number" value={formData.yearOfPassing12th} onChange={handleChange} required />
                </div>
            </section>

            {/* 6. Documents Required */}
            <section>
                <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2 text-gray-800">6. Documents Required (Scanned Copies)</h2>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <p className="text-sm text-yellow-800 font-bold mb-1">Important Instructions:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                        <li>Create a single Google Drive folder.</li>
                        <li>Upload: 10th Mark Sheet, 12th Mark Sheet, Aadhaar Card, Passport Size Photograph.</li>
                        <li>Set folder permission to <strong>"Anyone with the link can view"</strong>.</li>
                        <li>Paste the Google Drive folder link in the field below.</li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Input label="Google Drive Folder Link for Documents" type="url" name="driveLink" value={formData.driveLink} onChange={handleChange} required placeholder="https://drive.google.com/..." />
                </div>
            </section>

            <div className="pt-6">
                <button type="submit" disabled={saving} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-extrabold rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center">
                    {saving ? "Saving..." : "Submit Documentation"}
                </button>
            </div>

        </form>
      </div>
    </div>
  );
};

const Input = ({ label, required, ...props }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input 
            required={required}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            {...props}
        />
    </div>
);

export default DocumentationForm;
