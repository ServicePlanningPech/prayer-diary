// Slow and deliberate login test with explicit waits and verifications

describe('Slow and Deliberate Login', () => {
  // Admin credentials
  const adminEmail = 'prayerdiary@pech.co.uk';
  const adminPassword = '@Prayer@Diary@';

  beforeEach(() => {
    // Start with a clean visit to the app with increased timeout
    cy.visit('/', { timeout: 10000 });
    cy.wait(1000); // Wait for page to fully load
  });

  it('logs in with slow and deliberate typing', () => {
    // Click the login button with wait before and after
    cy.wait(500);
    cy.get('#btn-login').should('be.visible').click({force: true});
    cy.wait(1000); // Wait for modal animation to complete
    
    // Verify modal is displayed before continuing
    cy.get('#auth-modal').should('be.visible');
    cy.wait(500); // Extra wait for modal stability
    
    // ===== EMAIL FIELD =====
    // Clear and focus the email field with explicit verification
    cy.get('#auth-email')
      .should('be.visible')
      .click({force: true})
      .focus()
      .clear({force: true})
      .should('have.value', ''); // Verify it's cleared
    
    cy.wait(500); // Wait before typing
    
    // Type email VERY slowly, one character at a time with verification
    const emailChars = adminEmail.split('');
    
    // Type first half of email
    const firstHalf = emailChars.slice(0, Math.floor(emailChars.length / 2)).join('');
    cy.get('#auth-email').type(firstHalf, { delay: 200, force: true });
    cy.wait(500);
    cy.get('#auth-email').should('have.value', firstHalf);
    
    // Type second half of email
    const secondHalf = emailChars.slice(Math.floor(emailChars.length / 2)).join('');
    cy.get('#auth-email').type(secondHalf, { delay: 200, force: true });
    cy.wait(500);
    
    // Verify full email is entered before continuing
    cy.get('#auth-email').should('have.value', adminEmail);
    cy.wait(1000); // Extra wait after email entry
    
    // ===== PASSWORD FIELD =====
    // Explicitly click and focus the password field
    cy.get('#auth-password')
      .should('be.visible')
      .click({force: true})
      .focus()
      .clear({force: true})
      .should('have.value', ''); // Verify it's cleared
    
    cy.wait(500); // Wait before typing
    
    // Type password slowly, half at a time
    const pwdChars = adminPassword.split('');
    const pwdFirstHalf = pwdChars.slice(0, Math.floor(pwdChars.length / 2)).join('');
    const pwdSecondHalf = pwdChars.slice(Math.floor(pwdChars.length / 2)).join('');
    
    cy.get('#auth-password').type(pwdFirstHalf, { delay: 200, force: true });
    cy.wait(500);
    cy.get('#auth-password').type(pwdSecondHalf, { delay: 200, force: true });
    cy.wait(500);
    
    // Verify password is entered before submitting
    cy.get('#auth-password').should('have.value', adminPassword);
    cy.wait(1000); // Extra wait after password entry
    
    // ===== SUBMIT LOGIN =====
    // Click the submit button with force option
    cy.get('#auth-submit').should('be.visible').click({force: true});
    
    // Wait for login with increased timeout
    cy.get('.logged-in', { timeout: 15000 }).should('be.visible');
    cy.get('#app-views', { timeout: 15000 }).should('be.visible');
    
    // Take a screenshot of successful login
    cy.screenshot('login-successful');
  });
});
