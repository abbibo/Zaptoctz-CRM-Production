import React, { useState, useRef, useEffect } from "react";

// ---------- Helper Functions ----------

// Generate a dynamic verification code.
function generateVerificationCode() {
  return "ONBOARD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ---------- Call Flow Scripts ----------
// Four flows will run sequentially.
const scripts = {
  "Cold Lead": {
    en: [
      {
        speaker: "Agent",
        text: "Hi, this is [Your Name] from Zaptockz. Am I speaking to Mr./Ms. [Customer Name]?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "Yes, what's this about?",
        record: false,
      },
      {
        speaker: "Agent",
        text: "We offer courses and real internships to help you grow your career. May I have a minute of your time?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "I’m listening.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "Great! Let me explain our Digital Marketing course in detail before we proceed further.",
        record: true,
      },
      {
        speaker: "Customer",
        text: "Okay, I’m interested.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "Thank you for your time. Goodbye!",
        record: true,
      },
    ],
    ml: [
      {
        speaker: "Agent",
        text: "ഹലോ, ഞാൻ [നിങ്ങളുടെ പേര്], Zaptockzൽ നിന്നാണ്. [Customer Name] ആണോ?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "അതെ, എന്തിനെയാണിത്?",
        record: false,
      },
      {
        speaker: "Agent",
        text: "നിങ്ങളുടെ കരിയർ മെച്ചപ്പെടുത്താൻ കോഴ്സുകളും തത്സമയ ഇൻറേൺഷിപ്പുകളും നൽകുകയാണ് ഞങ്ങൾ. ഒരു മിനിറ്റ് തരാമോ?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "ഞാൻ കേൾക്കുന്നു.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "ശരി! ഞങ്ങളുടെ ഡിജിറ്റൽ മാർക്കറ്റിംഗ് കോഴ്സ് വിശദമായി വിശദീകരിക്കട്ടെ.",
        record: true,
      },
      {
        speaker: "Customer",
        text: "ശരി, താൽപര്യമുണ്ട്.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "നന്ദി, ഞാൻ വീണ്ടും വിളിക്കാം. വിട!",
        record: true,
      },
    ],
  },
  "Warm Lead": {
    en: [
      {
        speaker: "Agent",
        text: "Hi [Customer Name], this is [Your Name] from Zaptockz. I noticed your interest in our Marketing course. Is now a good time?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "Yes, I'd love more details.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "Let me walk you through the key benefits and structure of our course.",
        record: true,
      },
      {
        speaker: "Customer",
        text: "Sounds good.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "Thank you for your time. I’ll follow up soon. Goodbye!",
        record: true,
      },
    ],
    ml: [
      {
        speaker: "Agent",
        text: "ഹായ് [Customer Name], Zaptockzയിൽ നിന്നുള്ള [നിങ്ങളുടെ പേര്]. മാർക്കറ്റിംഗ് കോഴ്സിൽ താൽപര്യം കാണിച്ചുവല്ലോ. ഇപ്പോൾ സംസാരിക്കാം?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "അതെ, കൂടുതൽ വിവരങ്ങൾ അറിയാൻ ആഗ്രഹിക്കുന്നു.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "ഞങ്ങളുടെ കോഴ്സ് ഘടനയും ഗുണങ്ങളും വിശദീകരിക്കാം.",
        record: true,
      },
      {
        speaker: "Customer",
        text: "ശരി, കേൾക്കാം.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "നന്ദി, ഉടനെ വിളിക്കാം. വിട!",
        record: true,
      },
    ],
  },
  Interested: {
    en: [
      {
        speaker: "Agent",
        text: "Hello [Customer Name], thanks for showing interest in Zaptockz! How can we assist you further?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "I’d like to know more about the course fees and schedule.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "Let me provide you with those details shortly.",
        record: true,
      },
      {
        speaker: "Agent",
        text: "Thank you for your time. Goodbye!",
        record: true,
      },
    ],
    ml: [
      {
        speaker: "Agent",
        text: "ഹലോ [Customer Name], Zaptockzയിൽ താൽപര്യം കാണിച്ചതിന് നന്ദി! എന്താണ് അറിയേണ്ടത്?",
        record: true,
      },
      {
        speaker: "Customer",
        text: "കോഴ്സ് ഫീസ്, സമയക്രമം എന്നിവ അറിയണം.",
        record: false,
      },
      {
        speaker: "Agent",
        text: "അതിനെക്കുറിച്ച് ഞാൻ ഉടനെ വിശദീകരിക്കാം.",
        record: true,
      },
      {
        speaker: "Agent",
        text: "നന്ദി, വീണ്ടും വിളിക്കാം. വിട!",
        record: true,
      },
    ],
  },
  "Not Picking": {
    en: [
      {
        speaker: "Agent",
        text: "The customer did not pick up. Please try again later.",
        record: false,
      },
    ],
    ml: [
      {
        speaker: "Agent",
        text: "ഉപഭോക്താവ് കോൾ എടുത്തില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
        record: false,
      },
    ],
  },
};

// ---------- Module Definitions ----------
const modules = [
  {
    id: 1,
    type: "static",
    title: {
      en: "Course Overview",
      ml: "കോഴ്സ് അവലോകനം",
    },
    content: {
      en: `Welcome to our Digital Marketing Certification Course!

In this course you will learn:
• Advanced SEO & Content Marketing techniques
• Social Media Strategies and PPC Advertising
• Email Marketing, Web Analytics, Affiliate Marketing, and more

Our program is designed by industry experts and combines theory with hands-on practical sessions. You’ll gain the skills and experience needed to excel in today’s digital landscape.`,
      ml: `നമ്മുടെ ഡിജിറ്റൽ മാർക്കറ്റിംഗ് സർട്ടിഫിക്കേഷൻ കോഴ്സിലേക്ക് ഹൃദയപൂർവം സ്വാഗതം!

ഈ കോഴ്സിൽ നിങ്ങൾ പഠിക്കും:
• അഡ്വാൻസ്ഡ് SEO, കണ്ടന്റ് മാർക്കറ്റിംഗ് തന്ത്രങ്ങൾ
• സോഷ്യൽ മീഡിയ തന്ത്രങ്ങളും PPC പരസ്യങ്ങളും
• ഇമെയിൽ മാർക്കറ്റിംഗ്, വെബ് അനലിറ്റിക്സ്, അഫിലിയേറ്റ് മാർക്കറ്റിംഗ് എന്നിവ

ഇന്ത്യസ്ട്രി വിദഗ്ധർ രൂപകല്പന ചെയ്ത ഈ പ്രോഗ്രാം സിദ്ധാന്തവും പ്രായോഗികവും ഒരുമിച്ചാണ്. ഇന്നത്തെ ഡിജിറ്റൽ ലോകത്തിൽ വിജയിക്കാൻ ആവശ്യമായ കഴിവുകളും അനുഭവങ്ങളും നിങ്ങൾക്ക് ലഭിക്കും.`
    }
  },
  {
    id: 2,
    type: "static",
    title: {
      en: "About Zaptockz",
      ml: "Zaptockzനെക്കുറിച്ച്",
    },
    content: {
      en: `Founded in 2020 by Qelora Edtech LLP, Zaptockz is a premier platform dedicated to empowering individuals with digital skills.

Our mission is to bridge the gap between traditional education and the modern digital economy. We offer accessible, affordable, and effective learning solutions across 3 countries – having trained over 15,000 professionals so far.`,
      ml: `2020-ൽ Qelora Edtech LLP ന്റെ നേതൃത്വത്തിൽ സ്ഥാപിതമായ Zaptockz, ഡിജിറ്റൽ കഴിവുകൾ വഴി വ്യക്തികളെ വിജയിപ്പിക്കുന്ന ഒരു പ്രീമിയർ പ്ലാറ്റ്ഫോമാണ്.

പരമ്പരാഗത വിദ്യാഭ്യാസവും ആധുനിക ഡിജിറ്റൽ സമ്പദ്‌വ്യവസ്ഥയും തമ്മിലുള്ള പാളി കുറയ്ക്കുക എന്നതാണ് ഞങ്ങളുടെ ദൗത്യം. 3 രാജ്യങ്ങളിലായി 15,000+ പ്രൊഫഷണലുകൾക്ക് പരിശീലനം നൽകി, ഫലപ്രദമായ പഠന പരിഹാരങ്ങൾ നൽകുന്നു.`
    }
  },
  {
    id: 3,
    type: "callSimulation",
    title: {
      en: "Call Simulation",
      ml: "കോൾ സിമുലേഷൻ",
    },
    // This module will run the full call simulation flow step-by-step.
  },
  {
    id: 4,
    type: "static",
    title: {
      en: "Internship Details",
      ml: "ഇൻറേൺഷിപ്പ് വിശദാംശങ്ങൾ",
    },
    content: {
      en: `Upon completing the course, you'll embark on a 1-month unpaid internship that offers hands-on experience in digital marketing.

During the internship, you'll:
• Work on real-world projects under experienced mentors.
• Apply your skills to live marketing campaigns.
• Receive an internship certificate upon successful completion.
• Gain valuable insights into the daily operations of digital marketing professionals.`,
      ml: `കോഴ്‌സ് പൂർത്തിയാക്കിയതിന് ശേഷം, നിങ്ങൾക്ക് 1-മാസം അനുപരിശോധന ഇൻറേൺഷിപ്പിലൂടെ ഡിജിറ്റൽ മാർക്കറ്റിംഗിലെ പ്രായോഗിക അനുഭവം ലഭിക്കും.

ഇൻറേൺഷിപ്പിനിടയിൽ, നിങ്ങൾ:
• പരിചയസമ്പന്നരായ മെന്റർമാരുടെ മാർഗനിർദ്ദേശത്തിൽ യഥാർത്ഥ പ്രോജക്റ്റുകളിൽ ജോലി ചെയ്യും.
• പഠിച്ച കഴിവുകൾ യഥാർത്ഥ മാർക്കറ്റിംഗ് ക്യാമ്പെയ്‌നുകളിൽ പ്രയോഗിക്കും.
• വിജയകരമായി പൂർത്തിയാക്കിയതിന് ശേഷം ഇൻറേൺഷിപ്പ് സർട്ടിഫിക്കറ്റ് നേടും.
• ഡിജിറ്റൽ മാർക്കറ്റിംഗ് പ്രൊഫഷണലുകളുടെ ദിനചര്യ പ്രവർത്തനങ്ങളെക്കുറിച്ച് വിലപ്പെട്ട അറിവുകൾ നേടും.`
    }
  },
  {
    id: 5,
    type: "static",
    title: {
      en: "Placement Assistance",
      ml: "പ്ലേസ്‌മെന്റ് അസിസ്റ്റൻസ്",
    },
    content: {
      en: `We provide comprehensive placement assistance to help you secure job opportunities in digital marketing.

Our support includes:
• Access to our community forum with job postings.
• Resume building and interview preparation workshops.
• Networking with industry professionals.
• Referral support for job openings.`,
      ml: `ഡിജിറ്റൽ മാർക്കറ്റിംഗ് മേഖലയിലെ ജോബ് അവസരങ്ങൾ ഉറപ്പാക്കാൻ ഞങ്ങൾ സമഗ്രമായ പ്ലേസ്‌മെന്റ് അസിസ്റ്റൻസ് നൽകുന്നു.

ഞങ്ങളുടെ സഹായത്തിൽ ഉൾപ്പെടുന്നത്:
• ജോബ് പോസ്റ്റിംഗ്‌സ് ഉള്ള കമ്മ്യൂണിറ്റി ഫോറത്തിലേക്കുള്ള ആക്സസ്.
• റിസ്യൂം നിർമ്മിക്കൽ, ഇന്റർവ്യൂ തയ്യാറെടുപ്പ് വർക്ക്‌ഷോപ്പുകൾ.
• ഇന്ത്യസ്ട്രി പ്രൊഫഷണലുകളുമായി നെറ്റ്‌വർക്കിംഗ്.
• ജോബ് അവസരങ്ങൾക്ക് റഫറൽ പിന്തുണ.`
    }
  },
  {
    id: 6,
    type: "static",
    title: {
      en: "Benefits",
      ml: "ഗുണങ്ങൾ",
    },
    content: {
      en: `As a Sales Associate, you will enjoy:
• A flexible work schedule.
• Continuous learning and skill development.
• A supportive and collaborative team environment.
• Bonuses via our referral program.
• Access to exclusive training materials and career advancement opportunities.`,
      ml: `ഒരു സെയിൽസ് അസോസിയേറ്റ് ആയി, നിങ്ങൾക്ക് ലഭിക്കും:
• മാറ്റങ്ങളുള്ള ജോലി സമയക്രമം.
• തുടർച്ചയായ പഠനവും കഴിവ് വികസനവും.
• പിന്തുണയുള്ള, സഹകരിക്കുന്ന ടീം അന്തരീക്ഷം.
• റഫറൽ പ്രോഗ്രാമിലൂടെ ബോണസുകൾ.
• പ്രത്യേക പരിശീലന സാമഗ്രികളും കരിയർ പുരോഗതിക്ക് അവസരങ്ങളും.`
    }
  },
  {
    id: 7,
    type: "verification",
    title: {
      en: "Verification",
      ml: "വെരിഫിക്കേഷൻ",
    },
    // Verification module; dynamic code will be generated.
  },
];

// ---------- Main Onboarding Component ----------
const Onboarding = () => {
  const [currentModule, setCurrentModule] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    if (modules[currentModule].type === "verification") {
      setVerificationCode(generateVerificationCode());
    }
  }, [currentModule]);

  const nextModule = () => {
    if (currentModule < modules.length - 1) {
      setCurrentModule(currentModule + 1);
    }
  };

  return (
    <div style={styles.container}>
      <LanguageToggle
        selectedLanguage={selectedLanguage}
        onChange={setSelectedLanguage}
      />
      <ProgressIndicator current={currentModule} total={modules.length} />
      <ModuleContent
        module={modules[currentModule]}
        selectedLanguage={selectedLanguage}
        verificationCode={verificationCode}
        onSimulationComplete={nextModule}
      />
      {modules[currentModule].type !== "callSimulation" && (
        <button style={styles.nextButton} onClick={nextModule}>
          {selectedLanguage === "en" ? "Next →" : "അടുത്തത് →"}
        </button>
      )}
    </div>
  );
};

// ---------- Language Toggle Component ----------
const LanguageToggle = ({ selectedLanguage, onChange }) => {
  return (
    <div style={styles.languageToggle}>
      <label htmlFor="language-select" style={styles.toggleLabel}>
        Language:
      </label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => onChange(e.target.value)}
        style={styles.toggleSelect}
      >
        <option value="en">English</option>
        <option value="ml">മലയാളം</option>
      </select>
    </div>
  );
};

// ---------- Progress Indicator Component ----------
const ProgressIndicator = ({ current, total }) => {
  return (
    <div style={styles.progressContainer}>
      <div style={styles.progressText}>{`Step ${current + 1} of ${total}`}</div>
      <div style={styles.progressBar}>
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            style={{
              ...styles.progressStep,
              background: index <= current ? "#007AFF" : "#ddd",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ---------- Module Content Component ----------
const ModuleContent = ({
  module,
  selectedLanguage,
  verificationCode,
  onSimulationComplete,
}) => {
  if (module.type === "static") {
    return (
      <div style={styles.moduleContainer}>
        <h1>{module.title[selectedLanguage]}</h1>
        <p style={styles.contentText}>{module.content[selectedLanguage]}</p>
      </div>
    );
  } else if (module.type === "callSimulation") {
    return (
      <div style={styles.moduleContainer}>
        <h1>{module.title[selectedLanguage]}</h1>
        <CallSimulationFlow
          selectedLanguage={selectedLanguage}
          onComplete={onSimulationComplete}
        />
      </div>
    );
  } else if (module.type === "verification") {
    return (
      <div style={styles.moduleContainer}>
        <h1>{module.title[selectedLanguage]}</h1>
        <p style={styles.contentText}>
          {selectedLanguage === "en"
            ? "Congratulations on completing the onboarding process! Please take a screenshot of the verification code below and send it to us to confirm your completion."
            : "ഓൺബോർഡിംഗ് പൂർത്തിയാക്കിയതിന് അഭിനന്ദനങ്ങൾ! ദയവായി താഴെയുള്ള വെരിഫിക്കേഷൻ കോഡ് സ്ക്രീൻഷോട്ട് എടുത്ത് ഞങ്ങൾക്ക് അയയ്ക്കുക."}
        </p>
        <VerificationCode code={verificationCode} />
      </div>
    );
  }
  return null;
};

// ---------- Call Simulation Flow Component ----------
// Shows one script step at a time and automatically advances through flows.
// When the last step of the last flow is complete, a "Simulation Complete. Next →" button is shown.
const CallSimulationFlow = ({ selectedLanguage, onComplete }) => {
  const flows = ["Cold Lead", "Warm Lead", "Interested", "Not Picking"];
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0);
  const currentFlowName = flows[currentFlowIndex];
  const script = scripts[currentFlowName][selectedLanguage] || [];
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);

  // Reset step state when flow or language changes.
  useEffect(() => {
    setCurrentStep(0);
    setStepCompleted(false);
  }, [currentFlowName, selectedLanguage]);

  // Guard: if no script available.
  const currentScriptStep = script[currentStep];
  if (!currentScriptStep) {
    return (
      <p style={styles.notice}>
        {selectedLanguage === "en"
          ? "No script available for this flow."
          : "ഈ ഫ്ലോയിലേക്കുള്ള സ്ക്രിപ്റ്റ് ലഭ്യമല്ല."}
      </p>
    );
  }

  const nextStep = () => {
    if (currentStep < script.length - 1) {
      setCurrentStep(currentStep + 1);
      setStepCompleted(false);
    } else {
      // Finished current flow.
      if (currentFlowIndex < flows.length - 1) {
        setCurrentFlowIndex(currentFlowIndex + 1);
        setStepCompleted(false);
      } else {
        // Last flow finished: mark simulation as complete.
        setSimulationComplete(true);
      }
    }
  };

  return (
    <div>
      <h3>
        {selectedLanguage === "en"
          ? `Flow: ${currentFlowName} (Step ${currentStep + 1} of ${script.length})`
          : `ഫ്ലോ: ${currentFlowName} (ഘട്ടം ${currentStep + 1} / ${script.length})`}
      </h3>
      <div style={styles.stepContainer}>
        <p>
          <strong>{currentScriptStep.speaker}:</strong> {currentScriptStep.text}
        </p>
        {currentScriptStep.record ? (
          <RecordStep
            key={`record-${currentFlowIndex}-${currentStep}`}
            stepIndex={currentStep}
            onRecorded={() => setStepCompleted(true)}
            selectedLanguage={selectedLanguage}
          />
        ) : (
          <p style={styles.notice}>
            {selectedLanguage === "en"
              ? "No recording required for this step."
              : "ഈ ഘട്ടത്തിന് റെക്കോർഡിംഗ് ആവശ്യമായില്ല."}
          </p>
        )}
        {simulationComplete ? (
          <button style={styles.nextButton} onClick={onComplete}>
            {selectedLanguage === "en"
              ? "Simulation Complete. Next →"
              : "സിമുലേഷൻ പൂർത്തിയായി. അടുത്തത് →"}
          </button>
        ) : (
          <button
            style={styles.nextButton}
            onClick={nextStep}
            disabled={currentScriptStep.record && !stepCompleted}
          >
            {currentStep === script.length - 1
              ? selectedLanguage === "en"
                ? "Finish Flow →"
                : "ഫ്ലോ പൂർത്തിയാക്കുക →"
              : selectedLanguage === "en"
              ? "Next Step →"
              : "അടുത്ത ഘട്ടം →"}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------- Record Step Component ----------
// Provides an interactive UI for recording with a live timer.
const RecordStep = ({ stepIndex, onRecorded, selectedLanguage }) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    if (!window.MediaRecorder) {
      alert(
        selectedLanguage === "en"
          ? "Audio recording is not supported on your browser. Please use Chrome or Firefox."
          : "നിങ്ങളുടെ ബ്രൗസറിൽ ഓഡിയോ റെക്കോർഡിംഗ് പിന്തുണയുള്ളതല്ല. ദയവായി Chrome അല്ലെങ്കിൽ Firefox ഉപയോഗിക്കുക."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordTime(0);
      audioChunksRef.current = [];
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        clearInterval(timerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setRecording(false);
        onRecorded();
      };
    } catch (err) {
      alert(
        selectedLanguage === "en"
          ? "Error accessing your microphone."
          : "മൈക്രോഫോൺ ആക്സസ് ചെയ്യുന്നതിൽ പിശക്."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={styles.recordStep}>
      <p style={{ marginBottom: "5px", fontStyle: "italic" }}>
        {selectedLanguage === "en"
          ? "Tap 'Start Recording' and speak your response. Then tap 'Stop Recording'."
          : "റെക്കോർഡ് ആരംഭിക്കാൻ 'Start Recording' അമർത്തുക, നിങ്ങളുടെ പ്രതികരണം പറയുക. ശേഷം 'Stop Recording' അമർത്തുക."}
      </p>
      <div style={styles.buttonGroup}>
        <button
          onClick={startRecording}
          disabled={recording || audioUrl !== null}
          style={styles.recordButton}
        >
          {selectedLanguage === "en" ? "Start Recording" : "റെക്കോർഡ് ആരംഭിക്കുക"}
        </button>
        <button
          onClick={stopRecording}
          disabled={!recording}
          style={styles.recordButton}
        >
          {selectedLanguage === "en" ? "Stop Recording" : "റെക്കോർഡ് നിർത്തുക"}
        </button>
      </div>
      {recording && (
        <p style={styles.timerText}>
          {selectedLanguage === "en"
            ? `Recording... ${recordTime} sec`
            : `റെക്കോർഡ് ചെയ്യുന്നു... ${recordTime} സെക്കന്റ്`}
        </p>
      )}
      {audioUrl && (
        <div style={styles.audioContainer}>
          <p>{selectedLanguage === "en" ? "Playback:" : "പ്ലേബാക്ക്:"}</p>
          <audio src={audioUrl} controls />
        </div>
      )}
    </div>
  );
};

// ---------- Verification Code Component ----------
const VerificationCode = ({ code }) => {
  return (
    <div style={styles.verificationContainer}>
      <h2>{code}</h2>
    </div>
  );
};

// ---------- iOS-like Light-Themed & Interactive Styles ----------
const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    backgroundColor: "#F2F2F7", // iOS-like background
    color: "#1C1C1E",
    position: "relative",
    transition: "background 0.3s ease, color 0.3s ease",
  },
  languageToggle: {
    position: "absolute",
    top: "20px",
    right: "20px",
  },
  toggleLabel: {
    marginRight: "5px",
    fontWeight: "600",
  },
  toggleSelect: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #C7C7CC",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  progressContainer: {
    marginBottom: "20px",
  },
  progressText: {
    marginBottom: "5px",
    fontWeight: "600",
  },
  progressBar: {
    display: "flex",
    gap: "5px",
  },
  progressStep: {
    flex: 1,
    height: "5px",
    borderRadius: "2.5px",
    transition: "background 0.3s ease",
  },
  moduleContainer: {
    padding: "20px",
    borderRadius: "16px",
    background: "#fff",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    animation: "fadeIn 0.5s ease",
  },
  contentText: {
    fontSize: "16px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
  },
  nextButton: {
    padding: "12px 24px",
    background: "#007AFF",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background 0.3s ease",
    marginTop: "10px",
  },
  nextButtonHover: {
    background: "#005BB5",
  },
  flowSelector: {
    marginBottom: "15px",
    display: "none", // Automatic flow advancement; no manual selection.
  },
  stepContainer: {
    border: "1px solid #E5E5EA",
    padding: "15px",
    borderRadius: "12px",
    background: "#F9F9F9",
    marginBottom: "15px",
    transition: "all 0.3s ease",
  },
  notice: {
    color: "#FF3B30",
    fontWeight: "600",
  },
  recordStep: {
    marginTop: "10px",
    padding: "10px",
    background: "#FFF",
    borderRadius: "12px",
    border: "1px solid #C7C7CC",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  recordButton: {
    padding: "10px 16px",
    background: "#007AFF",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.3s ease",
  },
  timerText: {
    marginTop: "5px",
    fontStyle: "italic",
    color: "#8E8E93",
  },
  audioContainer: {
    marginTop: "10px",
  },
  verificationContainer: {
    marginTop: "20px",
    padding: "20px",
    border: "2px dashed #007AFF",
    textAlign: "center",
    background: "#fff",
    borderRadius: "12px",
  },
  // Keyframes for fadeIn animation.
  "@keyframes fadeIn": {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
};

export default Onboarding;
