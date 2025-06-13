/**
 * Survey Detail Page JavaScript
 * Handles viewing survey details and managing responses
 */

// Global variables
let currentSurvey = null;
let userResponse = null;
let isEditing = false;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // Update user info in navbar
  updateUserInfo();

  // Initialize survey detail page
  initializeSurveyDetail();
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
 * Initialize survey detail page
 */
function initializeSurveyDetail() {
  // Get survey ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get("id");

  if (!surveyId) {
    showError("No survey ID provided");
    return;
  }

  // Load survey data
  loadSurvey(surveyId);

  // Set up event listeners
  setupEventListeners();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Character counter for textarea
  const textarea = document.getElementById("response-textarea");
  const charCount = document.getElementById("char-count");

  if (textarea && charCount) {
    textarea.addEventListener("input", function () {
      charCount.textContent = textarea.value.length;

      // Change color if approaching limit
      if (textarea.value.length > 1800) {
        charCount.style.color = "#e53e3e";
      } else if (textarea.value.length > 1500) {
        charCount.style.color = "#f56500";
      } else {
        charCount.style.color = "#666";
      }
    });
  }

  // Response action buttons
  document
    .getElementById("submit-response-btn")
    ?.addEventListener("click", submitResponse);
  document
    .getElementById("update-response-btn")
    ?.addEventListener("click", updateResponse);
  document
    .getElementById("edit-response-btn")
    ?.addEventListener("click", startEditing);
  document
    .getElementById("delete-response-btn")
    ?.addEventListener("click", deleteResponse);
  document
    .getElementById("cancel-edit-btn")
    ?.addEventListener("click", cancelEditing);

  // Logout button
  document
    .getElementById("logoutButton")
    ?.addEventListener("click", function () {
      removeToken();
      window.location.href = "login.html";
    });
}

/**
 * Load survey data from API
 */
async function loadSurvey(surveyId) {
  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${surveyId}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to load survey");
    }

    const data = await response.json();
    currentSurvey = data.survey;

    // Find user's response if exists
    const userId = getUserInfo().userId;
    userResponse = currentSurvey.responses?.find(
      (r) => r.user._id === userId || r.user === userId
    );

    displaySurvey();
  } catch (error) {
    console.error("Error loading survey:", error);
    showError("Failed to load survey: " + error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Display survey data in the UI
 */
function displaySurvey() {
  if (!currentSurvey) return;

  // Show survey container
  document.getElementById("survey-container").style.display = "block";

  // Basic survey info
  document.getElementById("survey-title").textContent = currentSurvey.title;
  document.getElementById("survey-area").textContent = currentSurvey.area || "";
  document.getElementById("survey-question").textContent =
    currentSurvey.guidelines?.question || "";

  // Expiry date and status
  const expiryDate = new Date(currentSurvey.expiryDate);
  const isExpired = expiryDate < new Date() || !currentSurvey.isActive;

  document.getElementById(
    "survey-expiry"
  ).textContent = `Expires: ${expiryDate.toLocaleDateString()}`;

  const statusElement = document.getElementById("survey-status");
  if (isExpired) {
    statusElement.textContent = "Closed";
    statusElement.className = "survey-status closed";
  } else {
    statusElement.textContent = "Open";
    statusElement.className = "survey-status open";
  }

  // Permitted domains
  if (currentSurvey.guidelines?.permittedDomains?.length > 0) {
    const domainsContainer = document.getElementById("permitted-domains");
    domainsContainer.innerHTML = currentSurvey.guidelines.permittedDomains
      .map((domain) => `<span class="domain-tag">${domain}</span>`)
      .join("");
    document.getElementById("domains-section").style.display = "block";
  } else {
    document.getElementById("domains-section").style.display = "none";
  }

  // Response guidelines
  if (currentSurvey.guidelines?.permittedResponses) {
    document.getElementById("permitted-responses").textContent =
      currentSurvey.guidelines.permittedResponses;
    document.getElementById("guidelines-section").style.display = "block";
  } else {
    document.getElementById("guidelines-section").style.display = "none";
  }

  // Handle response section
  displayResponseSection(isExpired);
}

/**
 * Display the response section based on survey state and user response
 */
function displayResponseSection(isExpired) {
  const existingResponseDiv = document.getElementById("existing-response");
  const responseFormDiv = document.getElementById("response-form");
  const surveyClosedDiv = document.getElementById("survey-closed-message");

  // Hide all sections initially
  existingResponseDiv.style.display = "none";
  responseFormDiv.style.display = "none";
  surveyClosedDiv.style.display = "none";

  if (isExpired) {
    // Survey is closed
    if (userResponse) {
      // Show existing response but no edit options
      document.getElementById("response-content").textContent =
        userResponse.content;
      document.getElementById("edit-response-btn").style.display = "none";
      document.getElementById("delete-response-btn").style.display = "none";
      existingResponseDiv.style.display = "block";
    } else {
      // Show closed message
      surveyClosedDiv.style.display = "block";
    }
  } else {
    // Survey is open
    if (userResponse) {
      // Show existing response with edit options
      document.getElementById("response-content").textContent =
        userResponse.content;
      document.getElementById("edit-response-btn").style.display =
        "inline-block";
      document.getElementById("delete-response-btn").style.display =
        "inline-block";
      existingResponseDiv.style.display = "block";
    } else {
      // Show response form for new response
      document.getElementById("submit-response-btn").style.display =
        "inline-block";
      document.getElementById("update-response-btn").style.display = "none";
      document.getElementById("cancel-edit-btn").style.display = "none";
      responseFormDiv.style.display = "block";
    }
  }
}

/**
 * Start editing an existing response
 */
function startEditing() {
  if (!userResponse) return;

  isEditing = true;

  // Hide existing response display
  document.getElementById("existing-response").style.display = "none";

  // Show form with existing content
  const textarea = document.getElementById("response-textarea");
  textarea.value = userResponse.content;

  // Update character counter
  document.getElementById("char-count").textContent = textarea.value.length;

  // Show appropriate buttons
  document.getElementById("submit-response-btn").style.display = "none";
  document.getElementById("update-response-btn").style.display = "inline-block";
  document.getElementById("cancel-edit-btn").style.display = "inline-block";

  // Show form
  document.getElementById("response-form").style.display = "block";

  // Focus on textarea
  textarea.focus();
}

/**
 * Cancel editing
 */
function cancelEditing() {
  isEditing = false;

  // Clear form
  document.getElementById("response-textarea").value = "";
  document.getElementById("char-count").textContent = "0";

  // Hide form
  document.getElementById("response-form").style.display = "none";

  // Show existing response
  document.getElementById("existing-response").style.display = "block";
}

/**
 * Submit new response
 */
async function submitResponse() {
  const content = document.getElementById("response-textarea").value.trim();

  if (!content) {
    showError("Please enter a response");
    return;
  }

  if (content.length > 2000) {
    showError("Response is too long (maximum 2000 characters)");
    return;
  }

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${currentSurvey._id}/responses`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to submit response");
    }

    const responseData = await response.json();
    userResponse = responseData;

    showSuccess("Response submitted successfully!");

    // Clear form and update display
    document.getElementById("response-textarea").value = "";
    document.getElementById("char-count").textContent = "0";
    displayResponseSection(false);
  } catch (error) {
    console.error("Error submitting response:", error);
    showError("Failed to submit response: " + error.message);
  }
}

/**
 * Update existing response
 */
async function updateResponse() {
  const content = document.getElementById("response-textarea").value.trim();

  if (!content) {
    showError("Please enter a response");
    return;
  }

  if (content.length > 2000) {
    showError("Response is too long (maximum 2000 characters)");
    return;
  }

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${currentSurvey._id}/responses/${userResponse._id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to update response");
    }

    const responseData = await response.json();
    userResponse = responseData;

    showSuccess("Response updated successfully!");

    // Update display
    isEditing = false;
    document.getElementById("response-content").textContent = content;
    cancelEditing();
  } catch (error) {
    console.error("Error updating response:", error);
    showError("Failed to update response: " + error.message);
  }
}

/**
 * Delete user's response
 */
async function deleteResponse() {
  if (!userResponse) return;

  if (
    !confirm(
      "Are you sure you want to delete your response? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${currentSurvey._id}/responses/${userResponse._id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to delete response");
    }

    userResponse = null;
    showSuccess("Response deleted successfully!");

    // Update display to show response form
    displayResponseSection(false);
  } catch (error) {
    console.error("Error deleting response:", error);
    showError("Failed to delete response: " + error.message);
  }
}

/**
 * Show loading state
 */
function showLoading(show) {
  const loadingElement = document.getElementById("loading");
  if (loadingElement) {
    loadingElement.style.display = show ? "block" : "none";
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
