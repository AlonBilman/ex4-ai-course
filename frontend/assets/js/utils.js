/**
 * Utility functions for authentication and token management
 */

// Configuration
const API_BASE_URL = "http://localhost:3000"; // Adjust based on your backend URL

/**
 * Get the JWT token from localStorage
 * @returns {string|null} The JWT token or null if not found
 */
function getToken() {
  return localStorage.getItem("authToken");
}

/**
 * Set the JWT token in localStorage
 * @param {string} token - The JWT token to store
 */
function setToken(token) {
  localStorage.setItem("authToken", token);
}

/**
 * Remove the JWT token from localStorage
 */
function removeToken() {
  localStorage.removeItem("authToken");
}

/**
 * Check if user is logged in by verifying token existence
 * @returns {boolean} True if user is logged in, false otherwise
 */
function isLoggedIn() {
  const token = getToken();
  if (!token) return false;

  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      removeToken();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Invalid token format:", error);
    removeToken();
    return false;
  }
}

/**
 * Get user information from the JWT token
 * @returns {object|null} User information or null if not available
 */
function getUserInfo() {
  const token = getToken();
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    };
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
}

/**
 * Make an authenticated API request
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} The fetch response
 */
async function authenticatedFetch(url, options = {}) {
  const token = getToken();

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);

  // Handle token expiration
  if (response.status === 401) {
    removeToken();
    redirectToLogin();
  }

  return response;
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  window.location.href = "login.html";
}

/**
 * Redirect to dashboard
 */
function redirectToDashboard() {
  window.location.href = "dashboard.html";
}

/**
 * Show error message in the UI with enhanced styling
 * @param {string} message - The error message to display
 * @param {string} containerId - The ID of the container to show the message in
 */
function showError(message, containerId = "error-message") {
  const errorElement = document.getElementById(containerId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.className =
      "mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-sm flex items-center";
    errorElement.innerHTML = `
            <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${message}</span>
        `;
    errorElement.style.display = "block";

    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideError(containerId);
    }, 5000);
  }
}

/**
 * Hide error message
 * @param {string} containerId - The ID of the container to hide
 */
function hideError(containerId = "error-message") {
  const errorElement = document.getElementById(containerId);
  if (errorElement) {
    errorElement.style.display = "none";
    errorElement.className = "hidden";
  }
}

/**
 * Show success message in the UI with enhanced styling
 * @param {string} message - The success message to display
 * @param {string} containerId - The ID of the container to show the message in
 */
function showSuccess(message, containerId = "success-message") {
  const successElement = document.getElementById(containerId);
  if (successElement) {
    successElement.className =
      "mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-sm flex items-center";
    successElement.innerHTML = `
            <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${message}</span>
        `;
    successElement.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      hideSuccess(containerId);
    }, 3000);
  }
}

/**
 * Hide success message
 * @param {string} containerId - The ID of the container to hide
 */
function hideSuccess(containerId = "success-message") {
  const successElement = document.getElementById(containerId);
  if (successElement) {
    successElement.style.display = "none";
    successElement.className = "hidden";
  }
}

/**
 * Show loading state for a form
 * @param {HTMLFormElement} form - The form element
 * @param {boolean} loading - Whether to show or hide loading state
 */
function setFormLoading(form, loading) {
  if (loading) {
    form.classList.add("loading");
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }
  } else {
    form.classList.remove("loading");
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} True if email is valid, false otherwise
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {object} Validation result with isValid and message
 */
function validatePassword(password) {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters long",
    };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  return {
    isValid: true,
    message: "Password is valid",
  };
}

/**
 * Handle network errors
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function handleNetworkError(error) {
  if (!navigator.onLine) {
    return "No internet connection. Please check your network and try again.";
  }

  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return "Unable to connect to server. Please try again later.";
  }

  return "An unexpected error occurred. Please try again.";
}
