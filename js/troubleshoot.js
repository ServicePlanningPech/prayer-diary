// Systematic Troubleshooting for User Registration Issues
// This file runs detailed tests of all components in the auth flow

// Create global namespace for troubleshooting functions
window.PrayerDiaryTroubleshooter = {
    outputDiv: null,
    results: {},
    
    // Main entry point - runs all tests
    async runAllTests() {
        this.createOutputUI();
        this.log('🔍 Starting Comprehensive Troubleshooting', 'h4');
        this.log(`Timestamp: ${new Date().toISOString()}`);
        this.log(`App version: ${APP_VERSION}`);
        
        try {
            // Run tests in sequence
            await this.testBasicConnection();
            await this.testDatabaseSchema();
            await this.testTriggerFunction();
            await this.testAuthSignup();
            await this.testManualProfileCreation();
            
            // Final summary
            this.log('📊 Test Results Summary', 'h4');
            
            let allPassed = true;
            Object.entries(this.results).forEach(([test, result]) => {
                const emoji = result.passed ? '✅' : '❌';
                this.log(`${emoji} ${test}: ${result.message}`, 'div', 
                    result.passed ? 'text-success' : 'text-danger');
                
                if (!result.passed) allPassed = false;
            });
            
            if (allPassed) {
                this.log('🎉 All tests passed! This is unusual given the errors you were experiencing.', 'div', 'alert alert-success mt-3');
                this.log('This might indicate that the issue is intermittent or has been resolved.');
            } else {
                this.log('🔎 Issues were detected in your setup. See the details above.', 'div', 'alert alert-warning mt-3');
            }
            
        } catch (error) {
            this.log(`❌ Error during testing: ${error.message}`, 'div', 'text-danger');
            console.error('Troubleshooting error:', error);
        }
    },
    
    // Test basic connection to Supabase
    async testBasicConnection() {
        this.log('1. Testing Basic Connection to Supabase', 'h5', 'mt-4');
        
        try {
            // Verify Supabase URL and key
            this.log(`Supabase URL: ${maskString(SUPABASE_URL)}`);
            this.log(`Supabase Key: ${maskString(SUPABASE_ANON_KEY)}`);
            
            // Check if URL has leading/trailing spaces
            if (SUPABASE_URL.trim() !== SUPABASE_URL) {
                this.log('⚠️ WARNING: Supabase URL contains leading or trailing whitespace', 'div', 'text-warning');
            }
            
            // Test simple query
            this.log('Testing table access...');
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
                
            if (error) {
                this.log(`❌ Error accessing database: ${error.message}`, 'div', 'text-danger');
                this.results.basicConnection = { passed: false, message: `Connection failed: ${error.message}` };
                return;
            }
            
            this.log(`✅ Successfully connected! Found ${count} profiles.`, 'div', 'text-success');
            this.results.basicConnection = { passed: true, message: 'Connection successful' };
            
        } catch (error) {
            this.log(`❌ Exception during connection test: ${error.message}`, 'div', 'text-danger');
            this.results.basicConnection = { passed: false, message: `Exception: ${error.message}` };
        }
    },
    
    // Test database schema
    async testDatabaseSchema() {
        this.log('2. Verifying Database Schema', 'h5', 'mt-4');
        
        try {
            // Get the profiles table definition
            this.log('Checking profiles table structure...');
            
            // Create an array of expected columns
            const expectedColumns = [
                'id', 'full_name', 'profile_image_url', 'prayer_points',
                'user_role', 'approval_state', 'profile_set', 'gdpr_accepted',
                'prayer_update_notification_method', 'urgent_prayer_notification_method'
            ];
            
            // Test method 1: Try to select these specific columns
            const missingColumns = [];
            for (const col of expectedColumns) {
                try {
                    const query = {};
                    query[col] = true;
                    
                    const { error } = await supabase
                        .from('profiles')
                        .select(col)
                        .limit(1);
                        
                    if (error && error.message.includes('does not exist')) {
                        missingColumns.push(col);
                        this.log(`❌ Column "${col}" is missing`, 'div', 'text-danger');
                    }
                } catch (e) {
                    // Skip errors
                }
            }
            
            if (missingColumns.length > 0) {
                this.log(`Found ${missingColumns.length} missing columns from expected schema.`, 'div', 'text-warning');
                this.results.databaseSchema = { 
                    passed: false, 
                    message: `Missing columns: ${missingColumns.join(', ')}` 
                };
            } else {
                this.log('✅ All expected columns found in the profiles table.', 'div', 'text-success');
                this.results.databaseSchema = { passed: true, message: 'Schema matches expectations' };
            }
            
        } catch (error) {
            this.log(`❌ Exception during schema test: ${error.message}`, 'div', 'text-danger');
            this.results.databaseSchema = { passed: false, message: `Exception: ${error.message}` };
        }
    },
    
    // Test trigger function
    async testTriggerFunction() {
        this.log('3. Testing Database Trigger Function', 'h5', 'mt-4');
        this.log('Note: This is an indirect test as we cannot directly check trigger definitions');
        
        try {
            // Test if trigger is working by attempting to create a user
            // and seeing if a profile is automatically created
            this.log('Testing if handle_new_user trigger creates profiles for new users...');
            
            // Generate unique test credentials
            const timestamp = Date.now();
            const randomCode = Math.random().toString(36).substring(2, 8);
            const email = `trigger-test-${timestamp}-${randomCode}@example.com`;
            const password = `Test${timestamp}!`;
            
            this.log(`Creating test user with email: ${email}`);
            
            // Create user using minimal options
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) {
                this.log(`❌ Could not create test user: ${error.message}`, 'div', 'text-danger');
                this.results.triggerFunction = { 
                    passed: false, 
                    message: `User creation error: ${error.message}` 
                };
                return;
            }
            
            const userId = data?.user?.id;
            if (!userId) {
                this.log('❌ User created but no user ID returned', 'div', 'text-danger');
                this.results.triggerFunction = { 
                    passed: false, 
                    message: 'No user ID returned' 
                };
                return;
            }
            
            this.log(`✅ Test user created with ID: ${userId}`, 'div', 'text-success');
            
            // Wait for trigger to execute (triggers are asynchronous)
            this.log('Waiting 3 seconds for trigger to execute...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if profile was created
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (profileError) {
                this.log(`❌ Error checking for profile: ${profileError.message}`, 'div', 'text-danger');
                this.results.triggerFunction = { 
                    passed: false, 
                    message: `Profile check error: ${profileError.message}` 
                };
                return;
            }
            
            if (!profile) {
                this.log('❌ Profile not created by trigger', 'div', 'text-danger');
                this.results.triggerFunction = { 
                    passed: false, 
                    message: 'Trigger did not create profile' 
                };
                return;
            }
            
            this.log('✅ Profile successfully created by trigger!', 'div', 'text-success');
            this.log('Profile data:', 'div');
            this.log(JSON.stringify(profile, null, 2), 'pre', 'bg-light p-2 small');
            
            // Check if all required fields are present
            const requiredFields = [
                'id', 'full_name', 'user_role', 'approval_state', 
                'prayer_update_notification_method', 'urgent_prayer_notification_method'
            ];
            
            const missingFields = requiredFields.filter(field => profile[field] === undefined);
            
            if (missingFields.length > 0) {
                this.log(`⚠️ Profile created but missing fields: ${missingFields.join(', ')}`, 'div', 'text-warning');
                this.results.triggerFunction = { 
                    passed: true, 
                    message: 'Trigger works but profile is missing some fields' 
                };
            } else {
                this.results.triggerFunction = { 
                    passed: true, 
                    message: 'Trigger function works correctly' 
                };
            }
            
        } catch (error) {
            this.log(`❌ Exception during trigger test: ${error.message}`, 'div', 'text-danger');
            this.results.triggerFunction = { passed: false, message: `Exception: ${error.message}` };
        }
    },
    
    // Test Auth signup directly
    async testAuthSignup() {
        this.log('4. Testing Auth Signup API Directly', 'h5', 'mt-4');
        
        try {
            // Try very basic signup
            const timestamp = Date.now();
            const randomCode = Math.random().toString(36).substring(2, 10);
            const email = `auth-test-${timestamp}-${randomCode}@example.com`;
            const password = `Test${timestamp}!`;
            
            this.log(`Testing basic signup with email: ${email}`);
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) {
                this.log(`❌ Auth signup failed: ${error.message}`, 'div', 'text-danger');
                this.log(`Error details: ${JSON.stringify({
                    code: error.code,
                    status: error.status,
                    details: error.details
                }, null, 2)}`, 'pre', 'bg-light p-2 small');
                
                this.results.authSignup = { 
                    passed: false, 
                    message: `Signup error: ${error.message}` 
                };
                return;
            }
            
            this.log(`✅ Auth signup successful! User ID: ${data?.user?.id}`, 'div', 'text-success');
            this.results.authSignup = { passed: true, message: 'Auth signup works correctly' };
            
        } catch (error) {
            this.log(`❌ Exception during auth test: ${error.message}`, 'div', 'text-danger');
            this.results.authSignup = { passed: false, message: `Exception: ${error.message}` };
        }
    },
    
    // Test manual profile creation
    async testManualProfileCreation() {
        this.log('5. Testing Manual Profile Creation', 'h5', 'mt-4');
        
        try {
            // Create a random ID to simulate a user ID
            const fakeUserId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
            
            this.log(`Testing profile creation with fake user ID: ${fakeUserId}`);
            
            // Try to create a profile with all required fields
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: fakeUserId,
                    full_name: 'Test User',
                    user_role: 'User',
                    approval_state: 'Pending',
                    profile_set: false,
                    prayer_update_notification_method: 'email',
                    urgent_prayer_notification_method: 'email',
                    gdpr_accepted: false
                })
                .select();
                
            if (error) {
                // Special case: Foreign key constraint is expected in this case
                // since we're using a fake user ID
                if (error.message.includes('foreign key constraint')) {
                    this.log('⚠️ Foreign key constraint error as expected (fake user ID)', 'div', 'text-warning');
                    this.log('This is normal and indicates the constraint is working correctly.');
                    this.results.manualProfileCreation = { 
                        passed: true, 
                        message: 'Foreign key constraint working correctly' 
                    };
                    return;
                }
                
                this.log(`❌ Manual profile insertion failed: ${error.message}`, 'div', 'text-danger');
                this.results.manualProfileCreation = { 
                    passed: false, 
                    message: `Insertion error: ${error.message}` 
                };
                return;
            }
            
            this.log(`✅ Manual profile creation succeeded! (This is unexpected with a fake ID)`, 'div', 'text-warning');
            this.results.manualProfileCreation = { 
                passed: true, 
                message: 'Manual profile creation works, but foreign key constraint may be missing' 
            };
            
        } catch (error) {
            this.log(`❌ Exception during profile creation test: ${error.message}`, 'div', 'text-danger');
            this.results.manualProfileCreation = { passed: false, message: `Exception: ${error.message}` };
        }
    },
    
    // UI functions
    createOutputUI() {
        // Find or create a container for our output
        let container = document.getElementById('troubleshooter-output');
        if (!container) {
            // If testing from admin panel, use the results container
            container = document.getElementById('test-results-container');
            if (container) {
                container.innerHTML = '';
            } else {
                // Create a modal if we're not in the admin panel
                this.createModal();
                container = document.getElementById('troubleshooter-output');
            }
        }
        
        this.outputDiv = container;
    },
    
    createModal() {
        // Create a modal to show results
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'troubleshooter-modal';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Prayer Diary Troubleshooter</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="troubleshooter-output" class="overflow-auto" style="max-height: 70vh;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(document.getElementById('troubleshooter-modal'));
        bsModal.show();
        
        this.outputDiv = document.getElementById('troubleshooter-output');
    },
    
    log(message, tag = 'div', className = '') {
        if (!this.outputDiv) return;
        
        const element = document.createElement(tag);
        if (className) element.className = className;
        
        if (tag === 'pre') {
            element.textContent = message;
        } else {
            element.innerHTML = message;
        }
        
        this.outputDiv.appendChild(element);
        console.log(message);
        
        // Scroll to bottom
        if (this.outputDiv.parentElement) {
            this.outputDiv.parentElement.scrollTop = this.outputDiv.parentElement.scrollHeight;
        }
    }
};

// Helper to mask sensitive values
function maskString(str) {
    if (!str) return '';
    if (str.length <= 8) return '****';
    return str.substring(0, 4) + '****' + str.substring(str.length - 4);
}

// Add a button to run the tests
document.addEventListener('DOMContentLoaded', function() {
    // Add button to test email view if it exists
    const emailTestView = document.getElementById('test-email-view');
    if (emailTestView) {
        const buttonContainer = document.getElementById('test-database-btn').parentElement;
        if (buttonContainer) {
            const runAllButton = document.createElement('button');
            runAllButton.id = 'run-all-tests-btn';
            runAllButton.className = 'btn btn-danger mt-2';
            runAllButton.innerHTML = '<i class="bi bi-tools"></i> Run Complete System Diagnosis';
            runAllButton.addEventListener('click', () => window.PrayerDiaryTroubleshooter.runAllTests());
            buttonContainer.appendChild(runAllButton);
        }
    }
    
    // Also add a global function for console use
    window.runDiagnostics = () => window.PrayerDiaryTroubleshooter.runAllTests();
    console.log('Troubleshooter loaded. Run `window.runDiagnostics()` in console to start tests.');
});
