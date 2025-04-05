// Email Testing Module

// Initialize email test view
function initEmailTestView() {
    // Only allow admins to access this feature
    if (!isAdmin()) {
        showNotification('Access Denied', 'You do not have permission to access this feature.');
        showView('calendar-view');
        return;
    }
    
    // Set up the form submission
    document.getElementById('test-email-form').addEventListener('submit', sendTestEmail);
    
    // Set up database test button
    document.getElementById('test-database-btn').addEventListener('click', testDatabaseConnection);
    
    // Check email configuration status
    checkEmailConfig();
    
    // Current timestamp in the template
    updateEmailTimestamp();
}

// Update email timestamp in the template
function updateEmailTimestamp() {
    const contentField = document.getElementById('test-email-content');
    const content = contentField.value;
    const timestamp = new Date().toLocaleString();
    const updatedContent = content.replace('${new Date().toLocaleString()}', timestamp);
    contentField.value = updatedContent;
}

// Check if email is configured correctly
function checkEmailConfig() {
    const statusElement = document.getElementById('email-config-status');
    
    if (!EMAIL_ENABLED) {
        statusElement.className = 'alert alert-warning';
        statusElement.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Email is disabled!</strong> Set <code>EMAIL_ENABLED = true</code> in config.js to enable email functionality.
        `;
        return;
    }
    
    // Test if the Supabase function is deployed
    supabase.functions.invoke('send-email', {
        body: { 
            testConnection: true
        }
    }).then(response => {
        if (response.error) {
            statusElement.className = 'alert alert-danger';
            statusElement.innerHTML = `
                <i class="bi bi-x-circle-fill me-2"></i>
                <strong>Connection Error!</strong> The Edge Function might not be deployed or configured correctly.
                <p class="mt-2 mb-0 small">Error: ${response.error.message}</p>
            `;
        } else {
            statusElement.className = 'alert alert-success';
            statusElement.innerHTML = `
                <i class="bi bi-check-circle-fill me-2"></i>
                <strong>Email is configured!</strong> You can send test emails.
            `;
        }
    }).catch(error => {
        statusElement.className = 'alert alert-danger';
        statusElement.innerHTML = `
            <i class="bi bi-x-circle-fill me-2"></i>
            <strong>Connection Error!</strong> Could not connect to the Edge Function.
            <p class="mt-2 mb-0 small">Error: ${error.message}</p>
        `;
    });
}

// Send a test email
async function sendTestEmail(e) {
    e.preventDefault();
    
    // Get form values
    const to = document.getElementById('test-email-to').value;
    const subject = document.getElementById('test-email-subject').value;
    const html = document.getElementById('test-email-content').value;
    const cc = document.getElementById('test-email-cc').value || null;
    const bcc = document.getElementById('test-email-bcc').value || null;
    const replyTo = document.getElementById('test-email-reply-to').value || null;
    
    // Show loading state
    const submitBtn = document.getElementById('send-test-email-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...';
    submitBtn.disabled = true;
    
    try {
        // Send the email using our general purpose email function
        const result = await sendEmail({
            to,
            subject,
            html,
            cc,
            bcc,
            replyTo
            // Notification logging parameters removed
        });
        
        // Update results container
        updateTestResults(to, subject, result);
        
        // Show success notification
        if (result.success) {
            showNotification(
                'Email Sent Successfully', 
                `Test email has been sent to <strong>${to}</strong>. Please check the inbox (and spam folder) to confirm delivery.`
            );
        } else {
            showNotification(
                'Email Sending Failed', 
                `Failed to send test email: ${result.error}`
            );
        }
    } catch (error) {
        console.error('Error sending test email:', error);
        
        // Update results container with error
        updateTestResults(to, subject, { success: false, error: error.message });
        
        // Show error notification
        showNotification(
            'Email Sending Failed', 
            `An error occurred: ${error.message}`
        );
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Update the test results container
function updateTestResults(to, subject, result) {
    const container = document.getElementById('test-results-container');
    const timestamp = new Date().toLocaleString();
    
    // Create a new result card
    const card = document.createElement('div');
    card.className = `alert ${result.success ? 'alert-success' : 'alert-danger'} mb-3`;
    
    card.innerHTML = `
        <div class="d-flex">
            <div class="me-3">
                <i class="bi ${result.success ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} fs-4"></i>
            </div>
            <div>
                <div class="fw-bold">${result.success ? 'Success' : 'Failed'}: ${subject}</div>
                <div>To: ${to}</div>
                <div class="small text-muted">${timestamp}</div>
                ${!result.success ? `<div class="small text-danger mt-1">Error: ${result.error}</div>` : ''}
            </div>
        </div>
    `;
    
    // Add the new result at the top
    if (container.firstChild) {
        container.insertBefore(card, container.firstChild);
    } else {
        container.innerHTML = '';
        container.appendChild(card);
    }
    
    // Limit to 5 most recent results
    const results = container.querySelectorAll('.alert');
    if (results.length > 5) {
        for (let i = 5; i < results.length; i++) {
            container.removeChild(results[i]);
        }
    }
}

// Add new diagnostic test function
async function testDatabaseConnection() {
    try {
        const container = document.getElementById('test-results-container');
        container.innerHTML = '<div class="alert alert-info">Testing database connection...</div>';
        
        // Test 1: Basic connection test
        let test1Result = '<div class="alert alert-info">Checking Supabase connection...</div>';
        try {
            // Correct Supabase count query syntax
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                test1Result = `<div class="alert alert-danger">Database connection error: ${error.message}</div>`;
            } else {
                test1Result = `<div class="alert alert-success">Database connection successful. Found ${count || 0} profiles.</div>`;
            }
        } catch (err) {
            test1Result = `<div class="alert alert-danger">Exception during database test: ${err.message}</div>`;
        }
        
        // Test 2: User creation test
        let test2Result = '<div class="alert alert-info">Testing user creation...</div>';
        try {
            // First test a simple database query
            const { error: tableError } = await supabase
                .from('profiles')
                .select('id')
                .limit(1);
                
            if (tableError) {
                test2Result = `<div class="alert alert-danger">
                    Cannot access profiles table: ${tableError.message}<br>
                    This suggests a permission or database connectivity issue.
                </div>`;
                return; // Skip user creation if basic query fails
            }
            
            // Generate unique test credentials
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const testEmail = `test-${timestamp}-${randomString}@example.com`;
            const testPassword = `Test${timestamp}!`;
            
            console.log('Testing auth with email:', testEmail);
            
            // Try a minimal signup with no additional options
            const { data, error } = await supabase.auth.signUp({
                email: testEmail,
                password: testPassword
            });
            
            if (error) {
                test2Result = `<div class="alert alert-danger">
                    User creation failed: ${error.message}<br>
                    Code: ${error.code || 'N/A'}<br>
                    Status: ${error.status || 'N/A'}<br>
                    ${error.details ? `Details: ${JSON.stringify(error.details)}` : ''}
                </div>`;
                
                // Add Supabase connection info
                test2Result += `<div class="mt-3 text-muted small">
                    Connection info:<br>
                    URL: ${SUPABASE_URL.substring(0, 20)}... (first 20 chars)<br>
                    Key: ${SUPABASE_ANON_KEY.substring(0, 20)}... (first 20 chars)
                </div>`;
            } else {
                test2Result = `<div class="alert alert-success">
                    User creation successful!<br>
                    User ID: ${data?.user?.id || 'Unknown'}<br>
                    Email: ${testEmail}
                </div>`;
                
                // Try to create a profile manually as well
                if (data?.user?.id) {
                    try {
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .insert({
                                id: data.user.id,
                                full_name: 'Test User',
                                user_role: 'User',
                                approval_state: 'Pending',
                                profile_set: false,
                                prayer_update_notification_method: 'email',
                                urgent_prayer_notification_method: 'email',
                                gdpr_accepted: false
                            });
                            
                        if (profileError) {
                            test2Result += `<div class="alert alert-warning mt-2">
                                User created but profile creation failed: ${profileError.message}<br>
                                This indicates the database trigger or RLS policies may be the issue.
                            </div>`;
                        } else {
                            test2Result += `<div class="alert alert-success mt-2">
                                Profile record also created successfully!
                            </div>`;
                        }
                    } catch (profileError) {
                        test2Result += `<div class="alert alert-warning mt-2">
                            Profile creation threw an exception: ${profileError.message}
                        </div>`;
                    }
                }
            }
        } catch (err) {
            test2Result = `<div class="alert alert-danger">Exception during user creation test: ${err.message}</div>`;
        }
        
        // Update the results container with all tests
        container.innerHTML = `
            <h5>Diagnostic Test Results</h5>
            <div class="mb-3">Test 1: Database Connection</div>
            ${test1Result}
            <div class="mb-3 mt-4">Test 2: User Creation</div>
            ${test2Result}
        `;
        
    } catch (error) {
        console.error('Error running diagnostic tests:', error);
        document.getElementById('test-results-container').innerHTML = 
            `<div class="alert alert-danger">Error running diagnostic tests: ${error.message}</div>`;
    }
}
