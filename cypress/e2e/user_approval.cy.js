// Cypress Studio Template with Slowdown Mechanism
// Use this template when recording interactions that need to run more slowly

describe('Studio Recording Template', () => {
  // Global slowdown settings
  const TYPING_DELAY = 150;  // Milliseconds between key presses
  const ACTION_DELAY = 300;  // Milliseconds between major actions
  const VERIFY_TIMEOUT = 10000; // Milliseconds to wait for elements/assertions
  
  // Helper functions that will be used with recorded commands
  function slowType(selector, text) {
    // Break text into chunks for more reliable typing
    const chunks = [];
    let currentChunk = '';
    
    // Create chunks of max 5 characters
    for (let i = 0; i < text.length; i++) {
      currentChunk += text[i];
      if (currentChunk.length >= 5 || i === text.length - 1) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    
    // Type each chunk with verification
    cy.get(selector).should('be.visible').click({force: true}).focus().clear();
    
    // Type chunks with verification between each
    chunks.forEach((chunk, index) => {
      cy.get(selector).type(chunk, { delay: TYPING_DELAY, force: true });
      cy.wait(ACTION_DELAY);
      
      // For all chunks except the last one, verify what we've typed so far
      if (index < chunks.length - 1) {
        const expectedText = chunks.slice(0, index + 1).join('');
        cy.get(selector).should('have.value', expectedText);
      }
    });
    
    // Final verification of the complete text
    cy.get(selector).should('have.value', text);
    cy.wait(ACTION_DELAY);
  }
  
  function slowClick(selector) {
    cy.wait(ACTION_DELAY);
    cy.get(selector).should('be.visible', { timeout: VERIFY_TIMEOUT }).click({ force: true });
    cy.wait(ACTION_DELAY);
  }
  
  beforeEach(() => {
    // Start with a clean visit and wait for page to load fully
    cy.visit('/', { timeout: VERIFY_TIMEOUT });
    cy.wait(1000);
    
    // Override Cypress commands for the duration of this test
    const originalType = cy.type;
    const originalClick = cy.click;
    
    // When Cypress Studio records type commands, they'll automatically be slower
    Cypress.Commands.overwrite('type', (originalFn, subject, text, options) => {
      // Apply our delay to all type commands unless specified otherwise
      const newOptions = { ...options, delay: options?.delay || TYPING_DELAY };
      return originalFn(subject, text, newOptions);
    });
    
    // When Cypress Studio records click commands, they'll be more reliable
    Cypress.Commands.overwrite('click', (originalFn, subject, options) => {
      // Add force option to all clicks unless specified otherwise
      const newOptions = { ...options, force: options?.force !== false };
      // Add a wait after each click
      const result = originalFn(subject, newOptions);
      cy.wait(ACTION_DELAY);
      return result;
    });
  });
  
  afterEach(() => {
    // Restore original commands after the test
    Cypress.Commands.overwrite('type', cy.type);
    Cypress.Commands.overwrite('click', cy.click);
  });
  
  it('runs recorded commands with proper timing', () => {
    // Your recording will be inserted here by Cypress Studio
    
    // Example of using our helper functions (delete these once you add your recording)
    cy.log('Start by clicking on the login button');
    
    // Demonstration of slowClick - replace with your actual recording
    slowClick('#btn-login');
    
    // Demonstration of slowType - replace with your actual recording
    slowType('#auth-email', 'example@example.com');
    
    // STUDIO RECORDING WILL BE ADDED HERE
    // Instructions:
    // 1. Look for "Add Commands to Test" button in Cypress runner
    // 2. Perform your actions in the application
    // 3. Save the recorded commands
    // 4. The recording will replace these example commands
  });
  
  // Optional: Add a second test for another recording
  it('has space for another recording', () => {
    // Second recording can go here
  });
});
