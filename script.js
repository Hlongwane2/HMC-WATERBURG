import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase Configuration from Environment
// Replace these placeholder values in your local copy only.
// Do not commit actual API keys or secrets to git.
const SUPABASE_URL = 'https://your-supabase-project-url.supabase.co'
const SUPABASE_ANON_KEY = 'your_supabase_anon_key'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const elements = {
    loginForm: document.getElementById('loginForm'),
    loginDiv: document.getElementById('loginDiv'),
    mainContent: document.getElementById('mainContent'),
    errorMsg: document.getElementById('errorMsg'),
    logoutBtn: document.getElementById('logoutBtn'),
    statusMessage: document.getElementById('statusMessage'),
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modalBody'),
    modalOverlay: document.getElementById('modalOverlay'),
    userDisplay: document.getElementById('userDisplay'),
    displayUsername: document.getElementById('displayUsername'),
    displayStatus: document.getElementById('displayStatus'),
    displayLastLogin: document.getElementById('displayLastLogin'),
    displayTotalSessions: document.getElementById('displayTotalSessions'),
    displayAccountAge: document.getElementById('displayAccountAge'),
    displaySecurityLevel: document.getElementById('displaySecurityLevel'),
    menuBtn: document.getElementById('menuBtn'),
    signupLink: document.getElementById('signupLink'),
    loginLink: document.getElementById('loginLink'),
    loginBox: document.getElementById('loginBox'),
    signupBox: document.getElementById('signupBox'),
    signupError: document.getElementById('signupError'),
    recoveryBox: document.getElementById('recoveryBox'),
    recoveryPhone: document.getElementById('recoveryPhone'),
    recoveryOTP: document.getElementById('recoveryOTP'),
    recoveryError: document.getElementById('recoveryError'),
    forgotPasswordLink: document.getElementById('forgotPasswordLink'),
    backToLoginLink: document.getElementById('backToLoginLink'),
    sendOTPBtn: document.getElementById('sendOTPBtn'),
    verifyOTPBtn: document.getElementById('verifyOTPBtn'),
    displayPhone: document.getElementById('displayPhone'),
};

let userData = null;
let currentTheme = localStorage.getItem('theme') || 'dark';

// --- Helper Functions ---

function formatDateTime(value) {
    if (!value) return 'Never';
    const date = new Date(value);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function calculateAccountAge(memberSince) {
    if (!memberSince) return 'N/A';
    const joined = new Date(memberSince);
    const now = new Date();
    const years = now.getFullYear() - joined.getFullYear();
    const months = now.getMonth() - joined.getMonth();
    const totalMonths = years * 12 + months;

    if (totalMonths < 1) return 'Less than 1 month';
    if (totalMonths === 1) return '1 month';

    const yearsPart = Math.floor(totalMonths / 12);
    const monthsPart = totalMonths % 12;
    if (yearsPart === 0) return `${totalMonths} months`;
    if (monthsPart === 0) return `${yearsPart} year${yearsPart === 1 ? '' : 's'}`;
    return `${yearsPart} year${yearsPart === 1 ? '' : 's'} ${monthsPart} month${monthsPart === 1 ? '' : 's'}`;
}

function showStatus(message, type = 'info') {
    if (!elements.statusMessage) return;
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = 'status-message ' + type;
    clearTimeout(showStatus.timeout);
    showStatus.timeout = setTimeout(() => {
        elements.statusMessage.textContent = '';
    }, 4500);
}

function showModal(contentHtml, options = {}) {
    elements.modalBody.innerHTML = contentHtml;
    elements.modal.classList.remove('hidden');
    elements.modal.setAttribute('aria-hidden', 'false');
    if (options.onOpen) options.onOpen();
}

function hideModal() {
    elements.modal.classList.add('hidden');
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.modalBody.innerHTML = '';
}

// --- Data Management Functions ---

async function fetchProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}

async function updateProfileField(field, value) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);

    if (error) {
        showStatus('Update failed: ' + error.message, 'error');
    } else {
        userData = await fetchProfile(user.id);
        updateDashboard();
        showStatus('Profile updated.', 'success');
    }
}

function updateDashboard() {
    if (!userData) return;
    const { username, status, member_since, sessions, security_level, email, phone, location } = userData;

    elements.userDisplay.textContent = username || email || 'User';
    
    // Update New Info Bar
    const branchDisplay = document.getElementById('branchDisplay');
    const phoneDisplay = document.getElementById('phoneDisplay');
    if (branchDisplay) branchDisplay.textContent = location || 'Not Set';
    if (phoneDisplay) phoneDisplay.textContent = phone || 'Not Set';

    // Update individual profile fields if elements exist
    if (elements.displayUsername) elements.displayUsername.textContent = username || 'Not set';
    if (elements.displayPhone) elements.displayPhone.textContent = phone || 'N/A';

    // Update Email display carefully
    const emailEl = document.getElementById('displayEmail'); // We should check if we have an ID for email value
    // Since email might be in a span inside card-item, I'll update the value span in the Security & Access card
    const securityCard = document.querySelector('.info-card:nth-child(2)');
    if (securityCard) {
        const emailValue = securityCard.querySelector('.card-item:nth-child(2) .value');
        if (emailValue) emailValue.textContent = email || 'N/A';
    }
}

// --- Auth Handlers ---

async function handleLogin(event) {
    event.preventDefault();
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerText = 'Logging in...';
    elements.errorMsg.textContent = '';

    const email = document.getElementById('username').value.trim(); 
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        let msg = error.message;
        if (msg === 'Email not confirmed') msg = 'Please confirm your email address to log in.';
        if (msg === 'Invalid login credentials') msg = 'Incorrect email or password.';
        elements.errorMsg.textContent = msg;
        loginBtn.disabled = false;
        loginBtn.innerText = 'Log In';
    } else {
        showStatus('Welcome back!', 'success');
        // Initializing will happen via onAuthStateChange
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    const signupBtn = document.getElementById('signupBtn');
    signupBtn.disabled = true;
    signupBtn.innerText = 'Creating Account...';
    elements.signupError.textContent = '';

    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const branch = document.getElementById('signupBranch').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) {
        elements.signupError.textContent = 'Passwords do not match.';
        signupBtn.disabled = false;
        signupBtn.innerText = 'Create Account';
        return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        phone,
        options: {
            data: {
                username,
                phone,
                branch
            }
        }
    });

    if (signupError) {
        let msg = signupError.message;
        if (msg.includes('Email rate limit exceeded')) {
            msg = 'Email limit reached. Please wait a few minutes or try again later.';
        }
        elements.signupError.textContent = msg;
        signupBtn.disabled = false;
        signupBtn.innerText = 'Create Account';
        return;
    }

    if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert([{
                id: data.user.id,
                username,
                email,
                phone,
                location: branch,
                member_since: new Date().toISOString()
            }]);

        if (profileError) console.error('Profile creation error:', profileError);
        
        showStatus('Success! Please confirm your email and log in.', 'success');
        showLoginForm();
    }
}

async function showLoginForm() {
    elements.signupBox.style.display = 'none';
    elements.recoveryBox.style.display = 'none';
    elements.loginBox.style.display = 'block';
}

function showRecoveryForm() {
    elements.loginBox.style.display = 'none';
    elements.signupBox.style.display = 'none';
    elements.recoveryBox.style.display = 'block';
    document.getElementById('recoveryPhoneStep').style.display = 'block';
    document.getElementById('recoveryVerifyStep').style.display = 'none';
    elements.recoveryError.textContent = '';
}

async function handleSendOTP() {
    const phone = elements.recoveryPhone.value.trim();
    if (!phone) {
        elements.recoveryError.textContent = 'Please enter a phone number.';
        return;
    }

    elements.sendOTPBtn.disabled = true;
    elements.sendOTPBtn.innerText = 'Sending...';

    const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
    });

    if (error) {
        elements.recoveryError.textContent = error.message;
        elements.sendOTPBtn.disabled = false;
        elements.sendOTPBtn.innerText = 'Send OTP';
    } else {
        document.getElementById('recoveryPhoneStep').style.display = 'none';
        document.getElementById('recoveryVerifyStep').style.display = 'block';
        showStatus('OTP sent to your phone.', 'success');
    }
}

async function handleVerifyOTP() {
    const phone = elements.recoveryPhone.value.trim();
    const otp = elements.recoveryOTP.value.trim();

    if (!otp) {
        elements.recoveryError.textContent = 'Please enter the OTP code.';
        return;
    }

    elements.verifyOTPBtn.disabled = true;
    elements.verifyOTPBtn.innerText = 'Verifying...';

    const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
    });

    if (error) {
        elements.recoveryError.textContent = error.message;
        elements.verifyOTPBtn.disabled = false;
        elements.verifyOTPBtn.innerText = 'Verify & Login';
    } else {
        showStatus('Logged in via OTP.', 'success');
        showLoginForm(); // onAuthStateChange will take it from here
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    showStatus('Logged out.', 'info');
}

// --- Settings Modals ---

function handleEditProfile() {
    const content = `
        <h2 id="modalTitle">Edit Profile</h2>
        <div class="modal-form">
            <div class="settings-section">
                <h3>Personal Information</h3>
                <label>Username</label>
                <input type="text" id="editUsername" value="${userData?.username || ''}">
                <label>Phone Number</label>
                <input type="tel" id="editPhone" value="${userData?.phone || ''}">
                <label>Location</label>
                <input type="text" id="editLocation" value="${userData?.location || ''}">
                <button id="saveProfileBtn" class="option-btn" style="background: var(--accent-color); color: white; margin-top:15px;">Save Changes</button>
            </div>
            
            <div class="settings-section">
                <h3>Update Password</h3>
                <label>New Password</label>
                <input type="password" id="newPassword" placeholder="Enter new password">
                <label>Confirm Password</label>
                <input type="password" id="confirmNewPassword" placeholder="Confirm new password">
                <button id="changePasswordBtn" class="option-btn" style="background: var(--accent-color); color: white; margin-top:15px;">Update Password</button>
            </div>

            <button id="closeModalBtn" class="option-btn" style="width: 100%; margin-top: 15px;">Close</button>
        </div>
    `;

    showModal(content, {
        onOpen() {
            document.getElementById('saveProfileBtn').onclick = async () => {
                const newUsername = document.getElementById('editUsername').value;
                const newPhone = document.getElementById('editPhone').value;
                const newLocation = document.getElementById('editLocation').value;
                await updateProfileField('username', newUsername);
                await updateProfileField('phone', newPhone);
                await updateProfileField('location', newLocation);
                hideModal();
            };

            document.getElementById('changePasswordBtn').onclick = async () => {
                const pass = document.getElementById('newPassword').value;
                const confirm = document.getElementById('confirmNewPassword').value;
                if (pass !== confirm) {
                    showStatus('Passwords do not match.', 'error');
                    return;
                }
                const { error } = await supabase.auth.updateUser({ password: pass });
                if (error) showStatus(error.message, 'error');
                else showStatus('Password updated successfully.', 'success');
            };

            document.getElementById('closeModalBtn').onclick = hideModal;
        }
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    // Refresh settings modal to update button text
    handleSettings();
}

function showView(viewName) {
    const dashboard = document.querySelector('.dashboard-container');
    const settingsView = document.getElementById('settingsView');
    const notesView = document.getElementById('notesView');
    const menuBtn = document.getElementById('menuBtn');

    // Hide all
    dashboard.style.display = 'none';
    settingsView.style.display = 'none';
    notesView.style.display = 'none';

    if (viewName === 'dashboard') {
        dashboard.style.display = 'block';
        if (menuBtn) menuBtn.textContent = '☰';
    } else if (viewName === 'settings') {
        settingsView.style.display = 'block';
        if (menuBtn) menuBtn.textContent = '✕';
        renderSettingsContent();
    } else if (viewName === 'notes') {
        notesView.style.display = 'block';
        if (menuBtn) menuBtn.textContent = '☰';
    }
}

async function handleSettings() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsContent = document.getElementById('settingsContent');
    
    settingsOverlay.style.display = 'flex';
    
    settingsContent.innerHTML = ``;
    renderSettingsContent();
}

function closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

function renderSettingsContent() {
    const settingsView = document.getElementById('settingsContent');
    if (!settingsView) return;

    settingsView.innerHTML = `
        <div class="settings-panel">
            <div class="settings-section">
                <h3>Personal Information</h3>
                <div class="setting-input">
                    <label>Full Names</label>
                    <input type="text" id="editUsername" value="${userData?.username || ''}">
                </div>
                <div class="setting-input">
                    <label>E-mail</label>
                    <input type="email" id="editEmail" value="${userData?.email || ''}">
                </div>
                <div class="setting-input">
                    <label>Phone Number</label>
                    <input type="tel" id="editPhone" value="${userData?.phone || ''}">
                </div>
                <div class="setting-input">
                    <label>Branch</label>
                    <input type="text" id="editLocation" value="${userData?.location || ''}">
                </div>
                <button id="saveProfileBtn" class="option-btn" style="background:var(--accent-color); color:white; width:100%;">Update Information</button>
            </div>

            <div class="settings-section">
                <h3>Security</h3>
                <div class="setting-input">
                    <label>New Password</label>
                    <input type="password" id="newPassword" placeholder="New password">
                </div>
                <div class="setting-input">
                    <label>Confirm Password</label>
                    <input type="password" id="confirmNewPassword" placeholder="Confirm new password">
                </div>
                <button id="changePasswordBtn" class="option-btn" style="background:var(--accent-color); color:white; width:100%;">Update Password</button>
            </div>

            <div class="settings-section">
                <h3>Preferences</h3>
                <div class="theme-toggle-wrapper">
                    <label style="margin: 0;">Dark Mode</label>
                    <label class="switch">
                        <input type="checkbox" id="themeToggleCheckbox" ${currentTheme === 'dark' ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="logout-section" style="margin-top: 20px; border-top:1px solid var(--border-color); padding-top:20px;">
                <button id="logoutPanelBtn" class="logout-panel-btn">Log Out</button>
                <button id="closeSettingsBtn" class="option-btn" style="width: 100%; margin-top: 10px;">Close Settings</button>
            </div>
        </div>
    `;

    // Bind events
    document.getElementById('saveProfileBtn').onclick = async () => {
        const btn = document.getElementById('saveProfileBtn');
        const originalText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        const newUsername = document.getElementById('editUsername').value;
        const newEmail = document.getElementById('editEmail').value;
        const newPhone = document.getElementById('editPhone').value;
        const newLocation = document.getElementById('editLocation').value;

        try {
            const userId = (await supabase.auth.getSession()).data.session.user.id;
            
            // 1. Update Profile Table (UPSERT ensures it's created if missing)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ 
                    id: userId,
                    username: newUsername,
                    email: newEmail,
                    phone: newPhone,
                    location: newLocation
                });

            // 2. Update Auth Metadata for extra permanence
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    username: newUsername,
                    phone: newPhone,
                    branch: newLocation,
                    display_email: newEmail
                }
            });

            if (profileError || authError) {
                showStatus('Update failed. Please try again.', 'error');
            } else {
                userData = await fetchProfile(userId);
                updateDashboard();
                showStatus('Profile updated permanently.', 'success');
            }
        } catch (err) {
            showStatus('An error occurred during save.', 'error');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    document.getElementById('changePasswordBtn').onclick = async () => {
        const pass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;
        if (pass !== confirm) {
            showStatus('Passwords do not match.', 'error');
            return;
        }
        const { error } = await supabase.auth.updateUser({ password: pass });
        if (error) showStatus(error.message, 'error');
        else showStatus('Password updated successfully.', 'success');
    };

    document.getElementById('themeToggleCheckbox').onchange = () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    };

    document.getElementById('logoutPanelBtn').onclick = handleLogout;
    document.getElementById('closeSettingsModalBtn').onclick = () => {
        document.getElementById('settingsOverlay').style.display = 'none';
    };
}

// --- UI Toggle Functions ---

function showSignUpForm() {
    elements.loginBox.style.display = 'none';
    elements.signupBox.style.display = 'block';
}
// --- Initialization ---

function bindEvents() {
    elements.loginForm.addEventListener('submit', handleLogin);
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignUp);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    elements.signupLink.addEventListener('click', e => { e.preventDefault(); showSignUpForm(); });
    elements.loginLink.addEventListener('click', e => { e.preventDefault(); showLoginForm(); });
    elements.forgotPasswordLink.addEventListener('click', e => { e.preventDefault(); showRecoveryForm(); });
    elements.backToLoginLink.addEventListener('click', e => { e.preventDefault(); showLoginForm(); });
    elements.sendOTPBtn.addEventListener('click', handleSendOTP);
    elements.verifyOTPBtn.addEventListener('click', handleVerifyOTP);
    
    elements.menuBtn.addEventListener('click', handleSettings);
    elements.modalOverlay.addEventListener('click', hideModal);

    // Bind Junior Youth Notes Card
    const notesCard = document.querySelector('.action-card');
    if (notesCard) {
        notesCard.addEventListener('click', () => showView('notes'));
    }

    const backToDashBtn = document.getElementById('backToDashBtn');
    if (backToDashBtn) {
        backToDashBtn.addEventListener('click', () => showView('dashboard'));
    }
    const setupToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.onclick = () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.textContent = isPassword ? '👁️‍🗨️' : '👁️';
            };
        }
    };

    setupToggle('toggleLoginPassword', 'password');
    setupToggle('toggleSignupPassword', 'signupPassword');
    setupToggle('toggleSignupConfirmPassword', 'signupConfirmPassword');
}

async function init() {
    applyTheme(currentTheme);
    bindEvents();

    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    
    const updateUI = async (session) => {
        if (session) {
            elements.loginDiv.style.display = 'none';
            elements.mainContent.style.display = 'block';
            userData = await fetchProfile(session.user.id);
            updateDashboard();
        } else {
            elements.loginDiv.style.display = 'flex';
            elements.mainContent.style.display = 'none';
            userData = null;
        }
    };

    updateUI(session);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        updateUI(session);
    });
}

init();
