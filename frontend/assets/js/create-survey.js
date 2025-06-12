// Survey Creation Form - Main JavaScript File
// Handles form submission, validation, and preview functionality

const API_BASE_URL = "http://localhost:3000/api";

// Character limits based on backend validation
const LIMITS = {
  title: 200,
  area: 100,
  question: 1000,
  permittedResponses: 500,
  summaryInstructions: 300,
  domain: 100,
};

// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  setupCharacterCounters();
  initializeDomainInputs();
  setupEventListeners();
});

// Set up character counters for text fields
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

// Set up event listeners
function setupEventListeners() {
  // Form submission
  const form = document.getElementById("createSurveyForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // Preview button
  const previewBtn = document.getElementById("previewButton");
  if (previewBtn) {
    previewBtn.addEventListener("click", showPreview);
  }

  // Modal close events
  const closeBtn = document.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePreviewModal);
  }

  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    const modal = document.getElementById("previewModal");
    if (event.target === modal) {
      closePreviewModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePreviewModal();
    }
  });
}

// Initialize dynamic domain inputs
function initializeDomainInputs() {
  const addDomainBtn = document.getElementById("addDomainBtn");
  if (addDomainBtn) {
    addDomainBtn.addEventListener("click", addDomainInput);
  }
}

// Add a new domain input field
function addDomainInput() {
  const container = document.getElementById("domainsContainer");
  const inputCount = container.querySelectorAll("input").length;

  if (inputCount >= 10) {
    showError("Maximum 10 domains allowed");
    return;
  }

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "domain-input-wrapper";

  inputWrapper.innerHTML = `
    <input 
      type="text" 
      placeholder="e.g., technology, healthcare, education" 
      maxlength="${LIMITS.domain}"
      required
    >
    <button type="button" class="btn btn-danger btn-small" onclick="removeDomainInput(this)">
      Remove
    </button>
  `;

  container.appendChild(inputWrapper);
}

// Remove a domain input field
function removeDomainInput(button) {
  const container = document.getElementById("domainsContainer");
  const inputCount = container.querySelectorAll("input").length;

  if (inputCount > 1) {
    button.parentElement.remove();
  } else {
    showError("At least one domain is required");
  }
}

// Get all domain values from inputs
function getAllDomains() {
  const container = document.getElementById("domainsContainer");
  const inputs = container.querySelectorAll("input");
  return Array.from(inputs)
    .map((input) => input.value.trim())
    .filter((value) => value.length > 0);
}

// Collect form data
function getFormData() {
  return {
    title: document.getElementById("title").value.trim(),
    area: document.getElementById("area").value.trim(),
    question: document.getElementById("question").value.trim(),
    expiryDate: document.getElementById("expiryDate").value,
    permittedDomains: getAllDomains(),
    permittedResponses: document
      .getElementById("permittedResponses")
      .value.trim(),
    summaryInstructions: document
      .getElementById("summaryInstructions")
      .value.trim(),
  };
}

// Validate form data
function validateFormData(formData) {
  // Required field validation
  if (!formData.title) return "Title is required";
  if (!formData.area) return "Area is required";
  if (!formData.question) return "Question is required";
  if (!formData.expiryDate) return "Expiry date is required";
  if (!formData.permittedResponses) return "Response guidelines are required";
  if (!formData.summaryInstructions) return "Summary instructions are required";
  if (!formData.permittedDomains || formData.permittedDomains.length === 0) {
    return "At least one domain is required";
  }

  // Length validation
  if (formData.title.length > LIMITS.title) {
    return `Title must be ${LIMITS.title} characters or less`;
  }
  if (formData.area.length > LIMITS.area) {
    return `Area must be ${LIMITS.area} characters or less`;
  }
  if (formData.question.length > LIMITS.question) {
    return `Question must be ${LIMITS.question} characters or less`;
  }
  if (formData.permittedResponses.length > LIMITS.permittedResponses) {
    return `Response guidelines must be ${LIMITS.permittedResponses} characters or less`;
  }
  if (
    formData.summaryInstructions &&
    formData.summaryInstructions.length > LIMITS.summaryInstructions
  ) {
    return `Summary instructions must be ${LIMITS.summaryInstructions} characters or less`;
  }

  // Domain validation
  for (let domain of formData.permittedDomains) {
    if (domain.length > LIMITS.domain) {
      return `Each domain must be ${LIMITS.domain} characters or less`;
    }
  }

  // Date validation
  const expiryDate = new Date(formData.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiryDate <= today) {
    return "Expiry date must be in the future";
  }

  return null; // No validation errors
}

// Prepare survey data for API submission
function prepareSurveyData(formData) {
  return {
    title: formData.title,
    area: formData.area,
    expiryDate: formData.expiryDate,
    guidelines: {
      question: formData.question,
      permittedDomains: formData.permittedDomains,
      permittedResponses: formData.permittedResponses,
      summaryInstructions: formData.summaryInstructions,
    },
  };
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();

  const formData = getFormData();
  const validationError = validateFormData(formData);

  if (validationError) {
    showError(validationError);
    return;
  }

  showLoading("Creating survey...");

  try {
    const surveyData = prepareSurveyData(formData);
    const result = await submitSurvey(surveyData);

    if (result.success) {
      showSuccess("Survey created successfully!");
      // Reset form after successful submission
      setTimeout(() => {
        document.getElementById("createSurveyForm").reset();
        window.location.href = "dashboard.html";
      }, 2000);
    } else {
      showError(result.error);
    }
  } catch (error) {
    console.error("Form submission error:", error);
    showError("An unexpected error occurred. Please try again.");
  } finally {
    hideLoading();
  }
}

// Submit survey to API
async function submitSurvey(surveyData) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "login.html";
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(`${API_BASE_URL}/surveys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(surveyData),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, survey: data.survey };
    } else {
      return {
        success: false,
        error: data.error?.message || "Failed to create survey",
      };
    }
  } catch (error) {
    console.error("API call failed:", error);
    return {
      success: false,
      error: "Network error. Please check your connection.",
    };
  }
}

// Show preview modal
function showPreview() {
  const formData = getFormData();
  const validationError = validateFormData(formData);

  if (validationError) {
    showError(validationError);
    return;
  }

  displayPreview(formData);
}

// Display preview content
function displayPreview(formData) {
  const previewContent = document.getElementById("previewContent");
  const expiryDate = new Date(formData.expiryDate);

  // Build domains HTML separately to avoid template literal nesting issues
  let domainsHtml = "";
  if (formData.permittedDomains && formData.permittedDomains.length > 0) {
    const domainTags = formData.permittedDomains
      .map((domain) => `<span class="domain-tag">${escapeHtml(domain)}</span>`)
      .join("");
    domainsHtml = `
      <div class="permitted-domains">
        <strong>Relevant Domains:</strong>
        <div class="domains">${domainTags}</div>
      </div>`;
  }

  // Build summary instructions HTML separately
  let summaryHtml = "";
  if (formData.summaryInstructions) {
    summaryHtml = `
      <div class="summary-instructions">
        <h4>Summary Instructions:</h4>
        <p>${escapeHtml(formData.summaryInstructions)}</p>
      </div>`;
  }

  previewContent.innerHTML = `
    <div class="survey-preview">
      <div class="survey-header">
        <h2>${escapeHtml(formData.title)}</h2>
        <div class="survey-meta">
          <span class="survey-area"><strong>Area:</strong> ${escapeHtml(
            formData.area
          )}</span>
          <span class="survey-expiry"><strong>Expires:</strong> ${expiryDate.toLocaleDateString()}</span>
        </div>
      </div>
      
      <div class="survey-question">
        <h4>Question:</h4>
        <p>${escapeHtml(formData.question)}</p>
      </div>
      
      <div class="survey-guidelines">
        <h4>Response Guidelines:</h4>
        <p>${escapeHtml(formData.permittedResponses)}</p>
        ${domainsHtml}
      </div>
      
      ${summaryHtml}
      
      <div class="response-form-preview">
        <h4>Response Form:</h4>
        <div class="form-group">
          <label>Your Response:</label>
          <textarea placeholder="Participants will type their response here..." disabled></textarea>
          <button disabled>Submit Response</button>
        </div>
      </div>
    </div>`;

  document.getElementById("previewModal").style.display = "flex";
}

// Close preview modal
function closePreviewModal() {
  document.getElementById("previewModal").style.display = "none";
}

// Show loading state
function showLoading(message = "Loading...") {
  const submitButton = document.getElementById("submitButton");
  submitButton.disabled = true;
  submitButton.textContent = message;
  submitButton.classList.add("loading");
}

// Hide loading state
function hideLoading() {
  const submitButton = document.getElementById("submitButton");
  submitButton.disabled = false;
  submitButton.textContent = "Create Survey";
  submitButton.classList.remove("loading");
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);

  // Scroll to top to show error
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById("success-message");
  successDiv.textContent = message;
  successDiv.style.display = "block";

  // Scroll to top to show success
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
