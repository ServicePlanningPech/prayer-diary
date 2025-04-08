// Enhanced Bulk User Approval Script
// This script will approve multiple pending users with proper delays and verification

describe('Enhanced Bulk User Approval', () => {
  // Configuration settings
  const config = {
    // Admin credentials
    adminEmail: 'prayerdiary@pech.co.uk',
    adminPassword: '@Prayer@Diary@',
    
    // Maximum number of users to approve
    maxUsersToApprove: 1,
    
    // Delay settings (in milliseconds)
    typingDelay: 150,      // Delay between keystrokes
    actionDelay: 500,      // Delay between UI actions
    verifyTimeout: 10000,  // Timeout for verification steps
    
    // Should we continue if an approval fails?
    continueOnError: true
  };
  
  // Tracking metrics
  let approvedCount = 0;
  let failedCount = 0;
  let startTime;
  let isLoggedIn = false;
  
  before(() => {
    // Record the start time for reporting
    startTime = new Date();
    cy.task('log', `Starting bulk approval process at ${startTime.toLocaleString()}`);
    cy.task('log', `Will approve up to ${config.maxUsersToApprove} users`);
  });
  
  // No beforeEach hook - we'll handle session management in each test directly
  
  it('logs in as admin', () => {
    // Visit the site directly with a longer timeout
    cy.task('log', 'Starting login process');
    cy.visit('/', { timeout: config.verifyTimeout });
    cy.wait(config.actionDelay);
    
    // Take a screenshot of the initial page
    cy.screenshot('01-initial-page');
    
    // Check if we're already logged in (from a previous run)
    cy.get('body').then($body => {
      if ($body.find('.logged-in:visible').length > 0) {
        cy.task('log', 'Already logged in, skipping login process');
        isLoggedIn = true;
        return;
      }
      
      // Make sure login button is visible
      cy.get('#btn-login').should('be.visible');
      
      // Click the login button and wait for modal
      cy.get('#btn-login').click({force: true});
      cy.wait(config.actionDelay);
      cy.get('#auth-modal').should('be.visible');
      cy.wait(config.actionDelay);
      
      cy.screenshot('02-login-modal');
      
      // Enter email - using slower typing with verification
      cy.get('#auth-email')
        .should('be.visible')
        .click({force: true})
        .focus()
        .clear({force: true})
        .should('have.value', '')
        .type(config.adminEmail, { delay: config.typingDelay, force: true });
        
      // Verify email before continuing
      cy.get('#auth-email').should('have.value', config.adminEmail);
      cy.wait(config.actionDelay);
      
      // Enter password - using slower typing with verification
      cy.get('#auth-password')
        .should('be.visible')
        .click({force: true})
        .focus()
        .clear({force: true})
        .should('have.value', '')
        .type(config.adminPassword, { delay: config.typingDelay, force: true });
        
      // Verify password before continuing  
      cy.get('#auth-password').should('have.value', config.adminPassword);
      cy.wait(config.actionDelay);
      
      cy.screenshot('03-credentials-entered');
      
      // Submit and wait for login to complete with extended timeout
      cy.get('#auth-submit').should('be.visible').click({force: true});
      
      // Wait for login to complete - with a longer timeout
      cy.get('.logged-in', { timeout: 20000 }).should('be.visible');
      cy.get('#app-views', { timeout: 20000 }).should('be.visible');
      
      // Set flag for other tests to know we're logged in
      isLoggedIn = true;
      
      cy.screenshot('04-logged-in');
    });
    
    // Check URL after login and revisit if needed
    cy.url().then(url => {
      cy.task('log', `Current URL after login: ${url}`);
      
      // If we ended up on about:blank or any other unexpected URL, go back to the app
      if (!url.includes(Cypress.config('baseUrl'))) {
        cy.task('log', 'Unexpected URL after login, revisiting app');
        cy.visit('/', { timeout: config.verifyTimeout });
        cy.wait(config.actionDelay * 2); // Extra wait after revisit
      }
    });
    
    // Verify we have admin access by checking for admin dropdown
    cy.get('body').then($body => {
      const hasAdminDropdown = $body.find('#adminDropdown').length > 0;
      cy.task('log', `Admin dropdown found: ${hasAdminDropdown}`);
      
      if (!hasAdminDropdown) {
        cy.task('log', 'WARNING: Admin dropdown not found, login might not have admin privileges');
      }
    });
    
    cy.task('log', 'Successfully completed login process');
    cy.wait(config.actionDelay);
  });
  
  it('completes the full approval process', () => {
    // Only continue if we're logged in
    if (!isLoggedIn) {
      cy.task('log', 'Error: Not logged in, cannot proceed with approval process');
      return;
    }
    
    // Make sure we're on the right page
    cy.url().then(url => {
      cy.task('log', `Current URL before approval process: ${url}`);
      
      // If URL is not the base URL, revisit
      if (!url.includes(Cypress.config('baseUrl'))) {
        cy.task('log', 'Not on app page, revisiting app');
        cy.visit('/', { timeout: config.verifyTimeout });
        cy.wait(config.actionDelay * 2);
      }
    });
    
    // Take a screenshot of the current state
    cy.screenshot('05-before-admin-nav');
    
    // Ensure we can see the admin dropdown
    cy.task('log', 'Looking for admin dropdown');
    cy.get('#adminDropdown').should('exist').then($dropdown => {
      if (!$dropdown.is(':visible')) {
        cy.task('log', 'Admin dropdown exists but is not visible, checking navbar state');
        
        // Check if navbar is collapsed (on mobile/smaller screens)
        cy.get('.navbar-toggler').then($toggler => {
          if ($toggler.is(':visible')) {
            cy.task('log', 'Navbar is collapsed, expanding it');
            cy.get('.navbar-toggler').click({force: true});
            cy.wait(config.actionDelay);
          }
        });
      }
    });
    
    // Step 1: Navigate to user management
    cy.task('log', 'Clicking admin dropdown');
    cy.get('#adminDropdown').click({force: true});
    cy.wait(config.actionDelay * 2); // Longer wait for dropdown animation
    
    cy.screenshot('06-admin-dropdown');
    
    cy.task('log', 'Clicking manage users link');
    cy.get('#nav-manage-users').should('be.visible').click({force: true});
    cy.wait(config.actionDelay * 2); // Longer wait for page change
    
    // Verify we're on the user management page
    cy.contains('Manage Users', { timeout: config.verifyTimeout }).should('be.visible');
    
    cy.screenshot('07-manage-users-page');
    
    cy.get('#pending-users-tab').should('be.visible');
    cy.task('log', 'Successfully navigated to user management page');
    cy.wait(config.actionDelay);
    
    // Step 2: Click the pending users tab if not already active
    cy.task('log', 'Activating pending users tab');
    cy.get('#pending-users-tab').then($tab => {
      if (!$tab.hasClass('active')) {
        cy.task('log', 'Clicking pending users tab');
        cy.wrap($tab).click({force: true});
        cy.wait(config.actionDelay * 2);
      } else {
        cy.task('log', 'Pending users tab already active');
      }
    });
    
    cy.screenshot('08-pending-users-tab');
    
    // Step 3: Count pending users
    cy.task('log', 'Counting pending users');
    
    // Wait for pending users container to load completely
    cy.get('#pending-users-container', { timeout: config.verifyTimeout }).should('exist');
    cy.wait(config.actionDelay * 2); // Extra wait for container to fully populate
    
    // Now check for pending user cards
    cy.get('#pending-users-container').then($container => {
      // Get all cards within the container
      const cards = $container.find('.card');
      const pendingCount = cards.length;
      
      cy.task('log', `Found ${pendingCount} pending users`);
      cy.screenshot('09-pending-users-count');
      
      // Determine how many users to approve
      const approveCount = Math.min(pendingCount, config.maxUsersToApprove);
      cy.task('log', `Will approve ${approveCount} users`);
      
      // If no users to approve, skip
      if (approveCount === 0) {
        cy.task('log', 'No pending users found to approve');
        return;
      }
      
      // Process each user
      cy.task('log', 'Starting approval process');
      for (let i = 0; i < approveCount; i++) {
        // We need to re-query the container each time because the DOM will change after each approval
        cy.get('#pending-users-container .card').eq(0).then($card => {
          // Extract user name for logging
          const userName = $card.find('h5, .card-title').first().text().trim();
          cy.task('log', `Approving user ${i+1}/${approveCount}: ${userName}`);
          
          // Find and click the approve button within this card
          cy.wrap($card).within(() => {
            cy.get('button.approve-user, .btn-success')
              .should('be.visible')
              .click({force: true});
          });
          
          // Wait for success notification
          cy.contains('User approved successfully', { timeout: config.verifyTimeout })
            .should('be.visible')
            .then(() => {
              approvedCount++;
              cy.task('log', `✓ Successfully approved ${userName}`);
              
              // Take a success screenshot
              cy.screenshot(`10-approved-user-${i+1}`);
              
              // Close notification
              cy.get('#close-notification').click({force: true});
              cy.wait(config.actionDelay * 3); // Extra long wait after approval
            });
        });
      }
      
      cy.task('log', `Completed approval process, approved ${approvedCount} users`);
    });
    
    // Step 4: Log out after approving users
    cy.get('body').then($body => {
      // Only logout if we have a logout button visible (meaning we're still logged in)
      if ($body.find('#btn-logout:visible').length > 0) {
        cy.task('log', 'Logging out');
        cy.get('#btn-logout').click({force: true});
        cy.wait(config.actionDelay);
        
        // Verify we're logged out
        cy.get('.logged-out', { timeout: config.verifyTimeout }).should('be.visible');
        cy.task('log', 'Successfully logged out');
      }
    });
  });
  
  afterEach(function() {
    // Capture screenshot on test failure
    if (this.currentTest.state === 'failed') {
      cy.task('log', `Test failed: ${this.currentTest.title}`);
      cy.screenshot('test-failure');
    }
  });
  
  after(() => {
    // Calculate duration
    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationFormatted = new Date(durationMs).toISOString().substr(11, 8);
    
    // Log results
    cy.task('log', '========================================');
    cy.task('log', '          APPROVAL SUMMARY              ');
    cy.task('log', '========================================');
    cy.task('log', `Total users approved: ${approvedCount}`);
    cy.task('log', `Failed approvals: ${failedCount}`);
    cy.task('log', `Total processing time: ${durationFormatted}`);
    cy.task('log', `Completed at: ${endTime.toLocaleString()}`);
    cy.task('log', '========================================');
    
    // Final screenshot
    cy.screenshot('final-state');
  });
  
  // No helper functions needed - all logic is inline in the test
});
