describe('Password Reset Flow', () => {
  // Use an existing test account that you have full control over
  const testUser = {
    email: 'testuser@example.com', // Replace with an actual test account
    password: 'TestPassword123!',
    newPassword: 'NewPassword456!' // Different password for reset
  };
  
  it('can request a password reset', () => {
    // Request password reset
    cy.requestPasswordReset(testUser.email);
    
    // Verify we can close the modal
    cy.get('button[data-bs-dismiss="modal"]').click();
    
    // Verify we're back to the main screen
    cy.contains('Please log in or sign up').should('be.visible');
  });
  
  it('can complete a password reset', () => {
    // This test simulates clicking on the reset link from email
    cy.completePasswordReset(testUser.newPassword);
    
    // At this point, the app has reloaded and should show the login screen
    // Try logging in with the new password
    cy.get('#btn-login').should('be.visible').click();
    cy.get('#auth-email').type(testUser.email);
    cy.get('#auth-password').type(testUser.newPassword);
    cy.get('#auth-submit').click();
    
    // Verify successful login
    cy.get('.logged-in', { timeout: 10000 }).should('be.visible');
    
    // Clean up - reset back to original password
    // This assumes you have a way to change passwords when logged in
    // If not, you'd need to run another password reset flow
  });
});