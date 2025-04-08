// Authentication Module

// Variables
let currentUser = null;
let userProfile = null;

// Initialize auth on load
document.addEventListener('DOMContentLoaded', initAuth);

// Init auth
async function initAuth() {
    try {
        console.log("Initializing authentication...");
        
        // FIRST CHECK: Look for our custom reset password parameter
        const params = new URLSearchParams(window.location.search);
        const hasResetParam = params.has('reset_password');
        const hasTypeParam = params.get('type') === 'recovery';
        
        // If we have either reset parameter, this is a password reset flow
        if (hasResetParam || hasTypeParam) {
            console.log("Password reset flow detected via URL parameters");
            
            // Clean up the URL immediately (for security)
            const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Wait a small time to ensure Supabase has processed the auth change
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if we now have a session (from the recovery token)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                console.log("Recovery session detected - forcing password reset");
                // Set currentUser so the password update will work
                currentUser = session.user;
                
                // Show the password reset form immediately
                setupAuthListeners(); // Set up listeners first
                openNewPasswordModal();
                return; // Important: Return early to prevent normal auth flow
            }
        }
        
        // If we reach here, this is a normal login flow (not password reset)
        // Normal session check
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            console.log("Normal session found, user is logged in");
            currentUser = session.user;
            
            // Normal login flow
            const profile = await fetchUserProfile();
            if (profile) {
                console.log("Profile loaded successfully:", profile.full_name);
            } else {
                console.warn("Could not load user profile after login");
            }
            showLoggedInState();
        } else {
            console.log("No session found, user is logged out");
            showLoggedOutState();
        }
        
        setupAuthListeners();
    } catch (error) {
        console.error("Error initializing authentication:", error);
        showLoggedOutState();
    }
}

// Setup auth event listeners
function setupAuthListeners() {
    // Auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            await fetchUserProfile();
            showLoggedInState();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            showLoggedOutState();
        }
    });
    
    // UI Event Listeners
    document.getElementById('btn-login').addEventListener('click', () => {
        openAuthModal('login');
    });
    
    document.getElementById('btn-signup').addEventListener('click', () => {
        openAuthModal('signup');
    });
    
    document.getElementById('btn-logout').addEventListener('click', logout);
    
    document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
    
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    
    // Set up forgotten password event handler
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            openPasswordResetModal();
        });
    }
    
    // Set up password reset form submission
    const passwordResetForm = document.getElementById('password-reset-form');
    if (passwordResetForm) {
        passwordResetForm.addEventListener('submit', handlePasswordReset);
    }
    
    // Set up new password form submission
    const newPasswordForm = document.getElementById('new-password-form');
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', handleNewPassword);
    }
    
    // Close modal button
    document.getElementById('auth-modal-close').addEventListener('click', () => {
        document.getElementById('auth-modal').classList.remove('is-active');
    });
}

// Open auth modal for login or signup
function openAuthModal(mode) {
    const modal = new bootstrap.Modal(document.getElementById('auth-modal'));
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const signupFields = document.querySelectorAll('.signup-field');
    const loginFields = document.querySelectorAll('.login-field');
    const signupNameInput = document.getElementById('signup-name');
    const confirmPasswordInput = document.getElementById('auth-confirm-password');
    const signupHelpText = document.querySelector('.signup-field .form-text');
    const passwordMatchMessage = document.querySelector('.password-match-message');
    
    // Reset form
    document.getElementById('auth-form').reset();
    document.getElementById('auth-error').classList.add('d-none');
    
    // Hide password match message
    if (passwordMatchMessage) {
        passwordMatchMessage.classList.add('d-none');
    }
    
    if (mode === 'login') {
        title.textContent = 'Log In';
        submitBtn.textContent = 'Log In';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch">Sign up</a>';
        
        // Show login fields, hide signup fields
        signupFields.forEach(field => field.classList.add('d-none'));
        loginFields.forEach(field => field.classList.remove('d-none'));
        
        // CRITICAL: Remove required attribute from hidden fields in login mode
        signupNameInput.removeAttribute('required');
        confirmPasswordInput.removeAttribute('required');
        if (signupHelpText) signupHelpText.classList.add('d-none');
    } else {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        switchText.innerHTML = 'Already have an account? <a href="#" id="auth-switch">Log in</a>';
        
        // Hide login fields, show signup fields
        signupFields.forEach(field => field.classList.remove('d-none'));
        loginFields.forEach(field => field.classList.add('d-none'));
        
        // Add required attribute back for signup mode
        signupNameInput.setAttribute('required', '');
        confirmPasswordInput.setAttribute('required', '');
        if (signupHelpText) signupHelpText.classList.remove('d-none');
        
        // Initially disable the signup button until all fields are filled
        submitBtn.disabled = true;
    }
    
    // Re-attach event listener for switch link
    document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
    
    // Add input validation event listeners
    const formInputs = document.querySelectorAll('#auth-form input');
    formInputs.forEach(input => {
        input.addEventListener('input', validateAuthForm);
    });
    
    // Initial validation
    validateAuthForm();
    
    modal.show();
}

// Toggle between login and signup
function toggleAuthMode() {
    const title = document.getElementById('auth-modal-title');
    const isLogin = title.textContent === 'Log In';
    const signupNameInput = document.getElementById('signup-name');
    const confirmPasswordInput = document.getElementById('auth-confirm-password');
    const signupFields = document.querySelectorAll('.signup-field');
    const loginFields = document.querySelectorAll('.login-field');
    const signupHelpText = document.querySelector('.signup-field .form-text');
    const passwordMatchMessage = document.querySelector('.password-match-message');
    
    if (isLogin) {
        // Switching to signup
        title.textContent = 'Sign Up';
        document.getElementById('auth-submit').textContent = 'Sign Up';
        document.getElementById('auth-switch-text').innerHTML = 'Already have an account? <a href="#" id="auth-switch">Log in</a>';
        
        // Show signup fields, hide login fields
        signupFields.forEach(field => field.classList.remove('d-none'));
        loginFields.forEach(field => field.classList.add('d-none'));
        
        // Make signup fields required
        signupNameInput.setAttribute('required', '');
        confirmPasswordInput.setAttribute('required', '');
        if (signupHelpText) signupHelpText.classList.remove('d-none');
        
        // Reset password match message
        if (passwordMatchMessage) {
            passwordMatchMessage.classList.add('d-none');
        }
    } else {
        // Switching to login
        title.textContent = 'Log In';
        document.getElementById('auth-submit').textContent = 'Log In';
        document.getElementById('auth-switch-text').innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch">Sign up</a>';
        
        // Show login fields, hide signup fields
        signupFields.forEach(field => field.classList.add('d-none'));
        loginFields.forEach(field => field.classList.remove('d-none'));
        
        // Remove required attribute from signup fields
        signupNameInput.removeAttribute('required');
        confirmPasswordInput.removeAttribute('required');
        if (signupHelpText) signupHelpText.classList.add('d-none');
    }
    
    // Re-attach event listener for switch link
    document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
    
    // Re-validate the form
    validateAuthForm();
}

// Validate the auth form
function validateAuthForm() {
    const submitBtn = document.getElementById('auth-submit');
    const isLogin = document.getElementById('auth-modal-title').textContent === 'Log In';
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    
    if (isLogin) {
        // Login requires only email and password
        submitBtn.disabled = !(email && password);
    } else {
        // Signup requires name, email, password, and matching password confirmation
        const fullName = document.getElementById('signup-name').value.trim();
        const confirmPassword = document.getElementById('auth-confirm-password').value;
        const passwordMatchMessage = document.querySelector('.password-match-message');
        
        // Check if passwords match when both fields have values
        let passwordsMatch = true;
        if (password && confirmPassword) {
            passwordsMatch = password === confirmPassword;
            
            // Show/hide password match message
            if (passwordsMatch) {
                passwordMatchMessage.classList.add('d-none');
            } else {
                passwordMatchMessage.classList.remove('d-none');
            }
        } else {
            // If one or both password fields are empty, hide the mismatch message
            passwordMatchMessage.classList.add('d-none');
        }
        
        // Enable submit button only if all fields are filled and passwords match
        submitBtn.disabled = !(fullName && email && password && confirmPassword && passwordsMatch);
    }
}

// Handle login/signup form submission
async function handleAuth(e) {
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
            // Login
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // Close modal on success
            const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
            modal.hide();
            
        } else {
            // Signup
            const fullName = document.getElementById('signup-name').value;
            const confirmPassword = document.getElementById('auth-confirm-password').value;
            
            // Verify passwords match before proceeding
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match. Please try again.');
            }
            
            // Add debug log to see what we're sending
            console.log('Attempting to sign up user:', email);
            
            // Simplified signup flow - direct and linear process
            let data, error;
            
            try {
                // Step 1: Create the authentication account with metadata
                const simpleSignup = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });
                
                data = simpleSignup.data;
                error = simpleSignup.error;
                
                console.log('Signup response:', {
                    error: error ? {
                        message: error.message,
                        code: error.code,
                        status: error.status
                    } : null,
                    userId: data?.user?.id
                });
                
                // Step 2: If auth account created successfully, immediately create the profile
                if (!error && data?.user?.id) {
                    console.log('User created, now creating profile directly');
                    
                    // We'll rely on the database trigger to create the profile
                    // But we'll check to make sure it worked
                    console.log('User created, verifying profile creation...');
                    
                    // Wait a moment for the trigger to execute
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Verify profile was created by the trigger
                    const { data: checkData, error: checkError } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', data.user.id)
                        .single();
                        
                    if (checkError || !checkData) {
                        console.error('Profile not created by trigger:', checkError);
                        throw new Error('Profile creation failed. Please contact support.');
                    } else {
                        console.log('Successfully verified profile creation');
                    }
                }
            } catch (signupError) {
                console.error('Error during signup process:', signupError);
                error = signupError;
            }
            
            if (error) throw error;
            
            // Close modal on success
            const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
            modal.hide();
            
            // Notify admins about the new user registration
            await notifyAdminsAboutNewUser(fullName, email);
            
            // Show registration complete screen
            showRegistrationCompleteScreen();
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

// Logout function with enhanced error handling and force-logout capability
async function logout() {
    console.log("Attempting to logout user...");
    
    try {
        // First attempt - standard Supabase signOut
        console.log("Trying standard signOut method...");
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.warn("Standard signOut had an error:", error.message);
            throw error;
        }
        
        console.log("Standard signOut successful");
    } catch (error) {
        console.error("Error during standard logout:", error);
        
        try {
            // Second attempt - alternative signOut with options
            console.log("Trying alternative signOut method...");
            await supabase.auth.signOut({ scope: 'global' });
            console.log("Alternative signOut completed");
        } catch (secondError) {
            console.error("Error during alternative logout:", secondError);
            
            // Force client-side logout regardless of server response
            console.log("Forcing client-side logout...");
        }
    } finally {
        // Always reset the local state regardless of API success
        console.log("Resetting local state...");
        currentUser = null;
        userProfile = null;
        
        // Clear any stored tokens from localStorage (if they exist)
        try {
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('supabase.auth.expires_at');
            sessionStorage.removeItem('supabase.auth.token');
        } catch (storageError) {
            console.warn("Error clearing auth storage:", storageError);
        }
        
        // Update UI to logged out state
        showLoggedOutState();
        
        // Clear any app-specific state
        clearLocalAppState();
        
        console.log("Logout procedure completed");
    }
}

// Helper function to clear any local state
function clearLocalAppState() {
    // Clear any cached data
    if (window.sessionStorage) {
        // Clear specific session storage items related to the app
        // Don't clear everything as it might affect other apps
        sessionStorage.removeItem('prayerDiaryLastView');
        sessionStorage.removeItem('prayerDiaryLastUpdate');
        // Add any other items that should be cleared
    }
    
    // Reset any global app state variables (if any)
    // Example: currentView = null;
}

// Fetch current user's profile with retry mechanism
async function fetchUserProfile() {
    try {
        if (!currentUser) return null;
        
        // First attempt to get the profile
        let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        // If we get a "no rows returned" error, the profile might not be created yet
        if (error && error.code === 'PGRST116') {
            console.log('Profile not found on first attempt, waiting and retrying...');
            
            // Wait a moment and try again
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if profile exists now
            const { data: checkData, error: checkError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();
                
            if (checkError) {
                console.error('Profile still not found after retry:', checkError);
                return null;
            } else {
                // Use the data from the retry
                data = checkData;
            }
        } else if (error) {
            // Handle other types of errors
            console.error('Error fetching profile:', error);
            return null;
        }
        
        userProfile = data;
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

// Update user interface for logged in state
function showLoggedInState() {
    // Check if user profile exists and is approved
    if (!userProfile) {
        console.error("No user profile found after login");
        showNotification('Error', 'Could not load your user profile. Please contact support.');
        logout();
        return;
    }
    
    // Check approval status first
    if (userProfile.approval_state !== 'Approved') {
        // User is logged in but not approved - show pending screen and prevent navigation
        document.querySelectorAll('.logged-out').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.logged-in').forEach(el => el.classList.add('hidden'));
        
        document.getElementById('landing-view').classList.remove('d-none');
        document.getElementById('app-views').classList.add('d-none');
        
        // Disable all navigation buttons
        document.querySelectorAll('.nav-link, .navbar-brand').forEach(link => {
            link.classList.add('disabled');
            link.style.pointerEvents = 'none';
        });
        
        const statusMessage = document.getElementById('auth-status-message');
        statusMessage.innerHTML = `
            <div class="alert alert-warning">
                <h4 class="alert-heading">Account Pending Approval</h4>
                <p>Your account is pending approval by an administrator. You'll receive an email when your account is approved.</p>
                <p>Please close this window and check your email for the approval notification.</p>
                <hr>
                <div class="text-center">
                    <button id="pending-logout-btn" class="btn btn-primary" type="button">Close Session</button>
                </div>
            </div>
        `;
        
        // Add logout button event listener
        document.getElementById('pending-logout-btn').addEventListener('click', () => {
            logout();
        });
        
        return;
    }
    
    // User is approved - show normal UI
    document.querySelectorAll('.logged-out').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.logged-in').forEach(el => el.classList.remove('hidden'));
    
    // Show/hide admin links based on user role
    if (userProfile.user_role === 'Administrator') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }
    
    // Enable all navigation buttons
    document.querySelectorAll('.nav-link, .navbar-brand').forEach(link => {
        link.classList.remove('disabled');
        link.style.pointerEvents = '';
    });
    
    document.getElementById('landing-view').classList.add('d-none');
    document.getElementById('app-views').classList.remove('d-none');
    
    // If profile is not set yet, take user directly to profile page
    if (userProfile.profile_set === false) {
        showView('profile-view');
        // Explicitly call loadUserProfile to populate the form fields
        loadUserProfile();
        showNotification('Welcome', 'Please complete your profile information before using the Prayer Diary.');
    } else {
        // Load initial view (prayer calendar)
        showView('calendar-view');
        loadPrayerCalendar();
    }
}

// Registration complete screen
function showRegistrationCompleteScreen() {
    document.querySelectorAll('.logged-out').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.logged-in').forEach(el => el.classList.add('hidden'));
    
    document.getElementById('landing-view').classList.remove('d-none');
    document.getElementById('app-views').classList.add('d-none');
    
    // Disable all navigation buttons
    document.querySelectorAll('.nav-link, .navbar-brand').forEach(link => {
        link.classList.add('disabled');
        link.style.pointerEvents = 'none';
    });
    
    // Show registration complete message
    const statusMessage = document.getElementById('auth-status-message');
    statusMessage.innerHTML = `
        <div class="alert alert-success">
            <h4 class="alert-heading">Registration Complete!</h4>
            <p>Your account has been created and is pending approval by an administrator.</p>
            <p>You'll receive an email when your account is approved.</p>
            <hr>
            <p class="mb-0">Please close this window and reopen the app after receiving approval.</p>
            <div class="text-center mt-3">
                <button id="close-session-btn" class="btn btn-primary" type="button">Close Session</button>
            </div>
        </div>
    `;
    
    // Add close session button event listener with improved handling
    // Wait for DOM to be ready
    setTimeout(() => {
        const closeBtn = document.getElementById('close-session-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', async () => {
                // Disable button to prevent multiple clicks
                closeBtn.disabled = true;
                closeBtn.textContent = 'Closing session...';
                
                // Call logout
                await logout();
                
                // Show success message
                statusMessage.innerHTML = `
                    <div class="alert alert-info">
                        <p>Your session has been closed. You may now close this window.</p>
                        <p>Please check your email for approval notification before logging in again.</p>
                        <div class="text-center mt-3">
                            <button onclick="window.location.reload()" class="btn btn-secondary">Refresh Page</button>
                        </div>
                    </div>
                `;
            });
            console.log("Close session button event listener attached");
        } else {
            console.error("Could not find close-session-btn element");
        }
    }, 100);
}

// Update user interface for logged out state
function showLoggedOutState() {
    document.querySelectorAll('.logged-out').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.logged-in').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    
    document.getElementById('landing-view').classList.remove('d-none');
    document.getElementById('app-views').classList.add('d-none');
    
    // Re-enable navigation buttons
    document.querySelectorAll('.nav-link, .navbar-brand').forEach(link => {
        link.classList.remove('disabled');
        link.style.pointerEvents = '';
    });
    
    // Update landing page message
    const statusMessage = document.getElementById('auth-status-message');
    statusMessage.innerHTML = `<p>Please log in or sign up to access the Prayer Diary app.</p>`;
}

// Create super admin
async function createSuperAdmin() {
    try {
        // Check if admin user exists
        const { data: existingAdmin, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_role', 'Administrator')
            .limit(1);
            
        if (checkError) throw checkError;
        
        // If admin exists, don't create a new one
        if (existingAdmin && existingAdmin.length > 0) {
            console.log('Administrator already exists, skipping super admin creation');
            return;
        }
        
        // First create the user
        const { data, error } = await supabase.auth.signUp({
            email: 'prayerdiary@pech.co.uk',
            password: '@Prayer@Diary@',
            options: {
                data: {
                    full_name: 'Super Admin'
                },
                // Use the GitHub Pages URL for testing
                emailRedirectTo: 'https://serviceplanningpech.github.io/prayer-diary'
            }
        });
        
        if (error) throw error;
        
        console.log('Created super admin user');
        
        // The trigger will automatically create a profile,
        // but we need to update it as admin
        if (data && data.user) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    user_role: 'Administrator',
                    approval_state: 'Approved',
                    prayer_calendar_editor: true,
                    prayer_update_editor: true,
                    urgent_prayer_editor: true,
                    full_name: 'Super Admin',  // Explicitly set the name
                    email: 'prayerdiary@pech.co.uk',  // Explicitly set the email
                    approval_admin: true  // Give super admin approval rights
                })
                .eq('id', data.user.id);
                
            if (updateError) throw updateError;
            
            console.log('Updated super admin profile');
        }
    } catch (error) {
        console.error('Error creating super admin:', error);
    }
}

// Notify admin about new user registration
async function notifyAdminsAboutNewUser(userName, userEmail) {
    if (!EMAIL_ENABLED) {
        console.log('Email notifications are disabled. Would have sent admin notification for new user:', userName);
        return false;
    }
    
    try {
        console.log('Attempting to find admin with approval rights...');
        
        // Fetch the first administrator with approval_admin flag set to TRUE
        const { data: admins, error: queryError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('user_role', 'Administrator')
            .eq('approval_state', 'Approved')
            .eq('approval_admin', true);
            
        if (queryError) {
            console.error('Database query error:', queryError.message);
            return false;
        }
        
        // Check if we found any admins
        if (!admins || admins.length === 0) {
            console.log('No admin with approval_admin rights found to notify');
            return false;
        }
        
        // Get the first admin from the results
        const admin = admins[0];
        
        if (!admin.email) {
            console.log('Admin found but no email address available');
            return false;
        }
        
        console.log(`Found admin to notify about new user registration: ${admin.full_name} (${admin.email})`);
        
        // Create email content for admin notification
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #483D8B;">New User Registration</h2>
                <p>A new user has registered for Prayer Diary and is awaiting your approval:</p>
                
                <div style="background-color: #f5f5f5; border-left: 4px solid #483D8B; padding: 15px; margin: 15px 0;">
                    <p><strong>Name:</strong> ${userName}</p>
                    <p><strong>Email:</strong> ${userEmail}</p>
                    <p><strong>Status:</strong> Pending Approval</p>
                </div>
                
                <p>Please log in to the admin panel to review and approve this user.</p>
                
                <div style="margin: 25px 0;">
                    <a href="${window.location.origin}" 
                    style="background-color: #483D8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        Go to Admin Panel
                    </a>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                    This is an automated notification from Prayer Diary. Please do not reply to this email.
                </p>
            </div>
        `;
        
        console.log(`Attempting to send email to ${admin.email}...`);
        
        // Send the email using the Edge Function mechanism
        try {
            // Modified to not use notification logging
            const result = await sendEmail({
                to: admin.email,
                subject: `Prayer Diary: New User Registration - ${userName}`,
                html: htmlContent
                // userId and contentType params removed to avoid notification logging
            });
            
            if (result && result.success) {
                console.log(`Successfully sent notification email to approval admin: ${admin.full_name}`);
                return true;
            } else {
                const errorMsg = result && result.error ? result.error : 'Unknown email error';
                console.error(`Failed to send notification email: ${errorMsg}`);
                return false;
            }
        } catch (emailError) {
            console.error('Email sending error:', emailError.message || emailError);
            return false;
        }
    } catch (error) {
        // Improved error logging with more details
        console.error('Error in notifyAdminsAboutNewUser:', error.message || error);
        if (error.stack) console.error(error.stack);
        return false;
    }
}

// Open the password reset modal
function openPasswordResetModal() {
    // Close the auth modal first
    const authModal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
    if (authModal) {
        authModal.hide();
    }
    
    // Reset the form and hide any previous messages
    document.getElementById('password-reset-form').reset();
    document.getElementById('password-reset-error').classList.add('d-none');
    document.getElementById('password-reset-success').classList.add('d-none');
    
    // Show the password reset modal
    const modal = new bootstrap.Modal(document.getElementById('password-reset-modal'));
    modal.show();
}

// Handle password reset form submission
async function handlePasswordReset(e) {
    e.preventDefault();
    
    const email = document.getElementById('reset-email').value.trim();
    const submitBtn = document.getElementById('reset-submit');
    const originalText = submitBtn.textContent;
    const errorElement = document.getElementById('password-reset-error');
    const successElement = document.getElementById('password-reset-success');
    
    // Hide previous messages
    errorElement.classList.add('d-none');
    successElement.classList.add('d-none');
    
    // Show loading state
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
        // Use the Supabase resetPasswordForEmail function with a special reset page indicator
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname + '?reset_password=true'
        });
        
        if (error) throw error;
        
        // Show success message
        successElement.querySelector('p').textContent = 
            'Password reset link sent! Please check your email inbox and follow the instructions to reset your password.';
        successElement.classList.remove('d-none');
        
        // Hide the form
        document.getElementById('password-reset-form').classList.add('d-none');
        
        // Log the success (for debugging)
        console.log('Password reset email sent successfully to:', email);
        
    } catch (error) {
        // Show error message
        console.error('Error sending password reset email:', error);
        errorElement.querySelector('p').textContent = 
            `Failed to send reset email: ${error.message || 'Unknown error'}`;
        errorElement.classList.remove('d-none');
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Open the new password modal
function openNewPasswordModal() {
    // First, ensure the landing view is visible
    document.getElementById('landing-view').classList.remove('d-none');
    document.getElementById('app-views').classList.add('d-none');
    
    // Show an alert in the landing view to explain what's happening
    const statusMessage = document.getElementById('auth-status-message');
    if (statusMessage) {
        statusMessage.innerHTML = `
            <div class="alert alert-info">
                <h4 class="alert-heading">Password Reset Required</h4>
                <p>You've clicked a password reset link. Please set a new password to continue.</p>
            </div>
        `;
    }
    
    // Reset the form and hide any previous messages
    document.getElementById('new-password-form').reset();
    document.getElementById('new-password-error').classList.add('d-none');
    document.getElementById('new-password-success').classList.add('d-none');
    
    // Add event listeners for password validation
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');
    const passwordMatchMessage = document.querySelector('.password-match-message-reset');
    const submitBtn = document.getElementById('new-password-submit');
    
    // Set up form submission handler
    document.getElementById('new-password-form').removeEventListener('submit', handleNewPassword);
    document.getElementById('new-password-form').addEventListener('submit', handleNewPassword);
    
    // Set up password matching validation
    const validatePasswords = () => {
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (password && confirmPassword) {
            const passwordsMatch = password === confirmPassword;
            
            if (passwordsMatch) {
                passwordMatchMessage.classList.add('d-none');
                submitBtn.disabled = false;
            } else {
                passwordMatchMessage.classList.remove('d-none');
                submitBtn.disabled = true;
            }
        } else {
            // If either field is empty, hide the message
            passwordMatchMessage.classList.add('d-none');
            submitBtn.disabled = !(password && confirmPassword);
        }
    };
    
    newPasswordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);
    
    // Force the modal to show and make it not dismissible
    const modalElement = document.getElementById('new-password-modal');
    modalElement.setAttribute('data-bs-backdrop', 'static');
    modalElement.setAttribute('data-bs-keyboard', 'false');
    
    // Remove the close button
    const closeButton = modalElement.querySelector('.btn-close');
    if (closeButton) {
        closeButton.style.display = 'none';
    }
    
    // Show the modal with high z-index to ensure it's on top
    const modal = new bootstrap.Modal(modalElement);
    modalElement.style.zIndex = '1060'; // Higher than the default 1050
    modal.show();
    
    // Log for debugging
    console.log("Password reset modal opened and displayed");
}

// Handle new password form submission
async function handleNewPassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const submitBtn = document.getElementById('new-password-submit');
    const originalText = submitBtn.textContent;
    const errorElement = document.getElementById('new-password-error');
    const successElement = document.getElementById('new-password-success');
    
    // Hide previous messages
    errorElement.classList.add('d-none');
    successElement.classList.add('d-none');
    
    // Verify passwords match
    if (newPassword !== confirmPassword) {
        errorElement.querySelector('p').textContent = 'Passwords do not match. Please try again.';
        errorElement.classList.remove('d-none');
        return;
    }
    
    // Show loading state
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
    
    try {
        // Use Supabase function to update the password
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        // Show success message
        successElement.querySelector('p').textContent = 
            'Your password has been successfully updated! You will now be redirected to the application.';
        successElement.classList.remove('d-none');
        
        // Hide the form
        document.getElementById('new-password-form').classList.add('d-none');
        
        // After successful password update, force sign out and reload
        setTimeout(async () => {
            try {
                // Sign out the user to clear the recovery session
                await supabase.auth.signOut({ scope: 'global' });
                
                // Close the new password modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('new-password-modal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show toast first so it appears after reload
                showToast('Success', 'Password updated successfully. Please log in with your new password.', 'success');
                
                // Force page reload to clear everything
                console.log("Forcing complete page reload to clear session state");
                setTimeout(() => {
                    window.location.href = window.location.origin + window.location.pathname;
                }, 1000);
            } catch (signOutError) {
                console.error('Error signing out after password reset:', signOutError);
                // If sign out fails, still try to redirect to login
                window.location.reload();
            }
        }, 3000);
        
    } catch (error) {
        // Show error message
        console.error('Error updating password:', error);
        errorElement.querySelector('p').textContent = 
            `Failed to update password: ${error.message || 'Unknown error'}`;
        errorElement.classList.remove('d-none');
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Helper functions
function getUserId() {
    return currentUser ? currentUser.id : null;
}

function isLoggedIn() {
    return !!currentUser;
}

function isAdmin() {
    return userProfile && userProfile.user_role === 'Administrator';
}

function isApproved() {
    return userProfile && userProfile.approval_state === 'Approved';
}

function hasPermission(permission) {
    if (!userProfile) return false;
    
    // Admins have all permissions
    if (userProfile.user_role === 'Administrator') return true;
    
    // Check specific permission
    switch(permission) {
        case 'prayer_calendar_editor':
            return userProfile.prayer_calendar_editor;
        case 'prayer_update_editor':
            return userProfile.prayer_update_editor;
        case 'urgent_prayer_editor':
            return userProfile.urgent_prayer_editor;
        default:
            return false;
    }
}