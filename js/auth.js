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
    
    // Reset form
    document.getElementById('auth-form').reset();
    document.getElementById('auth-error').classList.add('d-none');
    
    if (mode === 'login') {
        title.textContent = 'Log In';
        submitBtn.textContent = 'Log In';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch">Sign up</a>';
        signupField.classList.add('d-none');
    } else {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        switchText.innerHTML = 'Already have an account? <a href="#" id="auth-switch">Log in</a>';
        signupField.classList.remove('d-none');
    }
    
    // Re-attach event listener for switch link
    document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
    
    modal.show();
}

// Toggle between login and signup
function toggleAuthMode() {
    const title = document.getElementById('auth-modal-title');
    const isLogin = title.textContent === 'Log In';
    
    if (isLogin) {
        openAuthModal('signup');
    } else {
        openAuthModal('login');
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
            
            // Use signUp with email confirmation properly configured for production
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    },
                    // Use the GitHub Pages URL where your app is hosted for testing
                    // This ensures Supabase sends confirmation emails with the correct URL
                    emailRedirectTo: 'https://serviceplanningpech.github.io/prayer-diary'
                }
            });
            
            // Handle profile creation/update with better error checking and recovery
            if (data && data.user) {
                // Wait longer for the profile to be created by the trigger
                setTimeout(async () => {
                    try {
                        // First check if profile exists
                        const { data: existingProfile, error: checkError } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('id', data.user.id);
                            
                        if (checkError) {
                            console.error('Error checking for profile:', checkError);
                        }
                        
                        // If no profile exists or error occurred, create one manually
                        if (!existingProfile || existingProfile.length === 0 || checkError) {
                            console.log('Profile not found, creating it manually');
                            
                            // Create a new profile
                            const { error: insertError } = await supabase
                                .from('profiles')
                                .insert({ 
                                    id: data.user.id,
                                    full_name: fullName,
                                    user_role: 'User',
                                    approval_state: 'Pending'
                                });
                                
                            if (insertError) {
                                console.error('Error creating profile manually:', insertError);
                            } else {
                                console.log('Successfully created profile manually');
                            }
                        } else {
                            // Profile exists, just update it
                            console.log('Profile exists, updating it');
                            
                            const { error: updateError } = await supabase
                                .from('profiles')
                                .update({ 
                                    full_name: fullName
                                })
                                .eq('id', data.user.id);
                                
                            if (updateError) {
                                console.error('Error updating profile during signup:', updateError);
                            } else {
                                console.log('Successfully updated profile during signup');
                            }
                        }
                    } catch (e) {
                        console.error('Exception managing profile during signup:', e);
                    }
                }, 2000); // Increased to 2 seconds to give the trigger more time
            }
            
            if (error) throw error;
            
            // Close modal on success
            const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
            modal.hide();
            
            // Notify admins about the new user registration
            await notifyAdminsAboutNewUser(fullName, email);
            
            // Show welcome message
            showNotification(
                'Account Created',
                `Welcome to Prayer Diary! Your account has been created and is pending approval by an administrator. You'll receive an email when your account is approved.`
            );
        }
    } catch (error) {
        console.error('Auth error:', error);
        const errorElem = document.getElementById('auth-error');
        errorElem.querySelector('p').textContent = error.message;
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
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout Error', `There was a problem logging out: ${error.message}`);
    }
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
                // Profile still doesn't exist, create it manually
                console.log('Profile still not found, creating it manually');
                
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({ 
                        id: currentUser.id,
                        full_name: currentUser.email, // Use email as fallback name
                        user_role: 'User',
                        approval_state: 'Pending'
                    });
                    
                if (insertError) {
                    console.error('Error creating profile manually:', insertError);
                    throw insertError;
                }
                
                // Fetch the newly created profile
                const { data: newData, error: newError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();
                    
                if (newError) throw newError;
                
                data = newData;
            } else {
                // Use the data from the retry
                data = checkData;
            }
        } else if (error) {
            // Handle other types of errors
            throw error;
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
    document.querySelectorAll('.logged-out').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.logged-in').forEach(el => el.classList.remove('hidden'));
    
    // Show/hide admin links based on user role
    if (userProfile && userProfile.user_role === 'Administrator') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }
    
    // Check approval status and show appropriate view
    if (userProfile && userProfile.approval_state === 'Approved') {
        document.getElementById('landing-view').classList.add('d-none');
        document.getElementById('app-views').classList.remove('d-none');
        
        // Load initial view (prayer calendar)
        showView('calendar-view');
        loadPrayerCalendar();
    } else {
        // Show pending approval message
        document.getElementById('landing-view').classList.remove('d-none');
        document.getElementById('app-views').classList.add('d-none');
        
        const statusMessage = document.getElementById('auth-status-message');
        statusMessage.innerHTML = `<div class="alert alert-warning">
            <p>Your account is pending approval by an administrator. You'll receive an email when your account is approved.</p>
            <p>In the meantime, you can <a href="#" id="nav-to-profile">complete your profile</a> with your details and prayer points.</p>
        </div>`;
        
        // Add profile navigation link
        document.getElementById('nav-to-profile').addEventListener('click', () => {
            document.getElementById('landing-view').classList.add('d-none');
            document.getElementById('app-views').classList.remove('d-none');
            showView('profile-view');
        });
    }
}

// Update user interface for logged out state
function showLoggedOutState() {
    document.querySelectorAll('.logged-out').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.logged-in').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    
    document.getElementById('landing-view').classList.remove('d-none');
    document.getElementById('app-views').classList.add('d-none');
    
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
            const result = await sendEmail({
                to: admin.email,
                subject: `Prayer Diary: New User Registration - ${userName}`,
                html: htmlContent,
                userId: admin.id,
                contentType: 'new_user_notification'
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