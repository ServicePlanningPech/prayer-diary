describe('Bulk User Registration', () => {
  // Number of test users to create
  const userCount = 5;
  const timestamp = Date.now();
  
  // Create multiple test users
  for (let i = 0; i < userCount; i++) {
    it(`registers test user #${i+1}`, () => {
      const testUser = {
        name: `Bulk Test User ${i+1}`,
        email: `bulkuser${timestamp}_${i}@example.com`,
        password: 'SecurePassword123!'
      };
      
      // Use our custom command to register a user
      cy.registerUser(testUser.name, testUser.email, testUser.password);
      
      // Log out after registration
      cy.get('#pending-logout-btn').click();
      
      // Verify we're logged out
      cy.contains('Please log in or sign up').should('be.visible');
    });
  }
});
