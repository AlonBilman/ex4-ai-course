/**
 * Search Page Functionality
 * Handles natural language survey search using AI
 */

class SearchManager {
  constructor() {
    this.searchForm = document.getElementById("search-form");
    this.searchQuery = document.getElementById("search-query");
    this.searchBtn = document.getElementById("search-btn");
    this.searchResults = document.getElementById("search-results");
    this.resultsContainer = document.getElementById("results-container");
    this.resultsCount = document.getElementById("results-count");
    this.noResults = document.getElementById("no-results");
    this.errorMessage = document.getElementById("error-message");
    this.errorText = document.getElementById("error-text");

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupExampleQueries();
  }

  setupEventListeners() {
    // Search form submission
    this.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.performSearch();
    });

    // Real-time character count (optional enhancement)
    this.searchQuery.addEventListener("input", () => {
      this.clearMessages();
    }); // Logout functionality
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        removeToken();
        window.location.href = "login.html";
      });
    }
  }

  setupExampleQueries() {
    const exampleItems = document.querySelectorAll(".example-item");
    exampleItems.forEach((item) => {
      item.addEventListener("click", () => {
        const query = item.getAttribute("data-query");
        this.searchQuery.value = query;
        this.searchQuery.focus();
        // Optional: Auto-search when example is clicked
        // this.performSearch();
      });
    });
  }
  async performSearch() {
    const query = this.searchQuery.value.trim();

    if (!query) {
      this.showError("Please enter a search query");
      return;
    }

    if (query.length < 3) {
      this.showError("Search query must be at least 3 characters long");
      return;
    }

    this.setLoadingState(true);
    this.clearMessages();

    try {
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

      if (data.matches && data.matches.length > 0) {
        this.displayResults(data.matches, query);
      } else {
        this.showNoResults();
      }
    } catch (error) {
      console.error("Search error:", error);
      this.showError(
        error.message || "Failed to search surveys. Please try again."
      );
    } finally {
      this.setLoadingState(false);
    }
  }

  displayResults(matches, query) {
    this.clearMessages();

    // Update results count
    this.resultsCount.textContent = `Found ${matches.length} matching survey${
      matches.length === 1 ? "" : "s"
    } for "${query}"`;

    // Clear previous results
    this.resultsContainer.innerHTML = "";

    // Create result cards
    matches.forEach((match, index) => {
      const resultCard = this.createResultCard(match, index);
      this.resultsContainer.appendChild(resultCard);
    });

    // Show results container
    this.searchResults.style.display = "block";
    this.noResults.style.display = "none";
  }

  createResultCard(match, index) {
    const { survey, reason } = match;

    const card = document.createElement("div");
    card.className = "result-card";
    card.setAttribute("data-survey-id", survey._id);

    // Format expiry date
    const expiryDate = new Date(survey.expiryDate);
    const isExpired = expiryDate < new Date();
    const isActive = survey.isActive !== false;

    const statusClass = isExpired ? "expired" : isActive ? "active" : "closed";
    const statusText = isExpired ? "Expired" : isActive ? "Active" : "Closed";
    const statusIcon = isExpired ? "⏰" : isActive ? "✅" : "🔒";

    card.innerHTML = `
            <div class="result-header">
                <div class="result-rank">#${index + 1}</div>
                <div class="result-meta">
                    <span class="survey-status ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                    <span class="survey-responses">
                        📝 ${survey.responses?.length || 0} responses
                    </span>
                </div>
            </div>
            
            <div class="result-content">
                <h4 class="survey-title">${this.escapeHtml(survey.title)}</h4>
                
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
                
                <div class="match-reason">
                    <span class="reason-icon">🎯</span>
                    <span class="reason-text"><strong>Why it matches:</strong> ${this.escapeHtml(
                      reason
                    )}</span>
                </div>
                
                <div class="survey-details">
                    <div class="detail-item">
                        <span class="detail-icon">📅</span>
                        <span class="detail-text">Expires: ${this.formatDate(
                          expiryDate
                        )}</span>
                    </div>
                    
                    ${
                      survey.creator?.username
                        ? `
                        <div class="detail-item">
                            <span class="detail-icon">👤</span>
                            <span class="detail-text">Creator: ${this.escapeHtml(
                              survey.creator.username
                            )}</span>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      survey.guidelines?.question
                        ? `
                        <div class="detail-item question-preview">
                            <span class="detail-icon">❓</span>
                            <span class="detail-text">${this.escapeHtml(
                              survey.guidelines.question
                            )}</span>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
            
            <div class="result-actions">
                <button class="view-btn" onclick="searchManager.viewSurvey('${
                  survey._id
                }')">
                    👁️ View Survey
                </button>
                
                ${
                  !isExpired && isActive
                    ? `
                    <button class="respond-btn" onclick="searchManager.goToSurvey('${survey._id}')">
                        ✏️ Respond
                    </button>
                `
                    : ""
                }
            </div>
        `;

    return card;
  }

  viewSurvey(surveyId) {
    window.location.href = `survey.html?id=${surveyId}`;
  }

  goToSurvey(surveyId) {
    window.location.href = `survey.html?id=${surveyId}`;
  }

  showNoResults() {
    this.clearMessages();
    this.searchResults.style.display = "none";
    this.noResults.style.display = "block";
  }

  showError(message) {
    this.clearMessages();
    this.errorText.textContent = message;
    this.errorMessage.style.display = "block";
    this.searchResults.style.display = "none";
    this.noResults.style.display = "none";
  }

  clearMessages() {
    this.errorMessage.style.display = "none";
    this.searchResults.style.display = "none";
    this.noResults.style.display = "none";
  }

  setLoadingState(loading) {
    const btnText = this.searchBtn.querySelector(".btn-text");
    const btnLoading = this.searchBtn.querySelector(".btn-loading");

    if (loading) {
      btnText.style.display = "none";
      btnLoading.style.display = "inline";
      this.searchBtn.disabled = true;
      this.searchQuery.disabled = true;
    } else {
      btnText.style.display = "inline";
      btnLoading.style.display = "none";
      this.searchBtn.disabled = false;
      this.searchQuery.disabled = false;
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

// Initialize search manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  // Initialize search manager
  new SearchManager();
});
