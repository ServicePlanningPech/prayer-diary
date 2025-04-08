describe('Bulk User Registration', () => {
  // Number of test users to create
  const userCount = 5;
  
  // Email configuration
  const emailUsername = 'AlanReeves';
  const emailDomain = 'proton.me';
  const startingNumber = 1; // Will be padded to 001
  
  // Create multiple test users
  for (let i = 0; i < userCount; i++) {
    it(`registers test user #${i+1}`, () => {
      // Calculate the sequential number with padding
      const userNumber = startingNumber + i;
      const paddedNumber = userNumber.toString().padStart(3, '0');
      
      const testUser = {
        name: `Test User ${userNumber}`,
        email: `${emailUsername}+${paddedNumber}@${emailDomain}`,
        password: `Prayer2024!${userNumber}`
      };
      
      // Log the email being used
      cy.log(`Registering with email: ${testUser.email}`);
      
      // Use our custom command to register a user
      cy.registerUser(testUser.name, testUser.email, testUser.password);
      
      // Log out after registration
      cy.get('#pending-logout-btn').click();
      
      // Verify we're logged out
      cy.contains('Please log in or sign up').should('be.visible');
    });
  }
  
  // Optional: Display summary after all tests
  after(() => {
    cy.log('--- Email Summary ---');
    for (let i = 0; i < userCount; i++) {
      const userNumber = startingNumber + i;
      const paddedNumber = userNumber.toString().padStart(3, '0');
      cy.log(`${i+1}. ${emailUsername}+${paddedNumber}@${emailDomain}`);
    }
  });
});
