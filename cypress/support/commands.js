// ***********************************************
// Custom commands for Prayer Diary tests
// ***********************************************

// Command to log in a user
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/');
  cy.get('#btn-login').click();
  
  // Fill in the login form
  cy.get('#auth-email').type(email);
  cy.get('#auth-password').type(password);
  
  // Submit form
  cy.get('#auth-submit').click();
  
  // Wait for login to complete
  cy.get('.logged-in').should('be.visible');
});

// Command to register a new user with better error handling
Cypress.Commands.add('registerUser', (fullName, email, password) => {
  cy.visit('/');
  cy.get('#btn-signup').click();
  
  // Fill in the signup form
  cy.get('#signup-name').type(fullName);
  cy.get('#auth-email').type(email);
  cy.get('#auth-password').type(password);
  
  // Listen to console errors
  cy.window().then((win) => {
    cy.spy(win.console, 'error').as('consoleError');
  });
  
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