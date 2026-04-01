import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase Configuration from Environment
// In a production app, these should be handled securely. 
// For this static version, we'll use the same credentials as the React app.
const SUPABASE_URL = 'https://azgbmemnmmunsisugvyl.supabase.co'
const SUPABASE_ANON_KEY = '' // Replace with your public anon public key!

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
};

let userData = null;

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
    const { username, status, member_since, sessions, security_level } = userData;

    elements.userDisplay.textContent = username || 'User';
    elements.displayUsername.textContent = username || 'Not set';
    elements.displayStatus.textContent = status || 'Active';
    elements.displayTotalSessions.textContent = sessions || 0;
    elements.displayAccountAge.textContent = calculateAccountAge(member_since);
    elements.displaySecurityLevel.textContent = security_level || 'Medium';
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
    });

    if (signupError) {
        elements.signupError.textContent = signupError.message;
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
                member_since: new Date().toISOString()
            }]);

        if (profileError) console.error('Profile creation error:', profileError);
        
        showStatus('Success! Please confirm your email and log in.', 'success');
        showLoginForm();
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
            <label>Username</label>
            <input type="text" id="editUsername" value="${userData?.username || ''}">
            <label>Location</label>
            <input type="text" id="editLocation" value="${userData?.location || ''}">
            <button id="saveProfileBtn" class="option-btn">Save Changes</button>
            <button id="closeModalBtn" class="option-btn">Close</button>
        </div>
    `;

    showModal(content, {
        onOpen() {
            document.getElementById('saveProfileBtn').onclick = async () => {
                const newUsername = document.getElementById('editUsername').value;
                const newLocation = document.getElementById('editLocation').value;
                await updateProfileField('username', newUsername);
                await updateProfileField('location', newLocation);
                hideModal();
            };
            document.getElementById('closeModalBtn').onclick = hideModal;
        }
    });
}

function handleSettings() {
    const content = `
        <h2 id="modalTitle">Settings</h2>
        <div class="option-buttons">
            <button id="editProfileBtn" class="option-btn">Edit Profile</button>
            <button id="closeSettingsBtn" class="option-btn">Close</button>
        </div>
    `;

    showModal(content, {
        onOpen() {
            document.getElementById('editProfileBtn').onclick = handleEditProfile;
            document.getElementById('closeSettingsBtn').onclick = hideModal;
        }
    });
}

// --- UI Toggle Functions ---

function showSignUpForm() {
    elements.loginBox.style.display = 'none';
    elements.signupBox.style.display = 'block';
}

function showLoginForm() {
    elements.signupBox.style.display = 'none';
    elements.loginBox.style.display = 'block';
}

// --- Initialization ---

function bindEvents() {
    elements.loginForm.addEventListener('submit', handleLogin);
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignUp);
    
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.signupLink.addEventListener('click', e => { e.preventDefault(); showSignUpForm(); });
    elements.loginLink.addEventListener('click', e => { e.preventDefault(); showLoginForm(); });
    elements.menuBtn.addEventListener('click', handleSettings);
    elements.modalOverlay.addEventListener('click', hideModal);

    // Password visibility toggles
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
