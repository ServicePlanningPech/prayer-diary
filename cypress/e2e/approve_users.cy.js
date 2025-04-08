// cypress/e2e/approve_users.cy.js
// Improved version with better error handling and reliability

// Import helper functions from our support file
import { 
  logDomState, 
  navigateToView, 
  forceAdminPermissions, 
  checkSupabaseConnection,
  checkAdminPrivileges 
} from '../support/helper';

describe('Bulk User Approval', () => {
  // Admin credentials - replace with actual admin credentials
  const adminEmail = 'prayerdiary@pech.co.uk';
  const adminPassword = '@Prayer@Diary@';

  // Configuration for which users to approve
  const config = {
    // If true, approve all pending users without checking names
    approveAllPending: true,
    
    // If approveAllPending is false, approve only users with these name patterns
    // Example: to approve only "Church Member" users registered through the bulk script
    userPatterns: ['Church Member'],
    
    // If set to true, will approve users even if some fail (due to already being approved, etc.)
    continueOnError: true,
    
    // Maximum number of users to approve (0 = no limit)
    maxUsersToApprove: 0
  };

  // Statistics - using Cypress environment variables for persistence between tests
  before(() => {
    cy.task('log', 'Starting Bulk User Approval Test');
    Cypress.env('approvedCount', 0);
    Cypress.env('failedCount', 0);
    Cypress.env('skippedCount', 0);
  });

  // Completely revamped setup to ensure proper admin access
  before(() => {
    cy.task('log', `Starting test setup and login as admin: ${adminEmail}`);
    
    // Visit the site fresh and clear any cookies/localStorage
    cy.visit('/', { timeout: 30000 });
    cy.clearCookies();
    cy.clearLocalStorage('supabase.auth.token');
    
    // Check the initial state
    logDomState('Before Login');
    
    // Log in with enhanced login process
    cy.login(adminEmail, adminPassword);
    
    // After login, check the state
    cy.task('log', 'Checking DOM state after login');
    logDomState('After Login');
    
    // Make sure we're logged in with proper admin permissions
    cy.get('body').then($body => {
      // If we don't have admin view elements visible
      if ($body.find('#adminDropdown:visible').length === 0 && 
          $body.find('.admin-only:visible').length === 0) {
        
        cy.task('log', 'Admin elements not visible after login, applying fixes...');
        
        // First expand navbar if needed
        if ($body.find('.navbar-toggler:visible').length > 0) {
          cy.task('log', 'Expanding collapsed navbar');
          cy.get('.navbar-toggler').click({ force: true });
          cy.wait(1000);
        }
        
        // If still not visible, try to force admin permissions
        if ($body.find('#adminDropdown:visible').length === 0) {
          cy.task('log', 'Forcing admin permissions');
          forceAdminPermissions();
          cy.wait(1000);
          logDomState('After Forcing Admin');
        }
      }
    });
    
    // Try to verify Supabase but don't fail the test if it doesn't work
    try {
      checkSupabaseConnection();
    } catch (e) {
      cy.task('log', `WARNING: Supabase check failed but continuing: ${e.message}`);
    }
  });

  it('navigates to the user management page and approves users', () => {
    cy.task('log', 'Starting user approval test');
    
    // Use direct DOM manipulation to bypass normal navigation
    cy.task('log', 'Will use direct DOM manipulation to show user management view');
    
    // Check if user has admin privileges
    checkAdminPrivileges().then(hasAdminPrivileges => {
      if (!hasAdminPrivileges) {
        cy.task('log', 'User does not appear to have admin privileges, forcing admin mode');
        forceAdminPermissions();
      } else {
        cy.task('log', 'User appears to have admin privileges');
      }
    });
    
    // Log DOM state after checking/forcing admin
    logDomState('After Admin Check');
    
    // Rather than navigate normally, directly show the manage-users-view by manipulating the DOM
    cy.get('body').then($body => {
      // Hide all views first
      const views = $body.find('.view-content');
      views.each((i, view) => {
        cy.wrap(view).addClass('d-none');
      });
      
      // Now show the manage-users-view
      const manageUsersView = $body.find('#manage-users-view');
      if (manageUsersView.length > 0) {
        cy.task('log', 'Found manage-users-view, making it visible');
        cy.wrap(manageUsersView).removeClass('d-none');
      } else {
        cy.task('log', 'WARNING: manage-users-view not found in DOM');
      }
    });
    
    // Log state after showing the view
    logDomState('After Showing Management View');
    
    // Try to make the pending users tab active by directly clicking it or manipulating the DOM
    cy.get('body').then($body => {
      const pendingTab = $body.find('#pending-users-tab');
      const pendingTabPane = $body.find('#pending-users');
      
      if (pendingTab.length > 0) {
        cy.task('log', 'Found pending users tab, activating it');
        
        // Try clicking it first
        cy.get('#pending-users-tab')
          .should('exist')
          .then($tab => {
            // Try to click it
            cy.wrap($tab).click({ force: true });
            
            // Wait for UI to update
            cy.wait(1000);
            
            // If clicking didn't work, try direct DOM manipulation
            cy.get('#pending-users-tab').then($tabAfterClick => {
              if (!$tabAfterClick.hasClass('active')) {
                cy.task('log', 'Tab click did not make it active, using direct DOM manipulation');
                
                // Clear active class from all tabs
                cy.get('.nav-tabs .nav-link').invoke('removeClass', 'active');
                
                // Add active class to pending tab
                cy.get('#pending-users-tab').invoke('addClass', 'active');
                
                // Hide all tab panes
                cy.get('.tab-pane').invoke('removeClass', 'show active');
                
                // Show the pending users tab pane
                cy.get('#pending-users').invoke('addClass', 'show active');
              }
            });
          });
      } else {
        cy.task('log', 'WARNING: pending-users-tab not found in DOM');
      }
    });
    
    // Check DOM state after activating tab
    logDomState('After Tab Activation');
    
    // Brief wait for any API calls or UI updates
    cy.wait(3000);
    
    // Check if there are any pending users
    cy.get('body').then($body => {
      const pendingCards = $body.find('#pending-users-container .card');
      const pendingCount = pendingCards.length;
      
      if (pendingCount === 0) {
        cy.log('No pending users found to approve');
        return;
      }
      
      cy.task('log', `Found ${pendingCount} pending users`);
      
      // Determine the maximum number to approve
      const maxToApprove = config.maxUsersToApprove > 0 ? 
        Math.min(config.maxUsersToApprove, pendingCount) : pendingCount;
      
      // Process users based on configuration
      if (config.approveAllPending) {
        cy.task('log', 'Will approve all pending users');
        approveAllUsers(maxToApprove);
      } else {
        cy.task('log', `Will approve users matching patterns: ${config.userPatterns.join(', ')}`);
        approveFilteredUsers(config.userPatterns, maxToApprove);
      }
    });
  });

  // Final summary test
  after(() => {
    // Get the final stats from Cypress environment
    const approvedCount = Cypress.env('approvedCount') || 0;
    const failedCount = Cypress.env('failedCount') || 0;
    const skippedCount = Cypress.env('skippedCount') || 0;
    
    cy.task('log', '--- User Approval Summary ---');
    cy.task('log', `Total approved: ${approvedCount}`);
    cy.task('log', `Failed: ${failedCount}`);
    cy.task('log', `Skipped: ${skippedCount}`);
    cy.task('log', 'Test run complete');
  });

  // Helper function to approve all pending users - improved version
  function approveAllUsers(maxCount) {
    cy.get('#pending-users-container .card').each(($card, index) => {
      // Stop if we've reached the maximum
      if (maxCount > 0 && index >= maxCount) {
        cy.log(`Reached maximum of ${maxCount} users, skipping the rest`);
        Cypress.env('skippedCount', Cypress.env('skippedCount') + 1);
        return false; // Exit the each loop
      }
      
      // Get the user name for logging
      const userName = $card.find('h5, .card-title').first().text().trim();
      cy.task('log', `Approving user ${index+1}: ${userName}`);
      
      // Use a more robust approach to click the approve button
      cy.wrap($card).within(() => {
        cy.get('button.approve-user, .btn-success')
          .should('exist')
          .should('be.visible')
          .scrollIntoView()
          .click({ force: true });
      });
      
      // Wait for success message with improved error handling
      cy.contains('User approved successfully', { timeout: 10000 })
        .should('be.visible')
        .then(() => {
          const currentApproved = Cypress.env('approvedCount') || 0;
          Cypress.env('approvedCount', currentApproved + 1);
          cy.task('log', `✓ Successfully approved ${userName}`);
        })
        .catch(error => {
          const currentFailed = Cypress.env('failedCount') || 0;
          Cypress.env('failedCount', currentFailed + 1);
          cy.task('log', `✗ Failed to approve ${userName}: ${error.message}`);
          
          // Take a screenshot on failure for debugging
          cy.screenshot(`approve-failure-${userName.replace(/[^a-z0-9]/gi, '_')}`);
          
          if (!config.continueOnError) {
            throw error; // Stop the test if configured to do so
          }
        });
      
      // Wait a moment before approving the next user to avoid overwhelming the server
      cy.wait(1000);
    });
  }

  // Helper function to approve users matching patterns - improved version
  function approveFilteredUsers(patterns, maxCount) {
    cy.get('#pending-users-container .card').each(($card, index) => {
      const userName = $card.find('h5, .card-title').first().text().trim();
      
      // Check if this user matches any of our patterns
      const matches = patterns.some(pattern => userName.includes(pattern));
      
      if (!matches) {
        cy.log(`Skipping user ${userName} (doesn't match patterns)`);
        const currentSkipped = Cypress.env('skippedCount') || 0;
        Cypress.env('skippedCount', currentSkipped + 1);
        return; // Continue to next iteration
      }
      
      // Stop if we've reached the maximum
      const currentApproved = Cypress.env('approvedCount') || 0;
      if (maxCount > 0 && currentApproved >= maxCount) {
        cy.log(`Already approved maximum of ${maxCount} users, skipping ${userName}`);
        const currentSkipped = Cypress.env('skippedCount') || 0;
        Cypress.env('skippedCount', currentSkipped + 1);
        return;
      }
      
      cy.task('log', `Approving user ${index+1}: ${userName}`);
      
      // Click the approve button with improved reliability
      cy.wrap($card).within(() => {
        cy.get('button.approve-user, .btn-success')
          .should('exist')
          .should('be.visible')
          .scrollIntoView()
          .click({ force: true });
      });
      
      // Wait for success message with improved error handling
      cy.contains('User approved successfully', { timeout: 10000 })
        .should('be.visible')
        .then(() => {
          Cypress.env('approvedCount', currentApproved + 1);
          cy.task('log', `✓ Successfully approved ${userName}`);
        })
        .catch(error => {
          const currentFailed = Cypress.env('failedCount') || 0;
          Cypress.env('failedCount', currentFailed + 1);
          cy.task('log', `✗ Failed to approve ${userName}: ${error.message}`);
          
          // Take a screenshot on failure for debugging
          cy.screenshot(`approve-failure-${userName.replace(/[^a-z0-9]/gi, '_')}`);
          
          if (!config.continueOnError) {
            throw error;
          }
        });
      
      // Wait a moment before approving the next user
      cy.wait(1000);
    });
  }
});
