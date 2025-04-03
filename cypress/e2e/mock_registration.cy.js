// Import the Supabase auth mocks
import { setupSupabaseMocks } from '../support/mocks/auth';

describe('User Registration with Mocked Auth', () => {
  beforeEach(() => {
    // Visit the page first
    cy.visit('/');
    
    // Setup the auth mocks after the page loads
    setupSupabaseMocks();
  });
  
  it('successfully registers a new user with mocked auth', () => {
    // Click the signup button
    cy.get('#btn-signup').click();
    
    // The modal should appear
    cy.get('#auth-modal').should('be.visible');
    
    // Fill in the registration form
    cy.get('#signup-name').type('Test User');
    cy.get('#auth-email').type('mock-test@example.com');
    cy.get('#auth-password').type('SecurePassword123!');
    
    // Submit the form
    cy.get('#auth-submit').click();
    
    // Since we've mocked the auth, we should see success message
    cy.contains('Account Created', { timeout: 10000 }).should('be.visible');
  });
});