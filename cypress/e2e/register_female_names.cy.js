// cypress/e2e/enhanced_bulk_registration_with_csv.cy.js

describe('Enhanced Bulk User Registration with CSV Names', { retries: 0 }, () => {
  // Configuration - modify these settings as needed
  const config = {
    userCount: 50,                     // Number of users to create
    baseEmail: 'AlanReeves@proton.me', // Base email (without the +nnn part)
    startNumber: 51,                    // Starting number for email sequence
    passwordTemplate: 'Prayer2024!',   // Password template
    timeoutBetweenRegistrations: 1000, // Delay between registrations (ms)
    maxRetries: 0,                     // Number of retries if registration fails
    continueOnError: true,             // Continue to next user if one fails
    
    // CSV file path (relative to fixtures folder) containing male names
    csvPath: 'femaleNameList.csv',
  };
  
  // Parse the base email to separate username and domain
  const emailParts = config.baseEmail.split('@');
  const emailUsername = emailParts[0];
  const emailDomain = emailParts[1];
  
  let userList = [];
  let successCount = 0;
  let failureCount = 0;
  
  before(function() {
    // Load names from CSV file
    cy.fixture(config.csvPath).then((csvContent) => {
      // Parse CSV content (simple parsing since it's a single column)
      const lines = csvContent.split('\n');
      // Skip header row and empty lines
      const names = lines.filter(line => line.trim() && line.trim() !== 'Name');
      
      cy.log(`Loaded ${names.length} names from CSV file`);
      
      // Generate users based on configuration and CSV names
      for (let i = 0; i < config.userCount; i++) {
        // Calculate the number for this user (with leading zeros)
        const userNumber = config.startNumber + i;
        const paddedNumber = userNumber.toString().padStart(3, '0');
        
        // Create the email with the +nnn format
        const email = `${emailUsername}+${paddedNumber}@${emailDomain}`;
        
        // Use the CSV name, or cycle through if we have more users than names
        const nameIndex = i % names.length;
		cy.log(`nameIndex=${nameIndex}`);
        const name = names[nameIndex].trim();
		cy.log(`NAME=${name}`);
        
        userList.push({
          name: name,
          email: email,
          password: `${config.passwordTemplate}${userNumber}`
        });
      }
      cy.log(`Generated ${userList.length} test users with email format: ${emailUsername}+nnn@${emailDomain}`);
    });
  });
  
  // Simple initial test to verify Cypress can detect tests in this file
  it('prepares for bulk registration', () => {
    cy.log('Starting bulk registration process');
    cy.log(`Will attempt to register ${userList.length} users`);
    cy.visit('https://serviceplanningpech.github.io/prayer-diary');
    cy.contains('PECH Prayer').should('be.visible');
  });
  
  // Create a test for each user to register
  for (let i = 0; i < config.userCount; i++) {
    it(`registers user ${i+1}/${config.userCount}`, function() {
      // Skip test if userList isn't populated yet (should be populated in before())
      if (userList.length <= i) {
        cy.log(`User list not fully populated. Skipping user ${i+1}.`);
        this.skip();
        return;
      }
      
      const user = userList[i];
      cy.log(`Attempting to register ${user.name} (${user.email})`);
      
      // Visit the app and ensure we're starting from a clean state
      cy.visit('https://serviceplanningpech.github.io/prayer-diary');
      cy.wait(3000);
      
      // Make sure we're logged out by checking for login button
      cy.get('#auth-modal').should('be.visible');
      cy.get('#auth-switch').click();
      
      // Fill in the registration form
      cy.get('#signup-name').type(user.name);
      cy.get('#auth-email').type(user.email);
      cy.get('#auth-password').type(user.password);
      cy.get('#auth-confirm-password').type(user.password);
      
      // Wait for the form validation to enable the submit button
      cy.get('#auth-submit').should('not.be.disabled');
      
      // Submit the form
      cy.get('#auth-submit').click();
      
      // Wait for potential responses (success or error)
      cy.wait(3000);
      
      // Check for success or failure
      cy.get('body').then($body => {
        // Check for success message
        if ($body.text().includes('Registration Complete!')) {
          successCount++;
          cy.log('Registration successful for user:', user.email);
          
          // Try to find and click the close session button
          if ($body.find('#close-session-btn').length > 0) {
            cy.get('#close-session-btn').click();
          } else if ($body.find('#pending-logout-btn').length > 0) {
            cy.get('#pending-logout-btn').click();
          } else {
            // Try other logout buttons
            cy.log('Looking for alternative logout buttons');
            cy.get('button:contains("Close Session"), button:contains("Log out")').then($altBtn => {
              if ($altBtn.length) {
                cy.wrap($altBtn).first().click();
              } else {
                cy.log('No logout button found, but registration was successful');
              }
            });
          }
        } else {
          // Check for error message
          if ($body.find('#auth-error').is(':visible')) {
            cy.get('#auth-error').then($error => {
              cy.log('Error shown during registration:', $error.text());
            });
          } else {
            cy.log('No success or error message found for user:', user.email);
          }
          
          // Take screenshot and increment failure counter
          cy.screenshot(`registration-failed-${user.email}`);
          failureCount++;
        }
      });
      
      // Verify we're back at the landing page or logged out state - using a more robust approach
      cy.get('body', { timeout: 5000 }).then($body => {
        // If we see login button, we're in the right state
        if (!$body.find('#btn-login').is(':visible')) {
          // If not found, force a reload to get to clean state
          cy.log('Login button not visible, reloading page to clean state');
          cy.reload();
          cy.wait(1000);
        }
      });
    });
  }
  
  // Add a summary test
  it('summarizes registration results', () => {
    cy.log(`--- Bulk Registration Summary ---`);
    cy.log(`Total attempted: ${userList.length}`);
    cy.log(`Successful: ${successCount}`);
    cy.log(`Failed: ${failureCount}`);
    cy.log(`Success rate: ${(successCount / userList.length * 100).toFixed(2)}%`);
    
    // Determine overall test result
    if (failureCount > 0) {
      cy.log(`⚠️ WARNING: ${failureCount} registrations failed`);
    } else {
      cy.log(`✅ SUCCESS: All ${userList.length} users registered successfully`);
    }
    
    // Print all user emails for reference
    cy.log(`--- Registered Email Addresses ---`);
    userList.forEach((user, index) => {
      cy.log(`${index+1}. ${user.name} (${user.email})`);
    });
  });
});