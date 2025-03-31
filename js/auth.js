// Authentication Module

// Variables
let currentUser = null;
let userProfile = null;

// Initialize auth on load
document.addEventListener('DOMContentLoaded', initAuth);

// Init auth
async function initAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            await fetchUserProfile();
            showLoggedInState();
        } else {
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
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const signupField = document.querySelector('.signup-field');
    
    // Reset form
    document.getElementById('auth-form').reset();
    document.getElementById('auth-error').classList.add('is-hidden');
    
    if (mode === 'login') {
        title.textContent = 'Log In';
        submitBtn.textContent = 'Log In';
        switchText.innerHTML = 'Don\'t have an account? <a id="auth-switch">Sign up</a>';
        signupField.classList.add('is-hidden');
    } else {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        switchText.innerHTML = 'Already have an account? <a id="auth-switch">Log in</a>';
        signupField.classList.remove('is-hidden');
    }
    
    // Re-attach event listener for switch link
    document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
    
    modal.classList.add('is-active');
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
            document.getElementById('auth-modal').classList.remove('is-active');
            
        } else {
            // Signup
            const fullName = document.getElementById('signup-name').value;
            
            // Use signUp without email confirmation for now
            // In production you'd want to enable this in the Supabase dashboard
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    },
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
            
            // Close modal on success
            document.getElementById('auth-modal').classList.remove('is-active');
            
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
        errorElem.classList.remove('is-hidden');
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
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout Error', `There was a problem logging out: ${error.message}`);
    }
}

// Fetch current user's profile
async function fetchUserProfile() {
    try {
        if (!currentUser) return null;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        if (error) throw error;
        
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
        document.getElementById('landing-view').classList.add('is-hidden');
        document.getElementById('app-views').classList.remove('is-hidden');
        
        // Load initial view (prayer calendar)
        showView('calendar-view');
        loadPrayerCalendar();
    } else {
        // Show pending approval message
        document.getElementById('landing-view').classList.remove('is-hidden');
        document.getElementById('app-views').classList.add('is-hidden');
        
        const statusMessage = document.getElementById('auth-status-message');
        statusMessage.innerHTML = `<div class="notification is-warning">
            <p>Your account is pending approval by an administrator. You'll receive an email when your account is approved.</p>
            <p>In the meantime, you can <a id="nav-to-profile">complete your profile</a> with your details and prayer points.</p>
        </div>`;
        
        // Add profile navigation link
        document.getElementById('nav-to-profile').addEventListener('click', () => {
            document.getElementById('landing-view').classList.add('is-hidden');
            document.getElementById('app-views').classList.remove('is-hidden');
            showView('profile-view');
        });
    }
}

// Update user interface for logged out state
function showLoggedOutState() {
    document.querySelectorAll('.logged-out').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.logged-in').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    
    document.getElementById('landing-view').classList.remove('is-hidden');
    document.getElementById('app-views').classList.add('is-hidden');
    
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
                }
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
                    urgent_prayer_editor: true
                })
                .eq('id', data.user.id);
                
            if (updateError) throw updateError;
            
            console.log('Updated super admin profile');
        }
    } catch (error) {
        console.error('Error creating super admin:', error);
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