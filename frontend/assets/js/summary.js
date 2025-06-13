/**
 * Summary Page Functionality
 * Handles AI-generated survey summaries and visibility management
 */

class SummaryManager {
  constructor() {
    this.filterSelect = document.getElementById("filter-select");
    this.refreshBtn = document.getElementById("refresh-btn");
    this.surveyCount = document.getElementById("survey-count");
    this.loadingSurveys = document.getElementById("loading-surveys");
    this.surveysContainer = document.getElementById("surveys-container");
    this.noSurveys = document.getElementById("no-surveys");
    this.errorMessage = document.getElementById("error-message");
    this.errorText = document.getElementById("error-text");

    // Modal elements
    this.summaryModal = document.getElementById("summary-modal");
    this.modalTitle = document.getElementById("modal-title");
    this.summaryContent = document.getElementById("summary-content");
    this.summaryLoading = document.getElementById("summary-loading");
    this.copySummaryBtn = document.getElementById("copy-summary-btn");
    this.closeSummaryBtn = document.getElementById("close-summary-btn");
    this.closeModal = document.getElementById("close-modal");

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
    this.closeModal.addEventListener("click", () => this.closeSummaryModal());
    this.closeSummaryBtn.addEventListener("click", () =>
      this.closeSummaryModal()
    );
    this.copySummaryBtn.addEventListener("click", () =>
      this.copySummaryToClipboard()
    );

    // Confirm modal
    this.confirmNo.addEventListener("click", () => this.closeConfirmModal());

    // Close modals on outside click
    window.addEventListener("click", (e) => {
      if (e.target === this.summaryModal) {
        this.closeSummaryModal();
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
      const filterValue = this.filterSelect.value;
      let filteredSurveys = this.surveys;
      if (filterValue === "my-surveys") {
        filteredSurveys = this.surveys.filter(
          (survey) =>
            survey.creator && survey.creator._id === this.currentUser.userId
        );
      }

      this.displaySurveys(filteredSurveys);
      this.updateStats(filteredSurveys);
    } catch (error) {
      console.error("Error loading surveys:", error);
      this.showError("Failed to load surveys. Please try again.");
    } finally {
      this.setLoadingState(false);
    }
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
    card.className = "survey-card summary-card";
    card.setAttribute("data-survey-id", survey._id);

    const expiryDate = new Date(survey.expiryDate);
    const isExpired = expiryDate < new Date();
    const isActive = survey.isActive !== false;
    const isOwner =
      survey.creator && survey.creator._id === this.currentUser.userId;
    const hasResponses = survey.responses && survey.responses.length > 0;
    const hasSummary = survey.summary && survey.summary.content;

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
                    ${
                      hasSummary
                        ? '<span class="has-summary">📋 Has Summary</span>'
                        : ""
                    }
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
                  hasSummary
                    ? `
                    <div class="summary-info">
                        <div class="summary-status">
                            <span class="summary-icon">📋</span>
                            <span class="summary-text">
                                Summary generated ${this.formatDate(
                                  new Date(survey.summary.generatedAt)
                                )}
                            </span>
                        </div>
                        <div class="visibility-status">
                            <span class="visibility-icon">${
                              survey.summary.isVisible ? "👁️" : "🔒"
                            }</span>
                            <span class="visibility-text">
                                ${
                                  survey.summary.isVisible
                                    ? "Publicly Visible"
                                    : "Private"
                                }
                            </span>
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
            
            <div class="survey-actions">
                <button class="view-btn" onclick="summaryManager.viewSurvey('${
                  survey._id
                }')">
                    👁️ View Survey
                </button>
                
                ${
                  isOwner && hasResponses
                    ? `
                    <button class="generate-btn" onclick="summaryManager.generateSummary('${
                      survey._id
                    }')" 
                            ${hasSummary ? 'title="Regenerate summary"' : ""}>
                        ${hasSummary ? "🔄 Regenerate" : "📋 Generate"} Summary
                    </button>
                `
                    : ""
                }
                
                ${
                  hasSummary
                    ? `
                    <button class="view-summary-btn" onclick="summaryManager.viewSummary('${survey._id}')">
                        📖 View Summary
                    </button>
                `
                    : ""
                }
                
                ${
                  isOwner && hasSummary
                    ? `
                    <button class="toggle-visibility-btn" onclick="summaryManager.toggleVisibility('${
                      survey._id
                    }')"
                            title="${
                              survey.summary.isVisible
                                ? "Make private"
                                : "Make public"
                            }">
                        ${
                          survey.summary.isVisible
                            ? "🔒 Make Private"
                            : "👁️ Make Public"
                        }
                    </button>
                `
                    : ""
                }
            </div>
            
            ${
              !isOwner && !hasResponses
                ? `
                <div class="no-responses-notice">
                    <span class="notice-icon">ℹ️</span>
                    <span class="notice-text">No responses yet - summary generation not available</span>
                </div>
            `
                : ""
            }
            
            ${
              !isOwner
                ? `
                <div class="readonly-notice">
                    <span class="notice-icon">ℹ️</span>
                    <span class="notice-text">View-only (not your survey)</span>
                </div>
            `
                : ""
            }
        `;

    return card;
  }

  async generateSummary(surveyId) {
    const survey = this.surveys.find((s) => s._id === surveyId);
    if (!survey) return;

    const hasExistingSummary = survey.summary && survey.summary.content;
    const action = hasExistingSummary ? "regenerate" : "generate";

    this.showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Summary`,
      `Are you sure you want to ${action} the AI summary for "${
        survey.title
      }"? ${
        hasExistingSummary ? "This will replace the existing summary." : ""
      }`,
      async () => {
        await this.performSummaryGeneration(surveyId);
      }
    );
  }
  async performSummaryGeneration(surveyId) {
    try {
      this.showSummaryModal("Generating Summary...", true);

      const response = await authenticatedFetch(
        `${API_BASE_URL}/surveys/${surveyId}/summary`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();

      if (data.summary) {
        this.displaySummaryInModal(
          data.summary,
          "Summary Generated Successfully"
        );
        // Refresh the surveys to show updated summary
        await this.loadSurveys();
      } else {
        throw new Error("No summary returned from server");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      this.closeSummaryModal();
      this.showError(
        error.message || "Failed to generate summary. Please try again."
      );
    }
  }

  async toggleVisibility(surveyId) {
    const survey = this.surveys.find((s) => s._id === surveyId);
    if (!survey || !survey.summary) return;

    const currentVisibility = survey.summary.isVisible;
    const action = currentVisibility ? "hide" : "show";

    this.showConfirm(
      "Change Summary Visibility",
      `Are you sure you want to ${action} the summary for "${survey.title}"? ${
        currentVisibility
          ? "It will no longer be visible to survey participants."
          : "Survey participants will be able to view the summary."
      }`,
      async () => {
        await this.performVisibilityToggle(surveyId, !currentVisibility);
      }
    );
  }
  async performVisibilityToggle(surveyId, isVisible) {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/surveys/${surveyId}/summary/visibility`,
        {
          method: "PATCH",
          body: JSON.stringify({ isVisible }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update visibility: ${response.status}`);
      }

      // Update local survey data
      const survey = this.surveys.find((s) => s._id === surveyId);
      if (survey && survey.summary) {
        survey.summary.isVisible = isVisible;
      }

      // Refresh display
      this.displaySurveys(this.getFilteredSurveys());
    } catch (error) {
      console.error("Error toggling visibility:", error);
      this.showError(
        error.message ||
          "Failed to update summary visibility. Please try again."
      );
    }
  }

  viewSummary(surveyId) {
    const survey = this.surveys.find((s) => s._id === surveyId);
    if (!survey || !survey.summary) return;

    this.displaySummaryInModal(survey.summary, `Summary: ${survey.title}`);
  }

  viewSurvey(surveyId) {
    window.location.href = `survey.html?id=${surveyId}`;
  }

  showSummaryModal(title, showLoading = false) {
    this.modalTitle.textContent = title;
    this.summaryContent.style.display = showLoading ? "none" : "block";
    this.summaryLoading.style.display = showLoading ? "block" : "none";
    this.copySummaryBtn.style.display = showLoading ? "none" : "inline-block";
    this.summaryModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  displaySummaryInModal(summary, title) {
    this.modalTitle.textContent = title;
    this.summaryContent.innerHTML = `
            <div class="summary-display">
                <div class="summary-header">
                    <div class="summary-meta">
                        <span class="summary-date">📅 Generated: ${this.formatDate(
                          new Date(summary.generatedAt)
                        )}</span>
                        <span class="summary-visibility">
                            ${summary.isVisible ? "👁️ Public" : "🔒 Private"}
                        </span>
                    </div>
                </div>
                <div class="summary-body">
                    <pre class="summary-text">${this.escapeHtml(
                      summary.content
                    )}</pre>
                </div>
            </div>
        `;

    this.summaryContent.style.display = "block";
    this.summaryLoading.style.display = "none";
    this.copySummaryBtn.style.display = "inline-block";
    this.summaryModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  closeSummaryModal() {
    this.summaryModal.style.display = "none";
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

  async copySummaryToClipboard() {
    try {
      const summaryText =
        this.summaryContent.querySelector(".summary-text")?.textContent;
      if (summaryText) {
        await navigator.clipboard.writeText(summaryText);

        // Temporary feedback
        const originalText = this.copySummaryBtn.textContent;
        this.copySummaryBtn.textContent = "✅ Copied!";
        setTimeout(() => {
          this.copySummaryBtn.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }

  getFilteredSurveys() {
    const filterValue = this.filterSelect.value;
    if (filterValue === "my-surveys") {
      return this.surveys.filter(
        (survey) =>
          survey.creator && survey.creator._id === this.currentUser.userId
      );
    }
    return this.surveys;
  }

  updateStats(surveys) {
    const totalSurveys = surveys.length;
    const surveysWithSummaries = surveys.filter(
      (s) => s.summary && s.summary.content
    ).length;
    const mySurveys = surveys.filter(
      (s) => s.creator && s.creator._id === this.currentUser.userId
    ).length;

    this.surveyCount.innerHTML = `
            📊 ${totalSurveys} surveys • 📋 ${surveysWithSummaries} with summaries • 👤 ${mySurveys} yours
        `;
  }

  showNoSurveys() {
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
}

// Initialize summary manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // Initialize summary manager
  window.summaryManager = new SummaryManager();
});
