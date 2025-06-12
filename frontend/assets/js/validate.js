/**
 * Validation Page Functionality
 * Handles AI-powered response validation against survey guidelines
 */

class ValidationManager {
  constructor() {
    this.filterSelect = document.getElementById("filter-select");
    this.refreshBtn = document.getElementById("refresh-btn");
    this.surveyCount = document.getElementById("survey-count");
    this.loadingSurveys = document.getElementById("loading-surveys");
    this.surveysContainer = document.getElementById("surveys-container");
    this.noSurveys = document.getElementById("no-surveys");
    this.noSurveysText = document.getElementById("no-surveys-text");
    this.errorMessage = document.getElementById("error-message");
    this.errorText = document.getElementById("error-text");

    // Validation modal
    this.validationModal = document.getElementById("validation-modal");
    this.validationModalTitle = document.getElementById(
      "validation-modal-title"
    );
    this.validationLoading = document.getElementById("validation-loading");
    this.validationResults = document.getElementById("validation-results");
    this.exportResultsBtn = document.getElementById("export-results-btn");
    this.closeResultsBtn = document.getElementById("close-results-btn");
    this.closeValidationModal = document.getElementById(
      "close-validation-modal"
    );

    // Response modal
    this.responseModal = document.getElementById("response-modal");
    this.responseModalTitle = document.getElementById("response-modal-title");
    this.responseLoading = document.getElementById("response-loading");
    this.responseValidation = document.getElementById("response-validation");
    this.closeResponseBtn = document.getElementById("close-response-btn");
    this.closeResponseModal = document.getElementById("close-response-modal");

    // Confirm modal
    this.confirmModal = document.getElementById("confirm-modal");
    this.confirmTitle = document.getElementById("confirm-title");
    this.confirmMessage = document.getElementById("confirm-message");
    this.confirmYes = document.getElementById("confirm-yes");
    this.confirmNo = document.getElementById("confirm-no");

    this.currentUser = getUserInfo();
    this.surveys = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSurveys();
  }

  setupEventListeners() {
    // Filter change
    this.filterSelect.addEventListener("change", () => {
      this.loadSurveys();
    });

    // Refresh button
    this.refreshBtn.addEventListener("click", () => {
      this.loadSurveys();
    });

    // Modal controls
    this.closeValidationModal.addEventListener("click", () =>
      this.closeValidationResultsModal()
    );
    this.closeResultsBtn.addEventListener("click", () =>
      this.closeValidationResultsModal()
    );
    this.exportResultsBtn.addEventListener("click", () =>
      this.exportValidationResults()
    );

    this.closeResponseModal.addEventListener("click", () =>
      this.closeResponseDetailModal()
    );
    this.closeResponseBtn.addEventListener("click", () =>
      this.closeResponseDetailModal()
    );

    // Confirm modal
    this.confirmNo.addEventListener("click", () => this.closeConfirmModal());

    // Close modals on outside click
    window.addEventListener("click", (e) => {
      if (e.target === this.validationModal) {
        this.closeValidationResultsModal();
      }
      if (e.target === this.responseModal) {
        this.closeResponseDetailModal();
      }
      if (e.target === this.confirmModal) {
        this.closeConfirmModal();
      }
    });

    // Logout functionality
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        removeToken();
        window.location.href = "login.html";
      });
    }
  }
  async loadSurveys() {
    this.setLoadingState(true);
    this.clearMessages();

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/surveys`);

      if (!response.ok) {
        throw new Error(`Failed to load surveys: ${response.status}`);
      }

      const data = await response.json();
      this.surveys = data.surveys || [];

      // Filter surveys based on selection
      const filteredSurveys = this.getFilteredSurveys();
      this.displaySurveys(filteredSurveys);
      this.updateStats(filteredSurveys);
    } catch (error) {
      console.error("Error loading surveys:", error);
      this.showError("Failed to load surveys. Please try again.");
    } finally {
      this.setLoadingState(false);
    }
  }

  getFilteredSurveys() {
    const filterValue = this.filterSelect.value;
    let filteredSurveys = this.surveys;

    switch (filterValue) {
      case "my-surveys":
        filteredSurveys = this.surveys.filter(
          (survey) =>
            survey.creator && survey.creator._id === this.currentUser.userId
        );
        break;
      case "with-responses":
        filteredSurveys = this.surveys.filter(
          (survey) =>
            survey.creator &&
            survey.creator._id === this.currentUser.userId &&
            survey.responses &&
            survey.responses.length > 0
        );
        break;
      case "needs-validation":
        filteredSurveys = this.surveys.filter(
          (survey) =>
            survey.creator &&
            survey.creator._id === this.currentUser.userId &&
            survey.responses &&
            survey.responses.length > 0 &&
            survey.guidelines &&
            survey.guidelines.permittedResponses
        );
        break;
    }

    return filteredSurveys;
  }

  displaySurveys(surveys) {
    this.clearMessages();

    if (surveys.length === 0) {
      this.showNoSurveys();
      return;
    }

    this.surveysContainer.innerHTML = "";

    surveys.forEach((survey) => {
      const surveyCard = this.createSurveyCard(survey);
      this.surveysContainer.appendChild(surveyCard);
    });

    this.surveysContainer.style.display = "block";
    this.noSurveys.style.display = "none";
  }

  createSurveyCard(survey) {
    const card = document.createElement("div");
    card.className = "survey-card validation-card";
    card.setAttribute("data-survey-id", survey._id);

    const expiryDate = new Date(survey.expiryDate);
    const isExpired = expiryDate < new Date();
    const isActive = survey.isActive !== false;
    const hasResponses = survey.responses && survey.responses.length > 0;
    const hasGuidelines =
      survey.guidelines && survey.guidelines.permittedResponses;
    const canValidate = hasResponses && hasGuidelines;

    const statusClass = isExpired ? "expired" : isActive ? "active" : "closed";
    const statusText = isExpired ? "Expired" : isActive ? "Active" : "Closed";
    const statusIcon = isExpired ? "⏰" : isActive ? "✅" : "🔒";

    card.innerHTML = `
            <div class="survey-header">
                <div class="survey-status ${statusClass}">
                    ${statusIcon} ${statusText}
                </div>
                <div class="survey-meta">
                    <span class="response-count">📝 ${
                      survey.responses?.length || 0
                    } responses</span>
                    <span class="validation-status ${
                      canValidate ? "can-validate" : "cannot-validate"
                    }">
                        ${
                          canValidate ? "✅ Can Validate" : "❌ Cannot Validate"
                        }
                    </span>
                </div>
            </div>
            
            <div class="survey-content">
                <h3 class="survey-title">${this.escapeHtml(survey.title)}</h3>
                
                ${
                  survey.area
                    ? `<p class="survey-area">📍 <strong>Area:</strong> ${this.escapeHtml(
                        survey.area
                      )}</p>`
                    : ""
                }
                
                ${
                  survey.description
                    ? `<p class="survey-description">${this.escapeHtml(
                        survey.description
                      )}</p>`
                    : ""
                }
                
                <div class="survey-details">
                    <div class="detail-item">
                        <span class="detail-icon">📅</span>
                        <span class="detail-text">Expires: ${this.formatDate(
                          expiryDate
                        )}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-icon">👤</span>
                        <span class="detail-text">Creator: ${this.escapeHtml(
                          survey.creator?.username || "Unknown"
                        )}</span>
                    </div>
                </div>
                
                ${
                  survey.guidelines?.permittedResponses
                    ? `
                    <div class="guidelines-info">
                        <div class="guidelines-header">
                            <span class="guidelines-icon">📋</span>
                            <span class="guidelines-title">Response Guidelines:</span>
                        </div>
                        <div class="guidelines-text">
                            ${this.escapeHtml(
                              survey.guidelines.permittedResponses
                            )}
                        </div>
                    </div>
                `
                    : `
                    <div class="no-guidelines">
                        <span class="warning-icon">⚠️</span>
                        <span class="warning-text">No validation guidelines set</span>
                    </div>
                `
                }
                
                ${
                  hasResponses
                    ? `
                    <div class="responses-preview">
                        <h4>📝 Recent Responses (${
                          survey.responses.length
                        }):</h4>
                        <div class="responses-list">
                            ${survey.responses
                              .slice(0, 2)
                              .map(
                                (response, index) => `
                                <div class="response-item" onclick="validateManager.validateSingleResponse('${
                                  survey._id
                                }', '${response._id}')">
                                    <div class="response-header">
                                        <span class="response-user">👤 ${this.escapeHtml(
                                          response.user?.username || "Anonymous"
                                        )}</span>
                                        <span class="response-date">${this.formatDate(
                                          new Date(response.createdAt)
                                        )}</span>
                                    </div>
                                    <div class="response-content">
                                        ${this.truncateText(
                                          this.escapeHtml(response.content),
                                          100
                                        )}
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                            ${
                              survey.responses.length > 2
                                ? `
                                <div class="more-responses">
                                    +${
                                      survey.responses.length - 2
                                    } more responses
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
            
            <div class="survey-actions">
                <button class="view-btn" onclick="validateManager.viewSurvey('${
                  survey._id
                }')">
                    👁️ View Survey
                </button>
                
                ${
                  canValidate
                    ? `
                    <button class="validate-all-btn" onclick="validateManager.validateAllResponses('${survey._id}')">
                        ✅ Validate All Responses
                    </button>
                `
                    : ""
                }
                
                ${
                  hasResponses && !hasGuidelines
                    ? `
                    <button class="setup-guidelines-btn" onclick="validateManager.setupGuidelines('${survey._id}')" 
                            title="Set up validation guidelines to enable validation">
                        ⚙️ Setup Guidelines
                    </button>
                `
                    : ""
                }
            </div>
            
            ${
              !hasResponses
                ? `
                <div class="no-responses-notice">
                    <span class="notice-icon">ℹ️</span>
                    <span class="notice-text">No responses yet - validation not available</span>
                </div>
            `
                : ""
            }
        `;

    return card;
  }

  async validateAllResponses(surveyId) {
    const survey = this.surveys.find((s) => s._id === surveyId);
    if (!survey) return;

    this.showConfirm(
      "Validate All Responses",
      `Validate all ${survey.responses.length} responses for "${survey.title}"? This will check each response against the survey guidelines using AI.`,
      async () => {
        await this.performAllValidation(surveyId);
      }
    );
  }
  async performAllValidation(surveyId) {
    const survey = this.surveys.find((s) => s._id === surveyId);
    if (!survey) return;

    try {
      this.showValidationModal(
        `Validating All Responses - ${survey.title}`,
        true
      );

      const response = await authenticatedFetch(
        `${API_BASE_URL}/surveys/${surveyId}/responses/validate`
      );

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const data = await response.json();
      this.displayValidationResults(data.validationResults || [], survey);
    } catch (error) {
      console.error("Error validating responses:", error);
      this.closeValidationResultsModal();
      this.showError(
        error.message || "Failed to validate responses. Please try again."
      );
    }
  }
  async validateSingleResponse(surveyId, responseId) {
    const survey = this.surveys.find((s) => s._id === surveyId);
    const response = survey?.responses?.find((r) => r._id === responseId);

    if (!survey || !response) return;

    try {
      this.showResponseModal(`Validating Response - ${survey.title}`, true);

      const result = await authenticatedFetch(
        `${API_BASE_URL}/surveys/${surveyId}/responses/${responseId}/validate`
      );

      if (!result.ok) {
        throw new Error(`Validation failed: ${result.status}`);
      }

      const data = await result.json();
      this.displaySingleValidationResult(
        data.validationResult,
        response,
        survey
      );
    } catch (error) {
      console.error("Error validating response:", error);
      this.closeResponseDetailModal();
      this.showError(
        error.message || "Failed to validate response. Please try again."
      );
    }
  }

  displayValidationResults(results, survey) {
    this.validationModalTitle.textContent = `Validation Results - ${survey.title}`;

    const totalResponses = survey.responses.length;
    const invalidResponses = results.length;
    const validResponses = totalResponses - invalidResponses;

    this.validationResults.innerHTML = `
            <div class="validation-summary">
                <h4>📊 Validation Summary</h4>
                <div class="summary-stats">
                    <div class="stat-item valid">
                        <span class="stat-icon">✅</span>
                        <span class="stat-number">${validResponses}</span>
                        <span class="stat-label">Valid Responses</span>
                    </div>
                    <div class="stat-item invalid">
                        <span class="stat-icon">❌</span>
                        <span class="stat-number">${invalidResponses}</span>
                        <span class="stat-label">Invalid Responses</span>
                    </div>
                    <div class="stat-item total">
                        <span class="stat-icon">📝</span>
                        <span class="stat-number">${totalResponses}</span>
                        <span class="stat-label">Total Responses</span>
                    </div>
                </div>
            </div>
            
            ${
              invalidResponses > 0
                ? `
                <div class="invalid-responses">
                    <h4>❌ Invalid Responses (${invalidResponses})</h4>
                    <div class="invalid-list">
                        ${results
                          .map(
                            (result) => `
                            <div class="invalid-item">
                                <div class="invalid-header">
                                    <span class="invalid-user">👤 ${this.escapeHtml(
                                      result.username || "Anonymous"
                                    )}</span>
                                    <span class="invalid-id">ID: ${
                                      result.responseId
                                    }</span>
                                </div>
                                <div class="invalid-reason">
                                    <span class="reason-icon">❌</span>
                                    <span class="reason-text">${this.escapeHtml(
                                      result.reason ||
                                        "Violates survey guidelines"
                                    )}</span>
                                </div>
                                <div class="invalid-content">
                                    <span class="content-label">Response:</span>
                                    <div class="content-text">${this.escapeHtml(
                                      this.getResponseContent(
                                        survey,
                                        result.responseId
                                      )
                                    )}</div>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `
                : `
                <div class="all-valid">
                    <div class="all-valid-content">
                        <span class="all-valid-icon">🎉</span>
                        <h4>All Responses Are Valid!</h4>
                        <p>Every response meets the survey guidelines. Great job!</p>
                    </div>
                </div>
            `
            }
            
            <div class="validation-guidelines">
                <h4>📋 Validation Guidelines Used</h4>
                <div class="guidelines-display">
                    ${this.escapeHtml(survey.guidelines.permittedResponses)}
                </div>
            </div>
        `;

    this.validationLoading.style.display = "none";
    this.validationResults.style.display = "block";
    this.exportResultsBtn.style.display = "inline-block";
  }

  displaySingleValidationResult(result, response, survey) {
    this.responseModalTitle.textContent = `Response Validation - ${survey.title}`;

    this.responseValidation.innerHTML = `
            <div class="single-validation">
                <div class="validation-result ${
                  result.isValid ? "valid" : "invalid"
                }">
                    <div class="result-header">
                        <span class="result-icon">${
                          result.isValid ? "✅" : "❌"
                        }</span>
                        <span class="result-status">${
                          result.isValid ? "Valid Response" : "Invalid Response"
                        }</span>
                    </div>
                    
                    <div class="response-info">
                        <div class="info-item">
                            <span class="info-label">👤 User:</span>
                            <span class="info-value">${this.escapeHtml(
                              response.user?.username || "Anonymous"
                            )}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">📅 Submitted:</span>
                            <span class="info-value">${this.formatDate(
                              new Date(response.createdAt)
                            )}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">🆔 Response ID:</span>
                            <span class="info-value">${response._id}</span>
                        </div>
                    </div>
                    
                    <div class="response-content-display">
                        <h5>📝 Response Content</h5>
                        <div class="content-box">
                            ${this.escapeHtml(response.content)}
                        </div>
                    </div>
                    
                    <div class="validation-feedback">
                        <h5>${
                          result.isValid ? "✅" : "❌"
                        } Validation Feedback</h5>
                        <div class="feedback-box ${
                          result.isValid ? "valid" : "invalid"
                        }">
                            ${this.escapeHtml(
                              result.feedback ||
                                (result.isValid
                                  ? "Response meets all guidelines"
                                  : "Response violates survey guidelines")
                            )}
                        </div>
                    </div>
                    
                    <div class="guidelines-reference">
                        <h5>📋 Guidelines Used</h5>
                        <div class="guidelines-box">
                            ${this.escapeHtml(
                              survey.guidelines.permittedResponses
                            )}
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.responseLoading.style.display = "none";
    this.responseValidation.style.display = "block";
  }

  getResponseContent(survey, responseId) {
    const response = survey.responses.find((r) => r._id === responseId);
    return response ? response.content : "Response not found";
  }

  setupGuidelines(surveyId) {
    // Redirect to survey edit page or show setup modal
    window.location.href = `survey.html?id=${surveyId}&edit=guidelines`;
  }

  viewSurvey(surveyId) {
    window.location.href = `survey.html?id=${surveyId}`;
  }

  showValidationModal(title, showLoading = false) {
    this.validationModalTitle.textContent = title;
    this.validationResults.style.display = showLoading ? "none" : "block";
    this.validationLoading.style.display = showLoading ? "block" : "none";
    this.exportResultsBtn.style.display = showLoading ? "none" : "inline-block";
    this.validationModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  closeValidationResultsModal() {
    this.validationModal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  showResponseModal(title, showLoading = false) {
    this.responseModalTitle.textContent = title;
    this.responseValidation.style.display = showLoading ? "none" : "block";
    this.responseLoading.style.display = showLoading ? "block" : "none";
    this.responseModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  closeResponseDetailModal() {
    this.responseModal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  showConfirm(title, message, onConfirm) {
    this.confirmTitle.textContent = title;
    this.confirmMessage.textContent = message;
    this.confirmYes.onclick = () => {
      this.closeConfirmModal();
      onConfirm();
    };
    this.confirmModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  closeConfirmModal() {
    this.confirmModal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  exportValidationResults() {
    // Export validation results as text or JSON
    const resultsText = this.validationResults.textContent;
    const blob = new Blob([resultsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-results-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  updateStats(surveys) {
    const totalSurveys = surveys.length;
    const surveysWithResponses = surveys.filter(
      (s) => s.responses && s.responses.length > 0
    ).length;
    const canValidate = surveys.filter(
      (s) =>
        s.responses &&
        s.responses.length > 0 &&
        s.guidelines &&
        s.guidelines.permittedResponses
    ).length;

    this.surveyCount.innerHTML = `
            📊 ${totalSurveys} surveys • 📝 ${surveysWithResponses} with responses • ✅ ${canValidate} ready for validation
        `;
  }

  showNoSurveys() {
    const filterValue = this.filterSelect.value;
    let message = "No surveys match the current filter.";

    switch (filterValue) {
      case "my-surveys":
        message = "You don't have any surveys yet.";
        break;
      case "with-responses":
        message = "None of your surveys have responses yet.";
        break;
      case "needs-validation":
        message =
          "No surveys are ready for validation. Surveys need responses and validation guidelines.";
        break;
    }

    this.noSurveysText.textContent = message;
    this.surveysContainer.style.display = "none";
    this.noSurveys.style.display = "block";
  }

  showError(message) {
    this.clearMessages();
    this.errorText.textContent = message;
    this.errorMessage.style.display = "block";
  }

  clearMessages() {
    this.errorMessage.style.display = "none";
    this.surveysContainer.style.display = "none";
    this.noSurveys.style.display = "none";
  }

  setLoadingState(loading) {
    if (loading) {
      this.loadingSurveys.style.display = "block";
      this.clearMessages();
    } else {
      this.loadingSurveys.style.display = "none";
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(date) {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  }
}

// Initialize validation manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // Initialize validation manager
  window.validateManager = new ValidationManager();
});
