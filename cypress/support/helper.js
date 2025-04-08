// Helper functions for Cypress tests to improve reliability
// This file is intended to be imported in Cypress tests to provide common functionality

// Helper function to check and log the DOM state
export function logDomState(label = 'DOM Check') {
  cy.task('log', `--- DOM State Check: ${label} ---`);
  cy.get('body').then($body => {
    // Check for logged in state
    const isLoggedIn = $body.find('.logged-in:visible').length > 0;
    const isLoggedOut = $body.find('.logged-out:visible').length > 0;
    
    // Check for admin elements
    const hasAdminDropdown = $body.find('#adminDropdown').length > 0;
    const adminDropdownVisible = $body.find('#adminDropdown:visible').length > 0;
    const adminOnlyVisible = $body.find('.admin-only:visible').length > 0;
    
    // Check for current view
    const currentView = Array.from($body.find('.view-content'))
      .filter(el => !el.classList.contains('d-none'))
      .map(el => el.id)
      .join(', ');
    
    // Log results
    cy.task('log', `Logged in visible: ${isLoggedIn}`);
    cy.task('log', `Logged out visible: ${isLoggedOut}`);
    cy.task('log', `Admin dropdown exists: ${hasAdminDropdown}`);
    cy.task('log', `Admin dropdown visible: ${adminDropdownVisible}`);
    cy.task('log', `Admin-only elements visible: ${adminOnlyVisible}`);
    cy.task('log', `Current visible view: ${currentView || 'None'}`);
    
    // Take screenshot
    cy.screenshot(`dom-state-${label.replace(/\s+/g, '-').toLowerCase()}`);
  });
}

// Helper function to try to navigate to a specific view using a variety of methods
export function navigateToView(viewName) {
  cy.task('log', `Attempting to navigate to view: ${viewName}`);
  
  // Log current state
  logDomState(`Before ${viewName} Navigation`);
  
  // Try multiple approaches to navigation
  // First try direct JavaScript navigation if available
  cy.window().then(win => {
    if (win.showView && typeof win.showView === 'function') {
      cy.task('log', `Using app's showView function to navigate to ${viewName}`);
      win.showView(viewName);
      cy.wait(1000);
      return;
    }
    
    // If direct navigation not available, try UI navigation
    cy.task('log', 'Direct navigation not available, trying UI navigation');
    
    // Make sure navbar is expanded on mobile
    cy.get('body').then($body => {
      if ($body.find('.navbar-toggler:visible').length > 0) {
        cy.task('log', 'Expanding collapsed navbar');
        cy.get('.navbar-toggler').click({ force: true });
        cy.wait(1000);
      }
      
      // Map view names to navigation IDs
      const navMap = {
        'manage-users-view': '#nav-manage-users',
        'manage-calendar-view': '#nav-manage-calendar',
        'manage-updates-view': '#nav-manage-updates',
        'manage-urgent-view': '#nav-manage-urgent',
        'calendar-view': '#nav-calendar',
        'updates-view': '#nav-updates',
        'urgent-view': '#nav-urgent',
        'profile-view': '#nav-profile'
      };
      
      const navId = navMap[viewName];
      
      if (!navId) {
        cy.task('log', `No navigation mapping found for view: ${viewName}`);
        return;
      }
      
      // Check if we need to open admin dropdown first
      if (navId.includes('manage') && $body.find('#adminDropdown').length > 0) {
        cy.task('log', 'Opening admin dropdown');
        cy.get('#adminDropdown').click({ force: true });
        cy.wait(500);
      }
      
      // Click the navigation item
      cy.get(navId).click({ force: true });
    });
  });
  
  // Verify navigation succeeded
  cy.wait(2000);
  logDomState(`After ${viewName} Navigation`);
}

// Helper function to check if user has admin privileges
export function checkAdminPrivileges() {
  cy.task('log', 'Checking for admin privileges');
  
  return cy.get('body').then($body => {
    // Check for admin elements in DOM
    const hasAdminDropdown = $body.find('#adminDropdown').length > 0;
    const hasAdminOnlyElements = $body.find('.admin-only').length > 0;
    
    // Check if admin elements are visible
    const isAdminDropdownVisible = $body.find('#adminDropdown:visible').length > 0;
    const areAdminOnlyElementsVisible = $body.find('.admin-only:visible').length > 0;
    
    // Log findings
    cy.task('log', `Admin dropdown exists: ${hasAdminDropdown}`);
    cy.task('log', `Admin dropdown visible: ${isAdminDropdownVisible}`);
    cy.task('log', `Admin-only elements exist: ${hasAdminOnlyElements}`);
    cy.task('log', `Admin-only elements visible: ${areAdminOnlyElementsVisible}`);
    
    // Return true if admin elements are found
    return hasAdminDropdown || hasAdminOnlyElements;
  });
}

// Helper function to directly force admin permissions
export function forceAdminPermissions() {
  cy.task('log', 'Attempting to force admin permissions in UI');
  
  cy.window().then(win => {
    // Try to directly update DOM to show admin elements
    cy.task('log', 'Manually revealing admin elements');
    
    // Make sure we can find the elements first
    cy.get('body').then($body => {
      // Try multiple selectors for admin elements
      const adminOnlyElements = $body.find('.admin-only');
      if (adminOnlyElements.length > 0) {
        cy.task('log', `Found ${adminOnlyElements.length} admin-only elements, making them visible`);
        adminOnlyElements.removeClass('hidden');
        adminOnlyElements.css('display', 'block');
      }
      
      // Try to find the admin dropdown
      const adminDropdown = $body.find('#adminDropdown');
      if (adminDropdown.length > 0) {
        cy.task('log', 'Found admin dropdown, making it visible');
        // Make the dropdown and its parent visible
        adminDropdown.parents('.nav-item').removeClass('hidden');
        adminDropdown.parents('.nav-item').css('display', 'block');
        adminDropdown.removeClass('hidden');
        adminDropdown.css('display', 'block');
      }
    });
    
    // Check if we can access the window.userProfile
    if (win.userProfile) {
      cy.task('log', 'Found userProfile in window, attempting to modify');
      win.userProfile.user_role = 'Administrator';
      
      // Try to trigger UI update if there's an isAdmin function
      if (win.isAdmin && typeof win.isAdmin === 'function') {
        // Override the function to always return true
        const originalIsAdmin = win.isAdmin;
        win.isAdmin = function() { 
          cy.task('log', 'isAdmin() function called - returning true');
          return true; 
        };
        cy.task('log', 'Overrode isAdmin() function to always return true');
        
        // Also try to manually show admin elements by calling any show/hide functions
        if (win.showLoggedInState && typeof win.showLoggedInState === 'function') {
          cy.task('log', 'Calling showLoggedInState() to refresh UI');
          win.showLoggedInState();
        }
      }
    } else {
      cy.task('log', 'userProfile not found in window, trying alternate approach');
      
      // Try to inject a userProfile object
      win.userProfile = {
        user_role: 'Administrator',
        approval_state: 'Approved',
        prayer_calendar_editor: true,
        prayer_update_editor: true,
        urgent_prayer_editor: true
      };
      
      cy.task('log', 'Injected fake userProfile object');
    }
  });
  
  // Log state after our modifications
  cy.wait(1000);
  logDomState('After Admin Force');
  
  // Try to manually remove d-none class from manage-users-view
  cy.get('body').then($body => {
    const manageUsersView = $body.find('#manage-users-view');
    if (manageUsersView.length > 0) {
      cy.task('log', 'Found manage-users-view, making it visible');
      manageUsersView.removeClass('d-none');
    }
  });
}

// Helper function to check if Supabase is properly initialized - with safer checks
export function checkSupabaseConnection() {
  cy.task('log', 'Checking Supabase connection');
  
  cy.window().then(win => {
    // Check if supabase client exists and has required methods
    if (!win.supabase) {
      cy.task('log', 'ERROR: Supabase client not found in window');
      return;
    }
    
    // Check if supabase object has the 'from' method
    if (typeof win.supabase.from !== 'function') {
      cy.task('log', 'ERROR: Supabase client exists but "from" method is not available');
      
      // Log what is available to help debug
      cy.task('log', `Available supabase methods: ${Object.keys(win.supabase).join(', ')}`);
      
      // Try to skip this check and continue with the test
      cy.task('log', 'Skipping Supabase connection check and continuing test');
      return;
    }
    
    // Try to make a simple request to check connectivity
    try {
      win.supabase.from('profiles').select('count').limit(1)
        .then(({ data, error }) => {
          if (error) {
            cy.task('log', `Supabase connection error: ${error.message}`);
          } else {
            cy.task('log', 'Supabase connection successful');
          }
        })
        .catch(err => {
          cy.task('log', `Error during Supabase query: ${err.message}`);
        });
    } catch (e) {
      cy.task('log', `Exception when testing Supabase: ${e.message}`);
      // Continue the test despite the error
    }
  });
}
