/**
 * Authentication functionality for login and registration
 */

// Initialize authentication when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeAuth();
});

/**
 * Initialize authentication based on current page
 */
function initializeAuth() {
  const currentPage = window.location.pathname.split("/").pop();

  switch (currentPage) {
    case "login.html":
      initializeLoginForm();
      break;
    case "register.html":
      initializeRegisterForm();
      break;
    case "dashboard.html":
      initializeDashboard();
      break;
    case "index.html":
    case "":
      handleIndexRedirect();
      break;
  }
}

/**
 * Handle index page redirection logic
 */
function handleIndexRedirect() {
  if (isLoggedIn()) {
    redirectToDashboard();
  } else {
    redirectToLogin();
  }
}

/**
 * Initialize login form functionality
 */
function initializeLoginForm() {
  // Redirect if already logged in
  if (isLoggedIn()) {
    redirectToDashboard();
    return;
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Clear any existing error messages
  hideError();
}

/**
 * Initialize register form functionality
 */
function initializeRegisterForm() {
  // Redirect if already logged in
  if (isLoggedIn()) {
    redirectToDashboard();
    return;
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);

    // Add real-time password validation
    const passwordField = document.getElementById("password");
    if (passwordField) {
      passwordField.addEventListener("input", handlePasswordValidation);
    }

    // Add email validation
    const emailField = document.getElementById("email");
    if (emailField) {
      emailField.addEventListener("blur", handleEmailValidation);
    }
  }

  // Clear any existing error messages
  hideError();
}

/**
 * Initialize dashboard functionality
 */
function initializeDashboard() {
  // Redirect if not logged in
  if (!isLoggedIn()) {
    redirectToLogin();
    return;
  }

  // Display user information
  displayUserInfo();

  // Initialize logout functionality
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

/**
 * Handle login form submission
 * @param {Event} event - The form submission event
 */
async function handleLogin(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const email = formData.get("email").trim();
  const password = formData.get("password");

  // Client-side validation
  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }

  if (!isValidEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }

  // Clear previous errors
  hideError();

  // Show loading state
  setFormLoading(form, true);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and redirect
      setToken(data.token);
      showSuccess("Login successful! Redirecting...");

      // Redirect after short delay
      setTimeout(() => {
        redirectToDashboard();
      }, 1000);
    } else {
      // Handle error response
      const errorMessage =
        data.error?.message || data.message || "Login failed";
      showError(errorMessage);
    }
  } catch (error) {
    console.error("Login error:", error);
    showError(handleNetworkError(error));
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Handle registration form submission
 * @param {Event} event - The form submission event
 */
async function handleRegister(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const username = formData.get("username").trim();
  const email = formData.get("email").trim();
  const password = formData.get("password");
  const registrationCode = formData.get("registrationCode").trim();

  // Client-side validation
  if (!username || !email || !password || !registrationCode) {
    showError("Please fill in all fields");
    return;
  }

  if (!isValidEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    showError(passwordValidation.message);
    return;
  }

  if (username.length < 3) {
    showError("Username must be at least 3 characters long");
    return;
  }

  // Clear previous errors
  hideError();

  // Show loading state
  setFormLoading(form, true);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        registrationCode,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess(
        "Registration successful! Please login with your credentials."
      );

      // Clear form
      form.reset();

      // Redirect to login after delay
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      // Handle error response
      const errorMessage =
        data.error?.message || data.message || "Registration failed";
      showError(errorMessage);
    }
  } catch (error) {
    console.error("Registration error:", error);
    showError(handleNetworkError(error));
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Handle logout functionality
 */
function handleLogout() {
  removeToken();
  showSuccess("Logged out successfully");

  setTimeout(() => {
    redirectToLogin();
  }, 1000);
}

/**
 * Display user information on dashboard
 */
function displayUserInfo() {
  const userInfo = getUserInfo();
  if (userInfo) {
    const usernameElement = document.getElementById("username");
    if (usernameElement) {
      usernameElement.textContent = userInfo.username;
    }

    const userEmailElement = document.getElementById("userEmail");
    if (userEmailElement) {
      userEmailElement.textContent = userInfo.email;
    }
  }
}

/**
 * Handle real-time password validation
 * @param {Event} event - The input event
 */
function handlePasswordValidation(event) {
  const password = event.target.value;
  const validation = validatePassword(password);

  const passwordHelpElement = document.getElementById("passwordHelp");
  if (passwordHelpElement) {
    if (password.length > 0) {
      passwordHelpElement.textContent = validation.message;
      passwordHelpElement.style.color = validation.isValid
        ? "#2f855a"
        : "#c53030";
      passwordHelpElement.style.display = "block";
    } else {
      passwordHelpElement.style.display = "none";
    }
  }
}

/**
 * Handle real-time email validation
 * @param {Event} event - The blur event
 */
function handleEmailValidation(event) {
  const email = event.target.value.trim();

  if (email && !isValidEmail(email)) {
    const emailField = event.target;
    emailField.style.borderColor = "#e53e3e";

    const emailHelpElement = document.getElementById("emailHelp");
    if (emailHelpElement) {
      emailHelpElement.textContent = "Please enter a valid email address";
      emailHelpElement.style.color = "#c53030";
      emailHelpElement.style.display = "block";
    }
  } else {
    const emailField = event.target;
    emailField.style.borderColor = "#e1e5e9";

    const emailHelpElement = document.getElementById("emailHelp");
    if (emailHelpElement) {
      emailHelpElement.style.display = "none";
    }
  }
}
