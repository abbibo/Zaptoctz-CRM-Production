import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Cleans phone number to 10 digits.
 * Removes non-digits.
 * Removes leading +91, 91, or 0 if result is > 10 digits.
 */
export const cleanPhoneNumber = (phone) => {
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
  
  // If simply > 10 digits, we might want to take last 10? 
  // But safest is to return what we have and let validation fail if it's still weird.
  // For now, let's stick to the common Indian prefixes.

  return cleaned;
};


/**
 * Normalizes lead data to { name, phone }.
 */
const normalizeLead = (lead) => {
  const keys = Object.keys(lead);
  let name = "";
  let phone = "";

  // 1. Try exact or common keys
  if (lead.name) name = lead.name;
  else if (lead.Name) name = lead.Name;
  else if (lead["Lead Name"]) name = lead["Lead Name"];
  
  if (lead.phone) phone = lead.phone;
  else if (lead.Phone) phone = lead.Phone;
  else if (lead.Mobile) phone = lead.Mobile;
  else if (lead["Phone Number"]) phone = lead["Phone Number"];

  // 2. Fuzzy search keys if still missing
  if (!name) {
    const nameKey = keys.find(k => k.toLowerCase().includes("name"));
    if (nameKey) name = lead[nameKey];
  }
  if (!phone) {
    const phoneKey = keys.find(k => 
      k.toLowerCase().includes("phone") || 
      k.toLowerCase().includes("mobile") ||
      k.toLowerCase().includes("contact")
    );
    if (phoneKey) phone = lead[phoneKey];
  }

  return {
    name: name ? String(name).trim() : "",
    phone: cleanPhoneNumber(phone), // Use cleaning logic here too
  };
};

/**
 * Parses file (CSV, Excel) -> [{name, phone}, ...]
 */
export const parseImportData = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("No file provided");
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const leads = results.data
            .map(normalizeLead)
            .filter(l => l.name && l.phone); // Strict filter for valid rows
          resolve(leads);
        },
        error: (err) => reject("CSV Parse Error: " + err.message),
      });
    } else if (["xlsx", "xls"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet);
          const leads = json
            .map(normalizeLead)
            .filter(l => l.name && l.phone);
          resolve(leads);
        } catch (err) {
          console.error(err);
          reject("Excel Parse Error: " + err.message);
        }
      };
      reader.onerror = (err) => reject("File Read Error: " + err);
      reader.readAsArrayBuffer(file);
    } else {
      reject("Unsupported file type. Please upload .csv, .xlsx, or .xls");
    }
  });
};

/**
 * Parses pasted text -> [{name, phone}, ...]
 * Supports Tab-separated (Excel copy) or Comma-separated.
 */
export const parsePasteData = (text) => {
  if (!text || !text.trim()) return [];

  // Use PapaParse slightly differently for text
  // First, try generic parse which detects delimiter
  const results = Papa.parse(text.trim(), {
    header: true, 
    skipEmptyLines: true,
  });

  // Check if we got valid headers
  if (results.meta && results.meta.fields) {
      const headers = results.meta.fields.map(h => h.toLowerCase());
      const hasName = headers.some(h => h.includes("name"));
      const hasPhone = headers.some(h => h.includes("phone") || h.includes("mobile"));
      
      if (hasName && hasPhone) {
        return results.data.map(normalizeLead).filter(l => l.name && l.phone);
      }
  }

  // Fallback: No header or unknown header -> Assume Column order or use regex
  // Often pasted data from Excel has no headers if user just copied rows.
  // OR they copied headers too. 
  // If `results.data` has content, let's try to map it.

  // If header:true failed to find keys, maybe try header:false
  const rawResults = Papa.parse(text.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  return rawResults.data.map(row => {
    // Row is array [col1, col2, ...]
    let name = "";
    let phone = "";
    
    // Simple heuristic: Phone is digits, Name is letters.
    row.forEach(cell => {
        const val = String(cell).trim();
        if (/^[\d-+\s()]{7,20}$/.test(val) && /\d/.test(val)) {  
            // Likely phone (allow some chars like +, -, space, parens)
            // But strip them for storage? normalizeLead doesn't strip chars, just trims.
            // We'll leave it to the caller to validate/format strict 10-digit.
            phone = val;
        } else if (!name && /[a-zA-Z]/.test(val)) {
            name = val;
        }
    });

    // Fallback position-based if fuzzy failed (e.g. name is "123 Street")
    if ((!name || !phone) && row.length >= 2) {
        // Assume [Name, Phone] or [Phone, Name]?
        // Standard is usually Name first.
        if (!name) name = row[0];
        if (!phone) phone = row[1];
    }
    
    return { name, phone };
  }).filter(l => l.name && l.phone);
};
