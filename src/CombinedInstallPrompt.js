// src/CombinedInstallPrompt.js
import React, { useState, useEffect } from "react";

const CombinedInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [alreadyShown, setAlreadyShown] = useState(false);

  // Check if we already showed the prompt (stored in localStorage)
  useEffect(() => {
    const shownFlag = localStorage.getItem("installPromptShown");
    if (shownFlag === "true") {
      setAlreadyShown(true);
    }
  }, []);

  // Check if the app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsInstalled(standalone);
    };
    checkInstalled();
  }, []);

  useEffect(() => {
    // If the app is installed or we already showed the prompt, do nothing.
    if (isInstalled || alreadyShown) return;

    // Detect platform
    const userAgent = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

    if (isIOS) {
      // iOS does not support beforeinstallprompt, so show custom instructions.
      setShowIOSInstructions(true);
      localStorage.setItem("installPromptShown", "true");
    } else {
      // For Android and other non-iOS devices, listen for the beforeinstallprompt event.
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowAndroidPrompt(true);
        console.log("beforeinstallprompt event fired");
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, [isInstalled, alreadyShown]);

  // Android install button click handler
  const handleAndroidInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setShowAndroidPrompt(false);
    setDeferredPrompt(null);
    localStorage.setItem("installPromptShown", "true");
  };

  // Handler to close Android prompt without installing
  const handleCloseAndroidPrompt = () => {
    setShowAndroidPrompt(false);
    localStorage.setItem("installPromptShown", "true");
  };

  // Handler to close iOS instructions
  const handleCloseIOSInstructions = () => {
    setShowIOSInstructions(false);
    localStorage.setItem("installPromptShown", "true");
  };

  // Do not render the prompt if the app is installed or already shown
  if (isInstalled || alreadyShown) {
    return null;
  }

  return (
    <>
      {showAndroidPrompt && (
        <div style={modalContainerStyle}>
          <div style={modalContentStyle}>
            <h3 style={modalHeaderStyle}>Install App</h3>
            <p style={modalTextStyle}>
              Add this app to your home screen for a better experience.
            </p>
            <div style={modalButtonContainerStyle}>
              <button onClick={handleAndroidInstallClick} style={primaryButtonStyle}>
                Install
              </button>
              <button onClick={handleCloseAndroidPrompt} style={secondaryButtonStyle}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {showIOSInstructions && (
        <div style={iosModalContainerStyle}>
          <div style={iosModalContentStyle}>
            <h3 style={iosModalHeaderStyle}>Install App on iOS</h3>
            <p style={iosModalTextStyle}>
              To install this app, tap the Share icon in Safari and then select{" "}
              <strong>Add to Home Screen</strong>.
            </p>
            <button style={iosCloseButtonStyle} onClick={handleCloseIOSInstructions}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Improved UI Styles

// Android modal styles
const modalContainerStyle = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "8px",
  minWidth: "250px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
};

const modalHeaderStyle = {
  margin: "0 0 10px 0",
  fontSize: "18px",
  color: "#333",
};

const modalTextStyle = {
  fontSize: "14px",
  color: "#555",
  marginBottom: "15px",
};

const modalButtonContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
};

const primaryButtonStyle = {
  backgroundColor: "#007bff",
  color: "#fff",
  border: "none",
  padding: "10px 15px",
  borderRadius: "5px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  backgroundColor: "#6c757d",
  color: "#fff",
  border: "none",
  padding: "10px 15px",
  borderRadius: "5px",
  cursor: "pointer",
};

// iOS modal styles
const iosModalContainerStyle = {
  position: "fixed",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
};

const iosModalContentStyle = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "8px",
  minWidth: "250px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  textAlign: "center",
};

const iosModalHeaderStyle = {
  margin: "0 0 10px 0",
  fontSize: "18px",
  color: "#333",
};

const iosModalTextStyle = {
  fontSize: "14px",
  color: "#555",
  marginBottom: "15px",
};

const iosCloseButtonStyle = {
  backgroundColor: "#007bff",
  color: "#fff",
  border: "none",
  padding: "10px 15px",
  borderRadius: "5px",
  cursor: "pointer",
};

export default CombinedInstallPrompt;
