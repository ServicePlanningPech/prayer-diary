// Mock implementation for Supabase auth
export const setupSupabaseMocks = () => {
  cy.window().then((win) => {
    // Store the original Supabase auth functions
    const originalSupabase = win.supabase;
    
    // Create a fake user ID for testing
    const fakeUserId = 'test-user-id-' + Date.now();
    
    // Mock the signUp method
    const mockSignUp = cy.stub().resolves({
      data: {
        user: {
          id: fakeUserId,
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User'
          }
        },
        session: {
          access_token: 'fake-access-token',
          refresh_token: 'fake-refresh-token',
          user: {
            id: fakeUserId
          }
        }
      },
      error: null
    });
    
    // Mock the signIn method
    const mockSignIn = cy.stub().resolves({
      data: {
        user: {
          id: fakeUserId,
          email: 'test@example.com'
        },
        session: {
          access_token: 'fake-access-token',
          refresh_token: 'fake-refresh-token',
          user: {
            id: fakeUserId
          }
        }
      },
      error: null
    });
    
    // Mock the getSession method
    const mockGetSession = cy.stub().resolves({
      data: {
        session: {
          access_token: 'fake-access-token',
          refresh_token: 'fake-refresh-token',
          user: {
            id: fakeUserId,
            email: 'test@example.com'
          }
        }
      },
      error: null
    });
    
    // Override Supabase auth methods with mocks
    win.supabase = {
      ...originalSupabase,
      auth: {
        ...originalSupabase.auth,
        signUp: mockSignUp,
        signInWithPassword: mockSignIn,
        getSession: mockGetSession
      }
    };
    
    // Mocking profiles table operations
    const mockFrom = (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  id: fakeUserId,
                  full_name: 'Test User',
                  user_role: 'User',
                  approval_state: 'Approved',
                  profile_set: false
                },
                error: null
              })
            })
          }),
          update: () => ({
            eq: () => Promise.resolve({
              data: {},
              error: null
            })
          }),
          insert: () => Promise.resolve({
            data: {},
            error: null
          })
        };
      }
      
      // Return the original for other tables
      return originalSupabase.from(table);
    };
    
    // Override the from method
    win.supabase.from = mockFrom;
  });
};
