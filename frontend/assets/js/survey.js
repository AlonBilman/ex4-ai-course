/**
 * Survey functionality for the Survey Web Client
 */

// Initialize survey functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeSurvey();
});

/**
 * Initialize survey functionality based on current page
 */
function initializeSurvey() {
  const currentPage = window.location.pathname.split("/").pop();

  switch (currentPage) {
    case "dashboard.html":
      initializeDashboard();
      break;
    case "survey.html":
      initializeSurveyDetail();
      break;
  }
}

/**
 * Initialize dashboard with survey list
 */
function initializeDashboard() {
  // Update user info in navbar
  updateUserInfo();
  // Initialize filters from localStorage
  initializeFilters();
  // Load surveys when dashboard loads
  loadSurveys();
  // Initialize search input
  initializeSearchInput();
  // Initialize keyboard shortcuts
  initializeDashboardShortcuts();
  // Check for updates
  checkForUpdates();
}

/**
 * Update user info in the navbar
 */
function updateUserInfo() {
  const user = getUserInfo();
  const usernameElement = document.getElementById("username");
  const userInitialElement = document.getElementById("userInitial");

  if (user && usernameElement) {
    usernameElement.textContent = user.username || "User";

    // Set user initial
    if (userInitialElement) {
      const initial = (user.username || "U").charAt(0).toUpperCase();
      userInitialElement.textContent = initial;
    }
  }
}

/**
 * Initialize survey detail page
 */
function initializeSurveyDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get("id");

  if (!surveyId) {
    showError("Survey ID is required");
    return;
  }

  loadSurveyDetail(surveyId);
}

/**
 * Load and display all surveys
 */
async function loadSurveys() {
  const loadingElement = document.getElementById("loading");
  const surveysContainer = document.getElementById("surveysContainer");
  const noSurveysElement = document.getElementById("no-surveys");

  try {
    // Show loading state
    if (loadingElement) loadingElement.style.display = "block";
    if (surveysContainer) surveysContainer.innerHTML = "";
    if (noSurveysElement) noSurveysElement.style.display = "none";

    const response = await authenticatedFetch(`${API_BASE_URL}/surveys`);

    if (!response.ok) {
      throw new Error(`Failed to load surveys: ${response.status}`);
    }

    const data = await response.json();
    const surveys = data.surveys || [];

    // Update stats
    updateDashboardStats(surveys);

    // Display surveys
    if (surveys.length === 0) {
      if (noSurveysElement) noSurveysElement.style.display = "block";
    } else {
      displaySurveys(surveys);
    }
  } catch (error) {
    console.error("Error loading surveys:", error);
    showError(handleNetworkError(error));
  } finally {
    if (loadingElement) loadingElement.style.display = "none";
  }
}

/**
 * Display surveys in the dashboard
 */
function displaySurveys(surveys) {
  const surveysContainer = document.getElementById("surveysContainer");
  if (!surveysContainer) return;

  surveysContainer.innerHTML = surveys
    .map((survey) => createSurveyCard(survey))
    .join("");
}

/**
 * Create HTML for a survey card with enhanced TailwindCSS styling
 */
function createSurveyCard(survey) {
  const isExpired = new Date(survey.expiryDate) < new Date();
  const isActive = survey.isActive && !isExpired;
  const responseCount = survey.responses ? survey.responses.length : 0;

  return `
        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <!-- Header -->
            <div class="flex flex-col space-y-3 mb-4">
                <h4 class="text-xl font-bold text-gray-900 line-clamp-2">${escapeHtml(
                  survey.title
                )}</h4>
                ${
                  survey.area
                    ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700 w-fit">
                         ${escapeHtml(survey.area)}
                       </span>`
                    : ""
                }
            </div>
            
            <!-- Meta Info -->
            <div class="flex justify-between items-center mb-4 text-sm">
                <span class="text-gray-600 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    By ${escapeHtml(survey.creator?.username || "Unknown")}
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">
                    ${isActive ? "Active" : "Expired"}
                </span>
            </div>
            
            ${
              survey.guidelines?.question
                ? `
                <div class="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                    <p class="text-gray-700 text-sm italic line-clamp-2">
                        "${escapeHtml(survey.guidelines.question)}"
                    </p>
                </div>
            `
                : ""
            }
            
            <!-- Stats -->
            <div class="flex justify-between items-center mb-6 text-sm text-gray-600">
                <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z"/>
                    </svg>
                    ${responseCount} responses
                </span>
                <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${formatDate(survey.expiryDate)}
                </span>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-2">
                <a href="survey.html?id=${
                  survey._id
                }" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200">                    View Survey
                </a>
                ${
                  isActive
                    ? `
                    <button onclick="quickRespond('${survey._id}')" 
                            class="flex-1 inline-flex items-center justify-center px-4 py-2 border-2 border-primary-500 text-sm font-medium rounded-lg text-primary-500 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Quick Respond
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `;
}

/**
 * Update dashboard statistics with enhanced data
 */
function updateDashboardStats(surveys) {
  const totalSurveys = surveys.length;
  const activeSurveys = surveys.filter(
    (s) => s.isActive && new Date(s.expiryDate) > new Date()
  ).length;

  // Calculate user responses count from surveys where user has responded
  const user = getUserInfo();
  let userResponses = 0;
  if (user) {
    surveys.forEach((survey) => {
      if (
        survey.responses &&
        survey.responses.some(
          (r) => r.user._id === user.userId || r.user === user.userId
        )
      ) {
        userResponses++;
      }
    });
  }

  // Calculate average response rate
  const totalPossibleResponses = totalSurveys;
  const engagementRate =
    totalPossibleResponses > 0
      ? Math.round((userResponses / totalPossibleResponses) * 100)
      : 0;

  // Calculate average responses per survey
  const totalResponses = surveys.reduce(
    (sum, survey) => sum + (survey.responses ? survey.responses.length : 0),
    0
  );
  const avgResponsesPerSurvey =
    totalSurveys > 0
      ? Math.round((totalResponses / totalSurveys) * 10) / 10
      : 0;

  // Update basic stats
  const surveysCountElement = document.getElementById("surveysCount");
  const responsesCountElement = document.getElementById("responsesCount");
  const activeSurveysCountElement =
    document.getElementById("activeSurveysCount");
  const avgResponseTimeElement = document.getElementById("avgResponseTime");

  if (surveysCountElement) surveysCountElement.textContent = totalSurveys;
  if (responsesCountElement) responsesCountElement.textContent = userResponses;
  if (activeSurveysCountElement)
    activeSurveysCountElement.textContent = activeSurveys;
  if (avgResponseTimeElement)
    avgResponseTimeElement.textContent = avgResponsesPerSurvey.toFixed(1);

  // Update engagement rate
  const engagementRateElement = document.getElementById("engagementRate");
  const engagementBarElement = document.getElementById("engagementBar");

  if (engagementRateElement)
    engagementRateElement.textContent = `${engagementRate}%`;
  if (engagementBarElement) {
    setTimeout(() => {
      engagementBarElement.style.width = `${engagementRate}%`;
    }, 500); // Animate after a delay
  }

  // Update growth indicators (simulate growth data)
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const surveysThisMonth = surveys.filter(
    (s) => new Date(s.createdAt) >= thisMonth
  ).length;
  const surveysGrowth =
    totalSurveys > 0 ? Math.round((surveysThisMonth / totalSurveys) * 100) : 0;

  const surveysGrowthElement = document.getElementById("surveysGrowth");
  const responsesGrowthElement = document.getElementById("responsesGrowth");
  const activeGrowthElement = document.getElementById("activeGrowth");

  if (surveysGrowthElement)
    surveysGrowthElement.textContent = `+${surveysGrowth}% this month`;
  if (responsesGrowthElement)
    responsesGrowthElement.textContent = `+${Math.min(
      userResponses * 20,
      100
    )}% this week`;
  if (activeGrowthElement)
    activeGrowthElement.textContent = `${activeSurveys} currently live`;

  // Update recent activity
  updateRecentActivity(surveys);
}

/**
 * Load and display survey detail
 */
async function loadSurveyDetail(surveyId) {
  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${surveyId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Survey not found");
      }
      throw new Error(`Failed to load survey: ${response.status}`);
    }

    const data = await response.json();
    const survey = data.survey;

    displaySurveyDetail(survey);
  } catch (error) {
    console.error("Error loading survey detail:", error);
    showError(handleNetworkError(error));
  } finally {
    showLoading(false);
  }
}

/**
 * Display survey detail page
 */
function displaySurveyDetail(survey) {
  const container = document.querySelector(".survey-detail");
  if (!container) return;

  const currentUser = getUserInfo();
  const userResponse = getUserResponseFromSurvey(survey, currentUser?.userId);
  const isExpired = new Date(survey.expiryDate) < new Date();
  const canRespond = survey.isActive && !isExpired;
  const isCreator =
    currentUser &&
    survey.creator &&
    (survey.creator._id === currentUser.userId ||
      survey.creator === currentUser.userId);

  container.innerHTML = `
        <div class="survey-detail-card">
            <div class="survey-detail-header">
                <h1 class="survey-detail-title">${escapeHtml(survey.title)}</h1>
                ${
                  survey.area
                    ? `<p class="survey-detail-area">${escapeHtml(
                        survey.area
                      )}</p>`
                    : ""
                }
                
                ${
                  isCreator
                    ? `
                    <div class="creator-actions">
                        ${
                          survey.isActive && !isExpired
                            ? `
                            <button onclick="closeSurvey('${survey._id}')" class="btn btn-danger btn-small">
                                🔒 Close Survey
                            </button>
                        `
                            : ""
                        }
                        <a href="summary.html" class="btn btn-secondary btn-small">📋 Manage Summaries</a>
                        <a href="validate.html" class="btn btn-secondary btn-small">✅ Validate Responses</a>
                    </div>
                `
                    : ""
                }
            </div>
            
            ${
              survey.guidelines
                ? createGuidelinesSection(survey.guidelines)
                : ""
            }
            
            <div class="survey-meta">
                <p><strong>Created by:</strong> ${escapeHtml(
                  survey.creator?.username || "Unknown"
                )}</p>
                <p><strong>Expires:</strong> ${formatDate(
                  survey.expiryDate
                )}</p>
                <p><strong>Status:</strong> 
                    <span class="survey-status ${
                      canRespond
                        ? "status-active"
                        : survey.isActive === false
                        ? "status-closed"
                        : "status-expired"
                    }">
                        ${
                          canRespond
                            ? "Active"
                            : survey.isActive === false
                            ? "Closed by Creator"
                            : "Expired"
                        }
                    </span>
                </p>
                <p><strong>Responses:</strong> ${
                  survey.responses ? survey.responses.length : 0
                }</p>
            </div>
        </div>
        
        ${createResponseSection(survey, userResponse, canRespond)}
    `;

  // Initialize response form if present
  initializeResponseForm(survey._id, userResponse);
}

/**
 * Create guidelines section HTML
 */
function createGuidelinesSection(guidelines) {
  return `
        <div class="survey-guidelines">
            ${
              guidelines.question
                ? `
                <h4>Survey Question</h4>
                <p><strong>${escapeHtml(guidelines.question)}</strong></p>
            `
                : ""
            }
            
            ${
              guidelines.permittedDomains &&
              guidelines.permittedDomains.length > 0
                ? `
                <h4>Response Domains</h4>
                <div class="domains">
                    ${guidelines.permittedDomains
                      .map(
                        (domain) =>
                          `<span class="domain-tag">${escapeHtml(
                            domain
                          )}</span>`
                      )
                      .join("")}
                </div>
            `
                : ""
            }
            
            ${
              guidelines.permittedResponses
                ? `
                <h4>Response Guidelines</h4>
                <p>${escapeHtml(guidelines.permittedResponses)}</p>
            `
                : ""
            }
        </div>
    `;
}

/**
 * Create response section HTML
 */
function createResponseSection(survey, userResponse, canRespond) {
  if (!canRespond && !userResponse) {
    return `
            <div class="response-section">
                <div class="response-form">
                    <h3>Survey Responses</h3>
                    <p>This survey has expired and is no longer accepting responses.</p>
                </div>
            </div>
        `;
  }

  return `
        <div class="response-section">
            <div class="response-form" id="responseForm">
                <h3>${
                  userResponse ? "Your Response" : "Submit Your Response"
                }</h3>
                
                ${
                  userResponse
                    ? createExistingResponseSection(userResponse, canRespond)
                    : ""
                }
                
                ${canRespond ? createResponseFormSection(userResponse) : ""}
            </div>
        </div>
    `;
}

/**
 * Create existing response section
 */
function createExistingResponseSection(userResponse, canRespond) {
  return `
        <div class="existing-response" id="existingResponse">
            <div class="existing-response-header">
                <span>Submitted on ${formatDate(userResponse.createdAt)}</span>
                ${
                  canRespond
                    ? `
                    <div>
                        <button onclick="editResponse()" class="btn btn-secondary btn-small">Edit</button>
                        <button onclick="deleteResponse()" class="btn btn-danger btn-small">Delete</button>
                    </div>
                `
                    : ""
                }
            </div>
            <div class="existing-response-content" id="responseContent">
                ${escapeHtml(userResponse.content)}
            </div>
        </div>
    `;
}

/**
 * Create response form section
 */
function createResponseFormSection(userResponse) {
  return `
        <div class="response-form-container" id="responseFormContainer" ${
          userResponse ? 'style="display: none;"' : ""
        }>
            <textarea 
                id="responseTextarea" 
                class="response-textarea" 
                placeholder="Enter your response here..."
                maxlength="2000"
            >${userResponse ? userResponse.content : ""}</textarea>
            
            <div class="response-actions">
                ${
                  userResponse
                    ? `
                    <button onclick="cancelEdit()" class="btn btn-secondary">Cancel</button>
                    <button onclick="updateResponse()" class="btn btn-primary">Update Response</button>
                `
                    : `
                    <button onclick="submitResponse()" class="btn btn-primary">Submit Response</button>
                `
                }
            </div>
        </div>
    `;
}

/**
 * Initialize response form functionality
 */
function initializeResponseForm(surveyId, userResponse) {
  window.currentSurveyId = surveyId;
  window.currentUserResponse = userResponse;
  window.isEditMode = false;
}

/**
 * Submit a new response
 */
async function submitResponse() {
  const textarea = document.getElementById("responseTextarea");
  const content = textarea?.value?.trim();

  if (!content) {
    showError("Please enter your response before submitting");
    return;
  }

  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${window.currentSurveyId}/responses`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to submit response");
    }

    showSuccess("Response submitted successfully!");

    // Reload the page to show the submitted response
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error submitting response:", error);
    showError(error.message || handleNetworkError(error));
  } finally {
    showLoading(false);
  }
}

/**
 * Update an existing response
 */
async function updateResponse() {
  const textarea = document.getElementById("responseTextarea");
  const content = textarea?.value?.trim();

  if (!content) {
    showError("Please enter your response before updating");
    return;
  }

  if (!window.currentUserResponse) {
    showError("No existing response to update");
    return;
  }

  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${window.currentSurveyId}/responses/${window.currentUserResponse._id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to update response");
    }

    showSuccess("Response updated successfully!");

    // Reload the page to show the updated response
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error updating response:", error);
    showError(error.message || handleNetworkError(error));
  } finally {
    showLoading(false);
  }
}

/**
 * Delete the user's response
 */
async function deleteResponse() {
  if (
    !confirm(
      "Are you sure you want to delete your response? This action cannot be undone."
    )
  ) {
    return;
  }

  if (!window.currentUserResponse) {
    showError("No response to delete");
    return;
  }

  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${window.currentSurveyId}/responses/${window.currentUserResponse._id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to delete response");
    }

    showSuccess("Response deleted successfully!");

    // Reload the page to show the updated state
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error deleting response:", error);
    showError(error.message || handleNetworkError(error));
  } finally {
    showLoading(false);
  }
}

/**
 * Enter edit mode for existing response
 */
function editResponse() {
  window.isEditMode = true;

  const existingResponse = document.getElementById("existingResponse");
  const responseFormContainer = document.getElementById(
    "responseFormContainer"
  );
  const textarea = document.getElementById("responseTextarea");

  if (existingResponse) existingResponse.classList.add("edit-mode");
  if (responseFormContainer) responseFormContainer.style.display = "block";
  if (textarea && window.currentUserResponse) {
    textarea.value = window.currentUserResponse.content;
    textarea.focus();
  }
}

/**
 * Cancel edit mode
 */
function cancelEdit() {
  window.isEditMode = false;

  const existingResponse = document.getElementById("existingResponse");
  const responseFormContainer = document.getElementById(
    "responseFormContainer"
  );

  if (existingResponse) existingResponse.classList.remove("edit-mode");
  if (responseFormContainer) responseFormContainer.style.display = "none";
}

/**
 * Quick respond to a survey from dashboard
 */
function quickRespond(surveyId) {
  window.location.href = `survey.html?id=${surveyId}`;
}

/**
 * Refresh surveys list
 */
function refreshSurveys() {
  loadSurveys();
}

/**
 * Show search box
 */
function showSearchBox() {
  const searchContainer = document.getElementById("searchContainer");
  const searchInput = document.getElementById("searchInput");

  if (searchContainer) {
    searchContainer.classList.remove("hidden");
    searchContainer.style.display = "flex";
    if (searchInput) searchInput.focus();
  }
}

/**
 * Hide search box
 */
function hideSearchBox() {
  const searchContainer = document.getElementById("searchContainer");
  const searchInput = document.getElementById("searchInput");

  if (searchContainer) {
    searchContainer.classList.add("hidden");
    searchContainer.style.display = "none";
  }
  if (searchInput) searchInput.value = "";

  // Reload all surveys
  loadSurveys();
}

/**
 * Search surveys using natural language
 */
async function searchSurveys() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput?.value?.trim();

  if (!query) {
    showError("Please enter a search query");
    return;
  }

  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/search`,
      {
        method: "POST",
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    const matches = data.matches || [];

    if (matches.length === 0) {
      showError("No surveys found matching your search");
      return;
    }

    // Extract surveys from matches and display them
    const surveys = matches.map((match) => match.survey).filter(Boolean);
    displaySurveys(surveys);

    showSuccess(`Found ${matches.length} matching survey(s)`);
  } catch (error) {
    console.error("Error searching surveys:", error);
    showError(handleNetworkError(error));
  } finally {
    showLoading(false);
  }
}

/**
 * Initialize search input event listeners
 */
function initializeSearchInput() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        searchSurveys();
      }
    });
  }
}

/**
 * Get user's response from survey data
 */
function getUserResponseFromSurvey(survey, userId) {
  if (!survey.responses || !userId) return null;

  return survey.responses.find(
    (response) => response.user === userId || response.user?._id === userId
  );
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
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

/**
 * Show loading state
 */
function showLoading(show) {
  const loadingElement = document.getElementById("loading");
  if (loadingElement) {
    if (show) {
      loadingElement.classList.remove("hidden");
      loadingElement.style.display = "block";
    } else {
      loadingElement.classList.add("hidden");
      loadingElement.style.display = "none";
    }
  }
}

/**
 * Close a survey (creator only)
 */
async function closeSurvey(surveyId) {
  if (
    !confirm(
      "Are you sure you want to close this survey? This action cannot be undone and will stop accepting new responses."
    )
  ) {
    return;
  }

  try {
    showLoading(true);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/surveys/${surveyId}/close`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to close survey");
    }

    showSuccess("Survey closed successfully!");

    // Reload the page to show the updated status
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error closing survey:", error);
    showError(error.message || handleNetworkError(error));
  } finally {
    showLoading(false);
  }
}

/**
 * Update recent activity section
 */
function updateRecentActivity(surveys) {
  const recentActivityElement = document.getElementById("recentActivity");
  if (!recentActivityElement) return;

  const user = getUserInfo();
  const activities = [];

  // Add recent survey creation activity
  const recentSurveys = surveys
    .filter(
      (s) =>
        s.creator &&
        (s.creator._id === user?.userId || s.creator === user?.userId)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2);

  recentSurveys.forEach((survey) => {
    activities.push({
      type: "created",
      text: `Created survey "${survey.title}"`,
      subtext: formatTimeAgo(survey.createdAt),
      color: "bg-blue-400",
    });
  });

  // Add recent response activity
  const surveysWithUserResponses = surveys
    .filter((survey) => {
      return (
        survey.responses &&
        survey.responses.some(
          (r) => r.user._id === user?.userId || r.user === user?.userId
        )
      );
    })
    .slice(0, 2);

  surveysWithUserResponses.forEach((survey) => {
    const userResponse = survey.responses.find(
      (r) => r.user._id === user?.userId || r.user === user?.userId
    );
    if (userResponse) {
      activities.push({
        type: "responded",
        text: `Responded to "${survey.title}"`,
        subtext: formatTimeAgo(userResponse.createdAt),
        color: "bg-green-400",
      });
    }
  });

  // Add active surveys activity
  const activeSurveys = surveys.filter(
    (s) => s.isActive && new Date(s.expiryDate) > new Date()
  );
  if (activeSurveys.length > 0) {
    activities.push({
      type: "active",
      text: `${activeSurveys.length} surveys are currently active`,
      subtext: "Participate and share your insights",
      color: "bg-purple-400",
    });
  }

  // Sort activities by relevance and limit to 4
  const sortedActivities = activities.slice(0, 4);

  // If no activities, show welcome message
  if (sortedActivities.length === 0) {
    sortedActivities.push({
      type: "welcome",
      text: "Welcome to your dashboard!",
      subtext: "Start by creating your first survey",
      color: "bg-gray-400",
    });
  }

  // Generate HTML for activities
  const activityHTML = sortedActivities
    .map(
      (activity) => `
    <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
      <div class="w-2 h-2 ${activity.color} rounded-full mt-2 flex-shrink-0"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-800 font-medium truncate">${activity.text}</p>
        <p class="text-xs text-gray-500">${activity.subtext}</p>
      </div>
    </div>
  `
    )
    .join("");

  recentActivityElement.innerHTML = activityHTML;
}

/**
 * Format time ago helper function
 */
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Apply filters to surveys
 */
function applyFilters() {
  const statusFilter = document.getElementById("statusFilter")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "created_at";
  const sortOrder = document.getElementById("sortOrder")?.value || "desc";

  // Store filter preferences
  const filters = { statusFilter, sortBy, sortOrder };
  localStorage.setItem("surveyFilters", JSON.stringify(filters));

  // Re-load surveys with filters
  loadSurveysWithFilters(filters);
}

/**
 * Clear all filters
 */
function clearFilters() {
  document.getElementById("statusFilter").value = "";
  document.getElementById("sortBy").value = "created_at";
  document.getElementById("sortOrder").value = "desc";

  localStorage.removeItem("surveyFilters");
  loadSurveys(); // Reload without filters
}

/**
 * Load surveys with applied filters
 */
async function loadSurveysWithFilters(filters) {
  const loadingElement = document.getElementById("loading");
  const surveysContainer = document.getElementById("surveysContainer");
  const noSurveysElement = document.getElementById("no-surveys");

  try {
    // Show loading state
    if (loadingElement) loadingElement.classList.remove("hidden");
    if (surveysContainer) surveysContainer.innerHTML = "";
    if (noSurveysElement) noSurveysElement.style.display = "none";

    const response = await authenticatedFetch(`${API_BASE_URL}/surveys`);

    if (!response.ok) {
      throw new Error(`Failed to load surveys: ${response.status}`);
    }

    const data = await response.json();
    let surveys = data.surveys || [];

    // Apply status filter
    if (filters.statusFilter === "active") {
      surveys = surveys.filter(
        (s) => s.isActive && new Date(s.expiryDate) > new Date()
      );
    } else if (filters.statusFilter === "expired") {
      surveys = surveys.filter(
        (s) => !s.isActive || new Date(s.expiryDate) <= new Date()
      );
    }

    // Apply sorting
    surveys.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "responses":
          aValue = a.responses ? a.responses.length : 0;
          bValue = b.responses ? b.responses.length : 0;
          break;
        default: // created_at
          aValue = new Date(a.createdAt || a.created_at);
          bValue = new Date(b.createdAt || b.created_at);
      }

      if (filters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Update stats
    updateDashboardStats(surveys);

    // Display surveys
    if (surveys.length === 0) {
      if (noSurveysElement) noSurveysElement.style.display = "block";
    } else {
      surveys.forEach((survey) => {
        if (surveysContainer) {
          surveysContainer.appendChild(createSurveyCard(survey));
        }
      });
    }
  } catch (error) {
    console.error("Error loading surveys:", error);
    showError("Failed to load surveys: " + error.message);
  } finally {
    // Hide loading state
    if (loadingElement) loadingElement.classList.add("hidden");
  }
}

/**
 * Initialize filters from localStorage
 */
function initializeFilters() {
  const savedFilters = localStorage.getItem("surveyFilters");
  if (savedFilters) {
    try {
      const filters = JSON.parse(savedFilters);
      document.getElementById("statusFilter").value =
        filters.statusFilter || "";
      document.getElementById("sortBy").value = filters.sortBy || "created_at";
      document.getElementById("sortOrder").value = filters.sortOrder || "desc";
    } catch (e) {
      console.error("Error parsing saved filters:", e);
    }
  }
}

/**
 * Export survey data (for future implementation)
 */
function exportSurveyData(format = "json") {
  // This is a placeholder for future export functionality
  showSuccess(`Export functionality coming soon! (${format} format)`);
}

/**
 * Create survey template (quick start)
 */
function createSurveyTemplate(type) {
  const templates = {
    feedback: {
      title: "Customer Feedback Survey",
      area: "Customer Experience",
      guidelines: {
        question: "How was your experience with our service?",
        permittedResponses: "Any feedback about our service is welcome",
        summaryInstructions: "Summarize the overall customer satisfaction",
      },
    },
    research: {
      title: "Research Survey",
      area: "Academic Research",
      guidelines: {
        question: "What are your thoughts on this topic?",
        permittedResponses: "Academic and research-focused responses",
        summaryInstructions: "Provide academic insights and patterns",
      },
    },
    opinion: {
      title: "Opinion Poll",
      area: "Public Opinion",
      guidelines: {
        question: "What is your opinion on this matter?",
        permittedResponses: "Any respectful opinions are welcome",
        summaryInstructions: "Summarize public opinion trends",
      },
    },
  };

  const template = templates[type];
  if (template) {
    // Store template in localStorage for create-survey page
    localStorage.setItem("surveyTemplate", JSON.stringify(template));
    window.location.href = "create-survey.html";
  } else {
    showError("Template not found");
  }
}

/**
 * Enhanced dashboard shortcuts
 */
function initializeDashboardShortcuts() {
  // Add keyboard shortcuts for dashboard navigation
  document.addEventListener("keydown", function (event) {
    // Only activate shortcuts when not typing in input fields
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    switch (event.key) {
      case "c":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          window.location.href = "create-survey.html";
        }
        break;
      case "r":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          refreshSurveys();
        }
        break;
      case "s":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          showSearchBox();
        }
        break;
    }
  });
}

/**
 * Check for updates and show notifications
 */
function checkForUpdates() {
  // Simulate checking for new surveys or responses
  const lastCheck = localStorage.getItem("lastUpdateCheck");
  const now = new Date().getTime();

  if (!lastCheck || now - parseInt(lastCheck) > 300000) {
    // 5 minutes
    localStorage.setItem("lastUpdateCheck", now.toString());

    // In a real app, this would call an API to check for updates
    setTimeout(() => {
      const hasUpdates = Math.random() > 0.7; // 30% chance of updates
      if (hasUpdates) {
        showNotification(
          "New activity detected! Click to refresh.",
          "info",
          () => {
            refreshSurveys();
          }
        );
      }
    }, 2000);
  }
}

/**
 * Show notification with action
 */
function showNotification(message, type = "info", action = null) {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full ${
    type === "info"
      ? "bg-blue-500 text-white"
      : type === "success"
      ? "bg-green-500 text-white"
      : type === "warning"
      ? "bg-yellow-500 text-black"
      : "bg-red-500 text-white"
  }`;

  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="flex-1">${message}</span>
      ${
        action
          ? '<button class="ml-2 underline hover:no-underline">Action</button>'
          : ""
      }
      <button class="ml-2 text-xl leading-none">&times;</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Add click handlers
  const closeBtn = notification.querySelector("button:last-child");
  closeBtn.addEventListener("click", () => {
    notification.style.transform = "translateX(full)";
    setTimeout(() => notification.remove(), 300);
  });

  if (action) {
    const actionBtn = notification.querySelector("button:first-child");
    actionBtn?.addEventListener("click", () => {
      action();
      closeBtn.click();
    });
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      closeBtn.click();
    }
  }, 5000);
}
