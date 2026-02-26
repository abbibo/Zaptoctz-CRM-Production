import React from "react";

const ProcessingModal = ({ isOpen, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
        {/* Spinner */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        
        <h2 className="text-xl font-extrabold text-white text-center mb-2">
          {message || "Processing..."}
        </h2>
        <p className="text-gray-400 text-sm text-center">
          Please wait while we complete this action.
        </p>
      </div>
    </div>
  );
};

export default ProcessingModal;
