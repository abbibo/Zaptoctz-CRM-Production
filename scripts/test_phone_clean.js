
const cleanPhoneNumber = (phone) => {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, ""); // Remove non-digits

  // If starts with 91 and length is 12, remove 91
  if (cleaned.length > 10 && cleaned.startsWith("91")) {
      cleaned = cleaned.substring(2);
  }
  // If starts with 0 and length is 11, remove 0
  if (cleaned.length > 10 && cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
  }
  return cleaned;
};

const testCases = [
    { input: "9876543210", expected: "9876543210" },
    { input: "+91 9876543210", expected: "9876543210" },
    { input: "919876543210", expected: "9876543210" },
    { input: "09876543210", expected: "9876543210" },
    { input: "987-654-3210", expected: "9876543210" },
    { input: "(987) 654 3210", expected: "9876543210" },
    { input: "  9876543210  ", expected: "9876543210" },
    { input: "+91-987-654-3210", expected: "9876543210" },
    // Edge cases
    { input: "123", expected: "123" }, // Should remain as is, validation will fail later
    { input: "91987654321", expected: "91987654321" }, // 11 digits starting with 91? No, logic says > 10 & starts with 91 -> remove 91. 
                                                         // If input is 91 + 9 digits = 11 digits total. 
                                                         // 91987654321 -> remove 91 -> 987654321 (9 digits).
    
    // Let's test checking if cleaning leads to valid 10 digits
];

console.log("Running Phone Cleaning Tests...");
let passed = 0;
testCases.forEach(({ input, expected }, index) => {
    const result = cleanPhoneNumber(input);
    if (result === expected) {
        console.log(`✅ Test ${index + 1} Passed: "${input}" -> "${result}"`);
        passed++;
    } else {
        console.error(`❌ Test ${index + 1} Failed: "${input}" -> Expected "${expected}", Got "${result}"`);
    }
});

console.log(`\nTests Completed: ${passed}/${testCases.length} passed.`);
