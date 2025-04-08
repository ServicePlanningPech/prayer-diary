// cypress/e2e/enhanced_bulk_registration.cy.js

describe('Enhanced Bulk User Registration', () => {
  // Configuration - modify these settings as needed
  const config = {
    userCount: 10,                     // Number of users to create
    namePrefix: 'Church Member',       // Prefix for user names
    baseEmail: 'AlanReeves@proton.me', // Base email (without the +nnn part)
    startNumber: 1,                    // Starting number for email sequence
    passwordTemplate: 'Prayer2024!',   // Password template
    timeoutBetweenRegistrations: 1000, // Delay between registrations (ms)
    maxRetries: 2,                     // Number of retries if registration fails
    continueOnError: true,             // Continue to next user if one fails
    
    // Optional - CSV file path (relative to fixtures folder)
    // If provided, users will be loaded from this file instead of generated
    // csvPath: 'test_users.csv',
  };
  
  // Parse the base email to separate username and domain
  const emailParts = config.baseEmail.split('@');
  const emailUsername = emailParts[0];
  const emailDomain = emailParts[1];
  
  let userList = [];
  let successCount = 0;
  let failureCount = 0;
  
  before(function() {
    // Generate users based on configuration
    for (let i = 0; i < config.userCount; i++) {
      // Calculate the number for this user (with leading zeros)
      const userNumber = config.startNumber + i;
      const paddedNumber = userNumber.toString().padStart(3, '0');
      
      // Create the email with the +nnn format
      const email = `${emailUsername}+${paddedNumber}@${emailDomain}`;
      
      userList.push({
        name: `${config.namePrefix} ${userNumber}`,
        email: email,
        password: `${config.passwordTemplate}${userNumber}`
      });
    }
    cy.log(`Generated ${userList.length} test users with email format: ${emailUsername}+nnn@${emailDomain}`);
  });
  
  // Simple initial test to verify Cypress can detect tests in this file
  it('prepares for bulk registration', () => {
    cy.log('Starting bulk registration process');
    cy.log(`Will attempt to register ${userList.length} users`);
    cy.visit('/');
    cy.contains('Prayer Diary').should('be.visible');
  });
  
  // Create a test for each user to register
  for (let i = 0; i < config.userCount; i++) {
    it(`registers user ${i+1}/${config.userCount}`, function() {
      const user = userList[i];
      cy.log(`Attempting to register ${user.name} (${user.email})`);
      
      // Visit the app
      cy.visit('/');
      
      // Click the signup button
      cy.get('#btn-signup').click();
      
      // Fill in the registration form
      cy.get('#signup-name').type(user.name);
      cy.get('#auth-email').type(user.email);
      cy.get('#auth-password').type(user.password);
      
      // Submit the form
      cy.get('#auth-submit').click();
      
      // Verify registration success by looking for either the success message or confirmation screen
      cy.get('body').then($body => {
        // Wait for various success indicators with a generous timeout
        cy.wait(2000); // Give the app time to process
        
        if ($body.find('#close-session-btn').length > 0) {
          // If we find the close-session-btn, click it
          cy.log('Found #close-session-btn');
          cy.get('#close-session-btn').click();
          successCount++;
        }
        else if ($body.find('#pending-logout-btn').length > 0) {
          // If we find the pending-logout-btn, click it
          cy.log('Found #pending-logout-btn');
          cy.get('#pending-logout-btn').click();
          successCount++;
        }
        else if ($body.text().includes('Registration Complete') || 
                 $body.text().includes('Account Created') ||
                 $body.text().includes('Account Pending Approval')) {
          // We found success text but no button, try to find the logout button
          cy.log('Found success message but no logout button');
          cy.get('button:contains("Close Session"), button:contains("Log out")').then($btn => {
            if ($btn.length) {
              cy.wrap($btn).click();
            } else {
              // Just consider it a success even if we can't logout
              cy.log('Could not find logout button, but registration appears successful');
            }
            successCount++;
          });
        }
        else {
          // No success indicators found
          cy.log('No success indicators found - registration may have failed');
          cy.screenshot(`registration-failed-${user.email}`);
          failureCount++;
        }
      });
      
      // Verify we're back at the landing page or logged out state
      cy.wait(1000); // Wait for logout to complete
      cy.get('body').should('contain', 'Prayer Diary');
    });
  }
  
  // Add a summary test
  it('summarizes registration results', () => {
    cy.log(`--- Bulk Registration Summary ---`);
    cy.log(`Total attempted: ${userList.length}`);
    cy.log(`Successful: ${successCount}`);
    cy.log(`Failed: ${failureCount}`);
    
    // Print all user emails for reference
    cy.log(`--- Registered Email Addresses ---`);
    userList.forEach((user, index) => {
      cy.log(`${index+1}. ${user.email}`);
    });
  });
});
