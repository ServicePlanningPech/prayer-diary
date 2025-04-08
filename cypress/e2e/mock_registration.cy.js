// Import the Supabase auth mocks
import { setupSupabaseMocks } from '../support/mocks/auth';

describe('User Registration with Mocked Auth', () => {
  // Email configuration - using the same format for consistency
  const emailUsername = 'AlanReeves';
  const emailDomain = 'proton.me';
  const mockNumber = '999'; // Use 999 for mock testing to avoid conflicts
  const mockEmail = `${emailUsername}+${mockNumber}@${emailDomain}`;
  
  beforeEach(() => {
    // Visit the page first
    cy.visit('/');
    
    // Setup the auth mocks after the page loads
    setupSupabaseMocks();
    
    // Log the mock email being used
    cy.log(`Using mock email: ${mockEmail}`);
  });
  
  it('successfully registers a new user with mocked auth', () => {
    // Click the signup button
    cy.get('#btn-signup').click();
    
    // The modal should appear
    cy.get('#auth-modal').should('be.visible');
    
    // Fill in the registration form with the standardized email format
    cy.get('#signup-name').type('Mock Test User');
    cy.get('#auth-email').type(mockEmail);
    cy.get('#auth-password').type('Prayer2024!999');
    
    // Submit the form
    cy.get('#auth-submit').click();
    
    // Since we've mocked the auth, we should see success message
    cy.contains('Account Created', { timeout: 10000 }).should('be.visible');
  });
});
