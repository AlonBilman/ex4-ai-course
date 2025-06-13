/**
 * Create Survey Page JavaScript
 * Handles survey creation form functionality
 */

// Global variables
let permittedDomains = [];

/**
 * Initialize create survey page
 */
function initializeCreateSurveyPage() {
  // Check authentication
  if (!isLoggedIn()) {
    redirectToLogin();
    return;
  }

  // Update user info in navbar
  updateUserInfo();

  // Set minimum date to current date/time
  setMinimumDate();

  // Setup form handlers
  setupFormHandlers();

  // Setup domain management
  setupDomainManagement();
}

/**
 * Update user info in the navbar
 */
function updateUserInfo() {
  const user = getUserInfo();
  const usernameElement = document.getElementById("username");
  if (user && usernameElement) {
    usernameElement.textContent = user.username || "User";
  }
}

/**
 * Set minimum date to current date/time
 */
function setMinimumDate() {
  const now = new Date();
  // Add 1 hour to current time as minimum
  now.setHours(now.getHours() + 1);
  const isoString = now.toISOString().slice(0, 16); // Format for datetime-local
  document.getElementById("expiryDate").min = isoString;
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
  // Character counters
  setupCharacterCounter("title", "titleCharCount", 100);
  setupCharacterCounter("area", "areaCharCount", 50);
  setupCharacterCounter("question", "questionCharCount", 500);
  setupCharacterCounter("permittedResponses", "responsesCharCount", 1000);
  setupCharacterCounter("summaryInstructions", "summaryCharCount", 500);

  // Form submission
  const form = document.getElementById("createSurveyForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }
}

/**
 * Setup character counter for a field
 */
function setupCharacterCounter(fieldId, counterId, maxLength) {
  const field = document.getElementById(fieldId);
  const counter = document.getElementById(counterId);

  if (!field || !counter) return;

  field.addEventListener("input", function () {
    const currentLength = field.value.length;
    counter.textContent = currentLength;

    if (currentLength > maxLength * 0.9) {
      counter.parentElement.className =
        "text-right text-xs text-orange-500 mt-1";
    } else if (currentLength === maxLength) {
      counter.parentElement.className = "text-right text-xs text-red-500 mt-1";
    } else {
      counter.parentElement.className = "text-right text-xs text-gray-500 mt-1";
    }
  });
}

/**
 * Setup domain management functionality
 */
function setupDomainManagement() {
  const domainInput = document.getElementById("domainInput");
  const addDomainBtn = document.getElementById("addDomainBtn");

  if (!domainInput || !addDomainBtn) return;

  // Add domain on button click
  addDomainBtn.addEventListener("click", addDomain);

  // Add domain on Enter key
  domainInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomain();
    }
  });
}

/**
 * Add a new domain
 */
function addDomain() {
  const domainInput = document.getElementById("domainInput");
  const domain = domainInput.value.trim();

  if (!domain) {
    showError("Please enter a domain before adding");
    return;
  }

  if (domain.length > 30) {
    showError("Domain name is too long (maximum 30 characters)");
    return;
  }

  if (permittedDomains.includes(domain.toLowerCase())) {
    showError("This domain has already been added");
    return;
  }

  if (permittedDomains.length >= 10) {
    showError("Maximum 10 domains allowed");
    return;
  }

  // Add domain to array
  permittedDomains.push(domain);

  // Clear input
  domainInput.value = "";

  // Update display
  updateDomainsDisplay();
}

/**
 * Remove a domain
 */
function removeDomain(index) {
  permittedDomains.splice(index, 1);
  updateDomainsDisplay();
}

/**
 * Update domains display
 */
function updateDomainsDisplay() {
  const container = document.getElementById("domainsContainer");

  if (!container) return;

  if (permittedDomains.length === 0) {
    container.innerHTML =
      '<span class="text-gray-500 text-sm italic" id="domainsPlaceholder">Domains will appear here as you add them</span>';
  } else {
    container.innerHTML = permittedDomains
      .map(
        (domain, index) => `
            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                ${escapeHtml(domain)}
                <button 
                    type="button" 
                    onclick="removeDomain(${index})"
                    class="text-blue-600 hover:text-blue-800 font-bold"
                    title="Remove domain"
                >
                    ×
                </button>
            </span>
        `
      )
      .join("");
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  // Validate form
  if (!validateForm()) {
    return;
  }

  // Prepare form data
  const formData = prepareFormData();

  try {
    // Disable submit button
    const submitBtn = document.getElementById("submitButton");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Survey...";

    await submitSurvey(formData);
  } catch (error) {
    console.error("Error creating survey:", error);
    showError("Failed to create survey: " + error.message);

    // Re-enable submit button
    const submitBtn = document.getElementById("submitButton");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Survey";
    }
  }
}

/**
 * Validate form data
 */
function validateForm() {
  // Check required fields
  const requiredFields = [
    "title",
    "area",
    "question",
    "expiryDate",
    "permittedResponses",
    "summaryInstructions",
  ];

  for (const fieldId of requiredFields) {
    const field = document.getElementById(fieldId);
    if (!field || !field.value.trim()) {
      showError(`${getFieldLabel(fieldId)} is required`);
      if (field) field.focus();
      return false;
    }
  }

  // Check domains
  if (permittedDomains.length === 0) {
    showError("At least one permitted domain is required");
    const domainInput = document.getElementById("domainInput");
    if (domainInput) domainInput.focus();
    return false;
  }

  // Check expiry date
  const expiryDateField = document.getElementById("expiryDate");
  if (expiryDateField) {
    const expiryDate = new Date(expiryDateField.value);
    const now = new Date();

    if (expiryDate <= now) {
      showError("Expiry date must be in the future");
      expiryDateField.focus();
      return false;
    }
  }

  return true;
}

/**
 * Get user-friendly field label
 */
function getFieldLabel(fieldId) {
  const labels = {
    title: "Survey Title",
    area: "Survey Area",
    question: "Survey Question",
    expiryDate: "Expiry Date",
    permittedResponses: "Response Guidelines",
    summaryInstructions: "AI Summary Instructions",
  };
  return labels[fieldId] || fieldId;
}

/**
 * Prepare form data for submission
 */
function prepareFormData() {
  return {
    title: document.getElementById("title").value.trim(),
    area: document.getElementById("area").value.trim(),
    guidelines: {
      question: document.getElementById("question").value.trim(),
      permittedDomains: permittedDomains,
      permittedResponses: document
        .getElementById("permittedResponses")
        .value.trim(),
      summaryInstructions: document
        .getElementById("summaryInstructions")
        .value.trim(),
    },
    expiryDate: document.getElementById("expiryDate").value,
  };
}

/**
 * Submit survey to API
 */
async function submitSurvey(formData) {
  const response = await authenticatedFetch(`${API_BASE_URL}/surveys`, {
    method: "POST",
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to create survey");
  }

  const result = await response.json();

  // Show success message
  showSuccess("Survey created successfully! Redirecting to dashboard...");

  // Redirect to dashboard after a short delay
  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 2000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.removeDomain = removeDomain;
