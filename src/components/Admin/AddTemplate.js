import React, { useState, useEffect } from "react";
import { db } from "../../context/FirebaseContext";
import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const AddTemplate = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templates, setTemplates] = useState([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "templates"));
        const templatesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTemplates(templatesData);
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    };

    fetchTemplates();
  }, []);

  const handleAddOrUpdateTemplate = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!templateName.trim() || !templateContent.trim()) {
      setError("Both template name and content are required.");
      return;
    }

    try {
      if (editingTemplate) {
        const templateRef = doc(db, "templates", editingTemplate.id);
        await updateDoc(templateRef, {
          name: templateName.trim(),
          content: templateContent.trim(),
        });
        setTemplates((prev) =>
          prev.map((template) =>
            template.id === editingTemplate.id
              ? { ...template, name: templateName, content: templateContent }
              : template
          )
        );
        setSuccess("Template updated successfully!");
      } else {
        await addDoc(collection(db, "templates"), {
          name: templateName.trim(),
          content: templateContent.trim(),
          createdAt: new Date(),
        });
        setSuccess("Template added successfully!");
        setTemplates((prev) => [
          ...prev,
          {
            name: templateName.trim(),
            content: templateContent.trim(),
            createdAt: new Date(),
            id: Date.now().toString(), // Temporary ID until refresh
          },
        ]);
      }

      setTemplateName("");
      setTemplateContent("");
      setEditingTemplate(null);
    } catch (err) {
      console.error("Error saving template:", err);
      setError("Failed to save template. Please try again.");
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setSuccess("");
    setError("");
  };

  const handleDeleteTemplate = async (id) => {
    setSuccess("");
    setError("");
    try {
      await deleteDoc(doc(db, "templates", id));
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      setSuccess("Template deleted successfully!");
    } catch (err) {
      console.error("Error deleting template:", err);
      setError("Failed to delete template. Please try again.");
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateContent("");
    setSuccess("");
    setError("");
  };

  // UI Improvements:
  // - Dark gradient background, rounded card for form
  // - Better spacing and transitions
  // - Clear feedback messages in center
  // - Mobile-friendly layout
  // - Hover effects and subtle animations

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 text-center tracking-wider text-gray-100">
          {editingTemplate ? "Edit WhatsApp Template" : "Add WhatsApp Template"}
        </h1>

        {success && (
          <p className="text-green-500 mb-4 text-center font-bold">{success}</p>
        )}
        {error && (
          <p className="text-red-500 mb-4 text-center font-bold">{error}</p>
        )}

        <form
          onSubmit={handleAddOrUpdateTemplate}
          className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 space-y-4"
        >
          <input
            type="text"
            placeholder="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Template Content (e.g., 'Hello {lead name}')"
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            rows={4}
            className="w-full p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="bg-gray-700 p-3 rounded shadow-inner text-sm text-gray-300">
            <p className="font-bold mb-2">Available placeholders:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <code className="bg-gray-600 px-1 py-0.5 rounded">{`{member name}`}</code> - Member's name
              </li>
              <li>
                <code className="bg-gray-600 px-1 py-0.5 rounded">{`{phone number}`}</code> - Lead's phone number
              </li>
              <li>
                <code className="bg-gray-600 px-1 py-0.5 rounded">{`{link}`}</code> - Member's referral link
              </li>
              <li>
                <code className="bg-gray-600 px-1 py-0.5 rounded">{`{lead name}`}</code> - Lead's name
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <button
              type="submit"
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded font-bold w-full transition"
            >
              {editingTemplate ? "Update Template" : "Add Template"}
            </button>
            {editingTemplate && (
              <button
                type="button"
                onClick={resetForm}
                className="p-3 bg-red-500 hover:bg-red-600 rounded font-bold w-full transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <h2 className="text-xl font-extrabold mt-10 mb-4 text-center">Existing Templates</h2>
        {templates.length === 0 ? (
          <p className="text-gray-400 text-center">No templates found.</p>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800 p-4 rounded flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 border border-gray-700 hover:shadow-xl transition"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-100">{template.name}</h3>
                  <p className="text-sm text-gray-300 mt-1">{template.content}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 bg-yellow-500 hover:bg-yellow-600 rounded font-bold text-sm transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded font-bold text-sm transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTemplate;
