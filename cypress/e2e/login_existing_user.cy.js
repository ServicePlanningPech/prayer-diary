describe('Login with Existing Test User', () => {
  // Use a dedicated test account that already exists in your database
  const testUser = {
    email: 'testuser@example.com', // Replace with an actual test account
    password: 'TestPassword123!' // Replace with the actual password
  };
  
  it('can login with existing test account', () => {
    // Visit the app
    cy.visit('/');
    
    // Click the login button
    cy.get('#btn-login').click();
    
    // The modal should appear
    cy.get('#auth-modal').should('be.visible');
    
    // Fill in the login form
    cy.get('#auth-email').type(testUser.email);
    cy.get('#auth-password').type(testUser.password);
    
    // Submit the form
    cy.get('#auth-submit').click();
    
    // Verify successful login - adjust selectors as needed
    cy.get('.logged-in', { timeout: 10000 }).should('be.visible');
  });
});