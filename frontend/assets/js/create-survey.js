/**
 * Create Survey Page JavaScript
 * Handles survey creation form functionality
 */

// Character limits
const LIMITS = {
  title: 200,
  area: 100,
  question: 1000,
  permittedResponses: 500,
  summaryInstructions: 300,
  domain: 100,
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // Update user info in navbar
  updateUserInfo();

  // Initialize form functionality
  setupCharacterCounters();
  setupDomainInputs();
  setupEventListeners();
  setMinDate();
});

/**
 * Update user info in the navbar
 */
function updateUserInfo() {
  const user = getUserInfo();
  const usernameElement = document.getElementById("username");

  if (user && usernameElement) {
    usernameElement.textContent = user.username;
  }
}

/**
 * Set up character counters for text fields
 */
function setupCharacterCounters() {
  const fieldsWithCounters = [
    { id: "title", limit: LIMITS.title },
    { id: "area", limit: LIMITS.area },
    { id: "question", limit: LIMITS.question },
    { id: "permittedResponses", limit: LIMITS.permittedResponses },
    { id: "summaryInstructions", limit: LIMITS.summaryInstructions },
  ];

  fieldsWithCounters.forEach(({ id, limit }) => {
    const field = document.getElementById(id);
    const counter = document.getElementById(`${id}Counter`);

    if (field && counter) {
      const updateCounter = () => {
        const remaining = limit - field.value.length;
        counter.textContent = `${field.value.length}/${limit} characters`;
        counter.style.color = remaining < 20 ? "#e53e3e" : "#666";
      };

      field.addEventListener("input", updateCounter);
      updateCounter(); // Initial update
    }
  });
}

/**
 * Set up domain inputs functionality
 */
function setupDomainInputs() {
  const addDomainBtn = document.getElementById("addDomainBtn");

  if (addDomainBtn) {
    addDomainBtn.addEventListener("click", addDomainInput);
  }

  // Set up remove functionality for existing inputs
  updateRemoveButtons();
}

/**
 * Add a new domain input field
 */
function addDomainInput() {
  const container = document.getElementById("domainsContainer");
  const inputGroup = document.createElement("div");
  inputGroup.className = "domain-input-group";

  inputGroup.innerHTML = `
    <input
      type="text"
      class="domain-input"
      placeholder="e.g., opportunities, threats"
      maxlength="100"
    />
    <button type="button" class="remove-domain-btn">×</button>
  `;

  container.appendChild(inputGroup);

  // Add event listener to remove button
  const removeBtn = inputGroup.querySelector(".remove-domain-btn");
  removeBtn.addEventListener("click", () => removeDomainInput(inputGroup));

  updateRemoveButtons();
}

/**
 * Remove a domain input field
 */
function removeDomainInput(inputGroup) {
  inputGroup.remove();
  updateRemoveButtons();
}

/**
 * Update visibility of remove buttons
 */
function updateRemoveButtons() {
  const inputGroups = document.querySelectorAll(".domain-input-group");

  inputGroups.forEach((group, index) => {
    const removeBtn = group.querySelector(".remove-domain-btn");
    if (removeBtn) {
      // Show remove button only if there's more than one input
      removeBtn.style.display =
        inputGroups.length > 1 ? "inline-block" : "none";
    }
  });
}

/**
 * Set minimum date to tomorrow
 */
function setMinDate() {
  const dateInput = document.getElementById("expiryDate");
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split("T")[0];
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Form submission
  const form = document.getElementById("createSurveyForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      removeToken();
      window.location.href = "login.html";
    });
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  // Clear previous errors
  clearErrors();

  // Collect form data
  const formData = collectFormData();

  // Validate form data
  if (!validateFormData(formData)) {
    return;
  }

  // Submit survey
  await submitSurvey(formData);
}

/**
 * Collect form data
 */
function collectFormData() {
  const domainInputs = document.querySelectorAll(".domain-input");
  const permittedDomains = Array.from(domainInputs)
    .map((input) => input.value.trim())
    .filter((value) => value.length > 0);

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
 * Validate form data
 */
function validateFormData(data) {
  let isValid = true;

  // Required field validation
  if (!data.title) {
    showFieldError("title", "Survey title is required");
    isValid = false;
  }

  if (!data.area) {
    showFieldError("area", "Survey area is required");
    isValid = false;
  }

  if (!data.guidelines.question) {
    showFieldError("question", "Survey question is required");
    isValid = false;
  }

  if (!data.expiryDate) {
    showFieldError("expiryDate", "Expiry date is required");
    isValid = false;
  } else {
    // Check if date is in the future
    const selectedDate = new Date(data.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      showFieldError("expiryDate", "Expiry date must be in the future");
      isValid = false;
    }
  }

  if (data.guidelines.permittedDomains.length === 0) {
    showFieldError(
      "permittedDomains",
      "At least one response category is required"
    );
    isValid = false;
  }

  if (!data.guidelines.permittedResponses) {
    showFieldError("permittedResponses", "Response guidelines are required");
    isValid = false;
  }

  if (!data.guidelines.summaryInstructions) {
    showFieldError("summaryInstructions", "Summary instructions are required");
    isValid = false;
  }

  return isValid;
}

/**
 * Submit survey to API
 */
async function submitSurvey(formData) {
  try {
    // Disable submit button to prevent double submission
    const submitBtn = document.getElementById("submitButton");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Survey...";

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
  } catch (error) {
    console.error("Error creating survey:", error);
    showError("Failed to create survey: " + error.message);

    // Re-enable submit button
    const submitBtn = document.getElementById("submitButton");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Survey";
  }
}

/**
 * Clear all field errors
 */
function clearErrors() {
  const errorElements = document.querySelectorAll(".field-error");
  errorElements.forEach((element) => {
    element.textContent = "";
    element.style.display = "none";
  });

  // Clear general error message
  const errorMessage = document.getElementById("error-message");
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
}

/**
 * Show field-specific error
 */
function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  const successElement = document.getElementById("success-message");
  if (successElement) {
    successElement.textContent = message;
    successElement.style.display = "block";

    // Hide after 5 seconds
    setTimeout(() => {
      successElement.style.display = "none";
    }, 5000);
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorElement = document.getElementById("error-message");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";

    // Hide after 10 seconds
    setTimeout(() => {
      errorElement.style.display = "none";
    }, 10000);
  }
}
