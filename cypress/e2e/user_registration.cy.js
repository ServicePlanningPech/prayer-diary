describe('User Registration Flow', () => {
  // Generate a truly unique email for each test run
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `testuser${timestamp}_${randomString}@example.com`,
    password: 'SecurePassword123!'
  };
  
  it('allows a new user to register', () => {
    // Visit the app
    cy.visit('/');
    
    // Click the signup button
    cy.get('#btn-signup').click();
    
    // The modal should appear
    cy.get('#auth-modal').should('be.visible');
    
    // Fill in the registration form
    cy.get('#signup-name').type(testUser.name);
    cy.get('#auth-email').type(testUser.email);
    cy.get('#auth-password').type(testUser.password);
    
    // Submit the form
    cy.get('#auth-submit').click();
    
    // Verify success message appears
    cy.contains('Account Created').should('be.visible');
    
    // If you want to test logout too
    cy.get('#pending-logout-btn').click();
    
    // Verify we're logged out and back at the landing page
    cy.contains('Please log in or sign up').should('be.visible');
  });
  
  // This test requires an admin user to be available
  it.skip('admin can approve the new user', () => {
    // Log in as admin - update with actual admin credentials
    cy.login('admin@example.com', 'adminPassword');
    
    // Approve the user we just created
    cy.approveUser(testUser.name);
    
    // Log out
    cy.logout();
  });
});