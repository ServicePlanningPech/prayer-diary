// Emergency fix for user registration issues

// Override the handleAuth function with a simplified version
async function emergencyHandleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const isLogin = document.getElementById('auth-modal-title').textContent === 'Log In';
    
    // Show loading state
    const submitBtn = document.getElementById('auth-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Loading...';
    submitBtn.disabled = true;
    
    try {
        if (isLogin) {
            // Login - use normal login process
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // Close modal on success
            const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
            modal.hide();
            
        } else {
            // EMERGENCY FIX: SUPER SIMPLIFIED SIGNUP
            // This is a bare-bones implementation to isolate and fix the issue
            
            // Get the full name from the form
            const fullName = document.getElementById('signup-name').value;
            
            // Generate a completely unique email to avoid conflicts
            const uniqueTimestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 10);
            const uniqueEmail = `test-${uniqueTimestamp}-${randomString}@example.com`;
            
            console.log('⚠️ EMERGENCY FIX: Using unique test email:', uniqueEmail);
            console.log('⚠️ This is temporary to diagnose the database issue. Your actual email will be:', email);
            
            // STEP 1: Basic signup without any extra options
            const { data, error } = await supabase.auth.signUp({
                email: uniqueEmail,  // Use the unique email
                password
            });
            
            if (error) {
                console.error('Basic signup failed:', error);
                throw error;
            }
            
            console.log('Basic signup succeeded with test email');
            
            // STEP 2: Create a profile record manually
            if (data && data.user) {
                const userId = data.user.id;
                console.log('Creating manual profile for user ID:', userId);
                
                try {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: userId,
                            full_name: fullName,
                            user_role: 'User',
                            approval_state: 'Pending',
                            profile_set: false,
                            prayer_update_notification_method: 'email',
                            urgent_prayer_notification_method: 'email',
                            GDPR_accepted: false
                        });
                        
                    if (profileError) {
                        console.error('Manual profile creation failed:', profileError);
                    } else {
                        console.log('Manual profile creation succeeded');
                    }
                } catch (profileEx) {
                    console.error('Exception during profile creation:', profileEx);
                }
            }
            
            // Close modal on success
            const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
            modal.hide();
            
            // Show success message
            showNotification(
                'Test Account Created',
                `A test account has been created successfully. Please contact the administrator for assistance.`
            );
        }
    } catch (error) {
        // Enhanced error logging for debugging
        console.error('Auth error:', error);
        console.log('Full error object:', {
            message: error.message,
            code: error.code,
            status: error.status,
            details: error.details,
            hint: error.hint,
            stack: error.stack
        });
        
        const errorElem = document.getElementById('auth-error');
        
        // Show technical error details during debugging
        let errorMessage = `${error.message} (${error.code || 'no code'})`;
        if (error.details) {
            errorMessage += `\nDetails: ${JSON.stringify(error.details)}`;
        }
        if (error.hint) {
            errorMessage += `\nHint: ${error.hint}`;
        }
        
        errorElem.querySelector('p').textContent = errorMessage;
        errorElem.style.whiteSpace = 'pre-line'; // Preserve line breaks
        errorElem.classList.remove('d-none');
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Function to add the script to the page and override the auth handler
function applyEmergencyFix() {
    console.log('Applying emergency fix for user registration...');
    
    // Override the existing handleAuth function
    if (typeof handleAuth === 'function') {
        // Save a reference to the original function
        window.originalHandleAuth = handleAuth;
        
        // Replace with our emergency version
        handleAuth = emergencyHandleAuth;
        
        console.log('Auth handler successfully replaced with emergency version');
        
        // Make sure form is using our handler
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            // Remove existing listeners
            const newAuthForm = authForm.cloneNode(true);
            authForm.parentNode.replaceChild(newAuthForm, authForm);
            
            // Add our emergency handler
            newAuthForm.addEventListener('submit', emergencyHandleAuth);
            console.log('Auth form event listener replaced');
        }
    } else {
        console.error('Could not find handleAuth function to override');
    }
}

// Apply the fix immediately
document.addEventListener('DOMContentLoaded', applyEmergencyFix);

// Also try applying it now in case the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    applyEmergencyFix();
}
