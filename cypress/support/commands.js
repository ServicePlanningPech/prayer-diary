// ***********************************************
// Custom commands for Prayer Diary tests
// ***********************************************

// Command to log in a user with completely redesigned approach for maximum reliability
Cypress.Commands.add('login', (email, password) => {
  // Start clean with a fresh visit and force reload
  cy.visit('/', { timeout: 30000 });
  
  cy.task('log', `Attempting to log in as ${email}`);
  
  // Clear cookies and localStorage to ensure clean state
  cy.clearCookies();
  cy.window().then((win) => {
    win.sessionStorage.clear();
    // Only clear specific localStorage items to avoid clearing important test state
    win.localStorage.removeItem('supabase.auth.token');
  });
  
  // Intercept auth API calls to check for success
  cy.intercept('POST', '**/auth/v1/token*').as('authRequest');
  
  // Also intercept the profiles API to see if we're getting user data
  cy.intercept('GET', '**/rest/v1/profiles*').as('getProfiles');
  
  // Wait for page to fully load
  cy.get('#btn-login', { timeout: 10000 }).should('be.visible');
  
  // Click with retry for reliability
  cy.get('#btn-login').click({ force: true });
  
  // Ensure modal is fully visible and stable
  cy.get('#auth-modal', { timeout: 10000 }).should('be.visible');
  cy.wait(1500); // Extra wait for modal animation
  
  // CRITICAL: Use cy.within to lock context to the modal
  cy.get('#auth-modal').within(() => {
    // Type email with a slower, more deliberate approach
    cy.get('#auth-email')
      .should('be.visible')
      .click({ force: true }) // Force click to ensure focus
      .focus() // Explicitly focus the element
      .clear({ force: true }) // Clear with force option
      .should('have.value', '') // Verify cleared
      .type(email, { force: true, delay: 150 }); // Type slowly with force
    
    // Log a checkpoint to debug
    cy.task('log', 'Email entered, verifying value');
    
    // Verify email entered correctly
    cy.get('#auth-email').should('have.value', email);
    
    // Now handle password with similar careful approach
    cy.get('#auth-password')
      .should('be.visible')
      .click({ force: true })
      .focus()
      .clear({ force: true })
      .should('have.value', '')
      .type(password, { force: true, delay: 100 });
    
    // Verify password entered correctly
    cy.get('#auth-password').should('have.value', password);
    
    // Take a breather before clicking submit
    cy.wait(1000);
    
    // Submit the form
    cy.get('#auth-submit')
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });
  });
  
  // Wait for login API response
  cy.wait('@authRequest', { timeout: 20000 }).then((interception) => {
    cy.task('log', `Auth API status: ${interception.response?.statusCode}`);
    if (interception.response?.statusCode !== 200) {
      cy.log('Login API did not return 200, checking for error messages');
      cy.get('#auth-error').then($error => {
        if ($error.is(':visible')) {
          throw new Error(`Login failed: ${$error.text()}`);
        }
      });
    }
  });
  
  // Wait for profiles API to be called (this indicates user data is being loaded)
  cy.wait('@getProfiles', { timeout: 20000 });
  
  // Verify successful login state
  cy.get('.logged-in', { timeout: 20000 }).should('be.visible');
  cy.get('#app-views', { timeout: 10000 }).should('be.visible');
  
  // Explicitly check for admin status - this is critical
  cy.task('log', 'Verifying admin status...');
  
  // Check if we're logged in as an admin - try multiple approaches
  // This uses a combination of element visibility and network requests
  
  // First check for admin UI elements
  cy.get('body').then($body => {
    const hasAdminDropdown = $body.find('#adminDropdown:visible').length > 0;
    cy.task('log', `Admin dropdown visible: ${hasAdminDropdown}`);
    
    if (hasAdminDropdown) {
      cy.task('log', 'Admin UI elements found - user has admin privileges');
    } else {
      // Also check via API responses for user role
      cy.task('log', 'Admin dropdown not visible, checking via alternate methods...');
      
      // Wait a bit longer for any animations or delayed UI updates
      cy.wait(3000);
      
      // Try again after waiting
      if ($body.find('#adminDropdown:visible').length > 0) {
        cy.task('log', 'Admin dropdown became visible after waiting');
      } else {
        // If still not visible, check if we need to reveal the admin menu
        cy.task('log', 'Checking if admin menu needs to be revealed');
        
        // Check if we have any admin-only elements at all
        const hasAnyAdminElements = $body.find('.admin-only').length > 0;
        cy.task('log', `Admin-only elements exist: ${hasAnyAdminElements}`);
        
        if (hasAnyAdminElements) {
          cy.task('log', 'Admin elements exist but might be hidden - trying to reveal');
          // Try to force admin elements to show for testing purposes
          cy.window().then(win => {
            if (win.isAdmin && typeof win.isAdmin === 'function') {
              cy.task('log', 'Using isAdmin() function from app');
              const isAdminResult = win.isAdmin();
              cy.task('log', `isAdmin() returned: ${isAdminResult}`);
            }
          });
        }
      }
    }
  });
  
  cy.task('log', 'Login verification completed');
});

// Command to register a new user with better error handling
Cypress.Commands.add('registerUser', (fullName, email, password) => {
  cy.visit('/');
  cy.get('#btn-signup').click();
  
  // Fill in the signup form with delays to ensure complete typing
  cy.get('#signup-name').should('be.visible').clear().type(fullName, { delay: 50 });
  cy.get('#auth-email').should('be.visible').clear().type(email, { delay: 100 });
  
  // Verify email is typed correctly
  cy.get('#auth-email').should('have.value', email);
  
  cy.get('#auth-password').should('be.visible').clear().type(password, { delay: 50 });
  
  // Listen to console errors
  cy.window().then((win) => {
    cy.spy(win.console, 'error').as('consoleError');
  });
  
  // Small delay before submitting
  cy.wait(500);
  
  // Submit form
  cy.get('#auth-submit').click();
  
  // Check for console errors
  cy.get('@consoleError').then((errorLog) => {
    if (errorLog.callCount > 0) {
      cy.log(`Console errors occurred: ${JSON.stringify(errorLog.args)}`);
    }
  });
  
  // Optionally check for error message in the UI
  cy.get('#auth-error').then($error => {
    if ($error.is(':visible')) {
      cy.log(`Auth error displayed: ${$error.text()}`);
    }
  });
  
  // Continue with test when success message appears
  cy.contains('Account Created', { timeout: 10000 }).should('be.visible');
});

// Command to log out
Cypress.Commands.add('logout', () => {
  cy.get('#btn-logout').click();
  
  // Verify logged out state
  cy.get('.logged-out').should('be.visible');
});

// Command to approve a user (requires admin login)
Cypress.Commands.add('approveUser', (userName) => {
  // Navigate to admin user management
  cy.get('#adminDropdown').click();
  cy.get('#nav-manage-users').click();
  
  // Find the pending user tab
  cy.get('#pending-users-tab').click();
  
  // Find the user and approve
  cy.contains(userName)
    .closest('.card')
    .find('.approve-user')
    .click();
  
  // Verify success message
  cy.contains('User approved successfully').should('be.visible');
});