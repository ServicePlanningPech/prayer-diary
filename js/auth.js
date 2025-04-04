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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            console.log("Session found, user is logged in");
            currentUser = session.user;
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
    const signupField = document.querySelector('.signup-field');
    const signupNameInput = document.getElementById('signup-name');
    const signupHelpText = document.querySelector('.signup-field .form-text');
    
    // Reset form
    document.getElementById('auth-form').reset();
    document.getElementById('auth-error').classList.add('d-none');
    
    if (mode === 'login') {
        title.textContent = 'Log In';
        submitBtn.textContent = 'Log In';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch">Sign up</a>';
        signupField.classList.add('d-none');
        
        // CRITICAL: Remove required attribute from hidden fields in login mode
        signupNameInput.removeAttribute('required');
        if (signupHelpText) signupHelpText.classList.add('d-none');
    } else {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        switchText.innerHTML = 'Already have an account? <a href="#" id="auth-switch">Log in</a>';
        signupField.classList.remove('d-none');
        
        // Add required attribute back for signup mode
        signupNameInput.setAttribute('required', '');
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
    const signupField = document.querySelector('.signup-field');
    const signupHelpText = document.querySelector('.signup-field .form-text');
    
    if (isLogin) {
        // Switching to signup
        title.textContent = 'Sign Up';
        document.getElementById('auth-submit').textContent = 'Sign Up';
        document.getElementById('auth-switch-text').innerHTML = 'Already have an account? <a href="#" id="auth-switch">Log in</a>';
        
        // Show signup fields and make them required
        signupField.classList.remove('d-none');
        signupNameInput.setAttribute('required', '');
        if (signupHelpText) signupHelpText.classList.remove('d-none');
    } else {
        // Switching to login
        title.textContent = 'Log In';
        document.getElementById('auth-submit').textContent = 'Log In';
        document.getElementById('auth-switch-text').innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch">Sign up</a>';
        
        // Hide signup fields and remove required attribute
        signupField.classList.add('d-none');
        signupNameInput.removeAttribute('required');
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
        // Signup requires name, email, and password
        const fullName = document.getElementById('signup-name').value.trim();
        submitBtn.disabled = !(fullName && email && password);
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

// Logout function
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Immediately update UI state without waiting for the event
        currentUser = null;
        userProfile = null;
        showLoggedOutState();
        
        // Clear any local data or state
        clearLocalAppState();
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout Error', `There was a problem logging out: ${error.message}`);
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
    
    // Add close session button event listener
    document.getElementById('close-session-btn').addEventListener('click', async () => {
        await logout();
        // Optional: Add a message indicating the session has been closed
        statusMessage.innerHTML = `
            <div class="alert alert-info">
                <p>Your session has been closed. You may now close this window.</p>
                <p>Please check your email for approval notification before logging in again.</p>
            </div>
        `;
    });
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