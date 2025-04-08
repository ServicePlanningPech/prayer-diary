// Cypress Studio test file for recording login interactions

describe('Login Recording', () => {
  // Admin credentials
  const adminEmail = 'prayerdiary@pech.co.uk';
  const adminPassword = '@Prayer@Diary@';

  beforeEach(() => {
    // Visit the app - we'll record interactions from here
    cy.visit('/');
    
    // Log that we're ready for recording
    cy.log('*** READY FOR RECORDING ***');
    cy.log('Look for "Add Commands to Test" button in the right sidebar');
  });

  it('should login successfully with recorded steps', () => {
    // This empty test is where Cypress Studio will add recorded steps
    // You don't need to add anything here - you'll record the steps using Studio

    // Starting point - we'll click the login button to begin
    cy.get('#btn-login').should('be.visible');

    // STUDIO RECORDING WILL BE ADDED HERE
    // Look for "Add Commands to Test" in the right sidebar of Cypress
    /* ==== Generated with Cypress Studio ==== */
    cy.get('#btn-login').click();
    cy.get('#auth-email').clear('p');
    cy.get('#auth-email').type('prayerdiary@pech.co.uk');
    cy.get('#auth-password').clear();
    cy.get('#auth-password').type('@Prayer@Diary@');
    cy.get('#auth-submit').click();
    cy.get('#adminDropdown').click();
    cy.get('#nav-manage-users').click();
    cy.get(':nth-child(1) > .card-body > .row > .col-md-auto > .btn-group > .btn-success').click();
    cy.get('#close-notification').click();
    cy.get('#btn-logout').click();
    /* ==== End Cypress Studio ==== */
  });
});
