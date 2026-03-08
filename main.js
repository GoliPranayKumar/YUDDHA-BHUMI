import { basicSetup } from "codemirror"
import { EditorView, keymap } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { defaultKeymap } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { cpp } from "@codemirror/lang-cpp"
import { java } from "@codemirror/lang-java"
import { oneDark } from "@codemirror/theme-one-dark"
import { createClient } from "@supabase/supabase-js"

// Theme Extension wrapper to allowing toggling
const themeCompartment = new Compartment();

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
// TODO: Replace these with your actual Supabase URL and Anon Key from your project dashboard.
// IMPORTANT: Ensure you have created a table named 'codes' with columns:
// id (uuid), title (text), language (text), code (text), input (text), output (text), created_at (timestamp)
// AND Disable RLS (Row Level Security) for this table to allow anonymous reads/writes.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

let supabase;
if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
    }
} else {
    console.warn("Supabase credentials missing. App may not function correctly. Please check your .env or Vercel Environment Variables.");
}

const langCompartment = new Compartment();
const languageSelect = document.getElementById('language-select');
const runBtn = document.getElementById('run-btn');
const saveBtn = document.getElementById('save-btn');
const outputElement = document.getElementById('output');
const inputElement = document.getElementById('input-area');
const clearBtn = document.getElementById('clear-btn');
const savedList = document.getElementById('saved-list');
// newCodeBtn is declared later in original file, removing it here to keep the one near usage or move it up. 
// Moving all top-level elements up is better practice.
const newCodeBtn = document.getElementById('new-code-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');

// Auth UI Elements
const loginBtn = document.getElementById('login-btn');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');

const authModal = document.getElementById('auth-modal');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const cancelAuthBtn = document.getElementById('cancel-auth-btn');
const confirmAuthBtn = document.getElementById('confirm-auth-btn');
const authSwitchLink = document.getElementById('auth-switch-link');
const authTitle = document.getElementById('auth-title');
const authSwitchText = document.getElementById('auth-switch-text');
const togglePasswordBtn = document.getElementById('toggle-password');

let isSignUpMode = false;
let isSecretMode = false;
let user = null;

// Password Toggle Logic
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Toggle Icons
    const openEye = togglePasswordBtn.querySelector('.eye-open');
    const closedEye = togglePasswordBtn.querySelector('.eye-closed');

    if (type === 'text') {
        openEye.style.display = 'none';
        closedEye.style.display = 'block';
    } else {
        openEye.style.display = 'block';
        closedEye.style.display = 'none';
    }
});


// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const searchCodesInput = document.getElementById('search-codes');
const savedCount = document.getElementById('saved-count');

const appWrapper = document.querySelector('.app-wrapper');

// Sidebar Toggle Logic
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.classList.toggle('visible');
    appWrapper.classList.toggle('sidebar-collapsed');
}

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarCloseBtn.addEventListener('click', toggleSidebar);

// Search Logic
searchCodesInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = savedList.querySelectorAll('.saved-item');

    items.forEach(item => {
        const title = item.querySelector('.saved-item-title').innerText.toLowerCase();
        if (title.includes(term)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});


// Modal Elements
const saveModal = document.getElementById('save-modal');
const codeTitleInput = document.getElementById('code-title');
const cancelSaveBtn = document.getElementById('cancel-save-btn');
const confirmSaveBtn = document.getElementById('confirm-save-btn');

let currentCodeId = null; // Track currently open code ID

// Animate Title Letter by Letter
const title = document.getElementById('app-title');
// We will use this to show current file name
let currentCodeTitle = null;
let isRenaming = false;
let renamingId = null;

function updateTitleDisplay() {
    if (title) {
        // Restore static Branding
        title.innerText = 'Yuddha Bhumi';
        title.classList.add('thunder-text');
        title.style.fontFamily = '';
        title.style.fontSize = '';
    }
}


// Initial Code Templates
const templates = {
    javascript: `// Write your JavaScript code here
console.log("Hello from JavaScript!");

function sum(a, b) {
  return a + b;
}

console.log("Sum of 5 + 3 =", sum(5, 3));
`,
    python: `# Write your Python code here
print("Hello from Python!")

def greet(name):
    return f"Nice to meet you, {name}"

print(greet("Developer"))
`,
    cpp: `// Write your C++ code here
#include <iostream>
#include <string>

int main() {
    std::string input;
    std::cout << "Hello from C++!" << std::endl;
    // To test input, type something in the Input box
    // std::cin >> input; 
    return 0;
}
`,
    java: `// Write your Java code here
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
`
};

const getLanguageExtension = (lang) => {
    switch (lang) {
        case 'javascript': return javascript();
        case 'python': return python();
        case 'cpp': return cpp();
        case 'java': return java();
        default: return javascript();
    }
};

let view = new EditorView({
    state: EditorState.create({
        doc: templates.javascript,
        extensions: [
            basicSetup,
            keymap.of(defaultKeymap),
            themeCompartment.of(oneDark), // Default to Dark
            langCompartment.of(javascript()),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && currentCodeId) {
                    // Reset auto-save timer or trigger it
                }
            })
        ]
    }),
    parent: document.getElementById('editor')
});

// ==========================================
// THEME LOGIC
// ==========================================
function setTheme(isLight) {
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        // Remove OneDark (reconfigure to empty array = default light theme)
        view.dispatch({
            effects: themeCompartment.reconfigure([])
        });
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        view.dispatch({
            effects: themeCompartment.reconfigure(oneDark)
        });
        localStorage.setItem('theme', 'dark');
    }
}

themeToggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    setTheme(!isLight);
});

// Init Theme
if (localStorage.getItem('theme') === 'light') {
    setTheme(true);
}


// ==========================================
// AUTH LOGIC
// ==========================================

async function initAuth() {
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();
    user = data.session?.user;
    updateAuthUI();

    supabase.auth.onAuthStateChange((event, session) => {
        user = session?.user;
        updateAuthUI();
        loadSavedCodes(); // Refresh codes on auth change
        if (event === 'SIGNED_IN') closeModal();
        if (event === 'PASSWORD_RECOVERY') {
            showToast("You have signed in via a recovery link. Please update your password immediately.", "info");
            profileModal.classList.add('active'); // Open profile to allow change
            newPasswordInput.focus();
        }
    });
}

function generateLoginCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function ensureLoginCode() {
    if (!user) return;

    if (!user.user_metadata?.login_code) {
        const newCode = generateLoginCode();
        // Update metadata
        const { data, error } = await supabase.auth.updateUser({
            data: { login_code: newCode }
        });

        if (!error && data.user) {
            user = data.user; // Update local user
        }
    }
}

function updateAuthUI() {
    if (user) {
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        userAvatar.innerText = user.email.charAt(0).toUpperCase();
        userAvatar.title = user.email;
        // Enable Save/Load/Delete for user
    } else {
        loginBtn.style.display = 'block';
        userProfile.style.display = 'none';
        // Guest mode
    }
}

loginBtn.addEventListener('click', () => {
    isSignUpMode = false;
    isSecretMode = false;
    updateAuthModal();
    authModal.classList.add('active');
});

logoutBtn.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
});

cancelAuthBtn.addEventListener('click', () => {
    authModal.classList.remove('active');
    emailInput.value = '';
    passwordInput.value = '';
});

confirmAuthBtn.addEventListener('click', async () => {
    try {
        // 1. Secret Code Mode Logic
        if (isSecretMode) {
            const code = passwordInput.value;
            if (code.length !== 8 || !/^\d+$/.test(code)) {
                showToast("Code must be exactly 8 digits", "error");
                return;
            }

            const startText = confirmAuthBtn.innerText;
            confirmAuthBtn.innerText = "Verifying...";
            confirmAuthBtn.disabled = true;

            try {
                // Look up user by secret code in user_codes table
                const { data: codeData, error: lookupError } = await supabase
                    .from('user_codes')
                    .select('email, encrypted_password')
                    .eq('login_code', code)
                    .single();

                if (lookupError || !codeData) {
                    showToast("Invalid code. Please check and try again.", "error");
                    confirmAuthBtn.innerText = startText;
                    confirmAuthBtn.disabled = false;
                    return;
                }

                // Sign in with the stored credentials
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: codeData.email,
                    password: atob(codeData.encrypted_password) // Simple base64 decode
                });

                confirmAuthBtn.innerText = startText;
                confirmAuthBtn.disabled = false;

                if (signInError) {
                    showToast("Login failed: " + signInError.message, "error");
                } else {
                    showToast("Logged in successfully!", "success");
                    authModal.classList.remove('active');
                }
            } catch (e) {
                console.error("Secret login error:", e);
                showToast("Error during login: " + e.message, "error");
                confirmAuthBtn.innerText = startText;
                confirmAuthBtn.disabled = false;
            }
            return;
        }

        // 2. Standard Email/Password Mode
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showToast("Please enter email and password", "error");
            return;
        }

        const startText = confirmAuthBtn.innerText;
        confirmAuthBtn.innerText = "Processing...";
        confirmAuthBtn.disabled = true;

        let error;

        if (isSignUpMode) {
            const res = await supabase.auth.signUp({ email, password });
            error = res.error;
            if (!error && res.data.user) {
                // Generate and store secret login code
                const loginCode = generateLoginCode();
                await supabase.from('user_codes').insert({
                    user_id: res.data.user.id,
                    email: email,
                    login_code: loginCode,
                    encrypted_password: btoa(password) // Simple base64 encoding
                });

                if (!res.data.session) {
                    showToast("Sign up successful! Please check your email to confirm your account.", "success");
                    authModal.classList.remove('active');
                }
            }
        } else {
            const res = await supabase.auth.signInWithPassword({ email, password });
            error = res.error;

            // On successful login, ensure user has a secret code
            if (!error && res.data.user) {
                const { data: existingCode } = await supabase
                    .from('user_codes')
                    .select('login_code')
                    .eq('user_id', res.data.user.id)
                    .single();

                if (!existingCode) {
                    // Create code for existing user without one
                    const loginCode = generateLoginCode();
                    await supabase.from('user_codes').insert({
                        user_id: res.data.user.id,
                        email: email,
                        login_code: loginCode,
                        encrypted_password: btoa(password)
                    });
                }
            }
        }

        confirmAuthBtn.innerText = startText;
        confirmAuthBtn.disabled = false;

        if (error) {
            showToast(error.message, "error");
        } else {
            authModal.classList.remove('active'); // Close on success
        }
    } catch (e) {
        console.error("Auth Error:", e);
        showToast("Unexpected error: " + e.message, "error");
        confirmAuthBtn.disabled = false;
        confirmAuthBtn.innerText = isSignUpMode ? "Create Account" : "Log In";
    }
});

authSwitchLink.addEventListener('click', () => {
    if (isSecretMode) {
        isSecretMode = false;
        isSignUpMode = false; // Reset to Login
    } else {
        isSignUpMode = !isSignUpMode;
    }
    updateAuthModal();
});

// Add "Login with Code" Toggle
const authContainer = document.querySelector('.auth-mode-switch');
// Check if link already exists to prevent duplicates
if (!document.getElementById('code-login-link')) {
    const codeLoginTrigger = document.createElement('p');
    codeLoginTrigger.style.marginTop = '10px';
    codeLoginTrigger.innerHTML = `<a id="code-login-link" style="color: var(--text-secondary); cursor: pointer; font-size: 0.85rem;">Login with Secret Code</a>`;
    authContainer.appendChild(codeLoginTrigger);

    document.getElementById('code-login-link').addEventListener('click', () => {
        isSecretMode = true;
        updateAuthModal();
    });
}

function updateAuthModal() {
    // Reset Common Elements
    // Use closest to find the container to ensure labels are hidden too
    const emailGroup = emailInput.closest('.form-group');
    if (emailGroup) emailGroup.style.display = 'block';
    else emailInput.style.display = 'block'; // Fallback

    const passwordGroup = passwordInput.closest('.form-group');
    if (passwordGroup) passwordGroup.style.display = 'block';
    else passwordInput.parentNode.parentNode.style.display = 'block'; // Fallback

    document.getElementById('toggle-password').style.display = 'block';

    if (isSecretMode) {
        authTitle.innerText = "Secret Login";
        authSwitchText.innerText = "";
        authSwitchLink.innerText = "Back to Email Login";

        // Hide standard inputs
        if (emailGroup) emailGroup.style.display = 'none';
        else emailInput.style.display = 'none';

        // Change Password input to "Secret Code"
        const pwLabel = document.querySelector('label[for="password"]');
        if (pwLabel) pwLabel.innerText = "8-Digit Code";
        passwordInput.type = "text";
        passwordInput.placeholder = "12345678";
        passwordInput.style.paddingRight = "1rem"; // Remove eye padding space
        passwordInput.value = "";

        // Hide Eye Icon
        document.getElementById('toggle-password').style.display = 'none';
        document.getElementById('forgot-password-link').style.display = 'none';

        confirmAuthBtn.innerText = "Access";

    } else if (isSignUpMode) {
        authTitle.innerText = "Sign Up";
        confirmAuthBtn.innerText = "Create Account";
        authSwitchText.innerText = "Already have an account? ";
        authSwitchLink.innerText = "Log In";

        // Reset Standard Inputs
        const pwLabel = document.querySelector('label[for="password"]');
        if (pwLabel) pwLabel.innerText = "Password";
        passwordInput.type = "password";
        passwordInput.placeholder = "••••••••";
        passwordInput.style.paddingRight = "2.5rem";
        passwordInput.value = ""; // Clear any leftover code
        document.getElementById('forgot-password-link').style.display = 'block';

    } else {
        // Login Mode
        authTitle.innerText = "Log In";
        confirmAuthBtn.innerText = "Log In";
        authSwitchText.innerText = "Don't have an account? ";
        authSwitchLink.innerText = "Sign Up";

        // Reset Standard Inputs
        const pwLabel = document.querySelector('label[for="password"]');
        if (pwLabel) pwLabel.innerText = "Password";
        passwordInput.type = "password";
        passwordInput.placeholder = "••••••••";
        passwordInput.style.paddingRight = "2.5rem";
        passwordInput.value = ""; // Clear any leftover code
        document.getElementById('forgot-password-link').style.display = 'block';
    }
}


// ==========================================
// SUPABASE FUNCTIONS
// ==========================================

async function loadSavedCodes() {
    if (!supabase) return;
    savedList.innerHTML = '<li class="empty-state">Loading...</li>';

    // Only load if logged in? Or allow public?
    // Requirement says "Personal code storage".
    // If we have RLS enabled and we are not logged in, this will return empty or error.

    if (!user) {
        savedList.innerHTML = '<li class="empty-state">Log in to see your codes.</li>';
        return;
    }

    // Fetch list of codes
    const { data, error } = await supabase
        .from('codes')
        .select('id, title, language, created_at')
        .eq('user_id', user.id) // Filter by logged-in user
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading codes:', error);
        savedList.innerHTML = '<li class="empty-state" style="color:#ff8080">Error loading codes. Check console.</li>';
        return;
    }

    if (!data || data.length === 0) {
        savedList.innerHTML = '<li class="empty-state">No saved codes yet.</li>';
        return;
    }

    // savedCount.innerText = data.length; // Element removed
    savedList.innerHTML = '';
    data.forEach(code => {
        const li = document.createElement('li');
        li.className = 'saved-item';

        // Structure with delete button
        li.innerHTML = `
            <div class="saved-item-header">
                <span class="saved-item-title">${code.title || 'Untitled'}</span>
                <div style="display:flex; gap: 5px;">
                    <button class="icon-btn-mini rename-btn" title="Rename" data-id="${code.id}" data-title="${code.title}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="delete-btn" title="Delete" data-id="${code.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            <div class="saved-item-meta">
                <span>${code.language}</span>
                <span>${new Date(code.created_at).toLocaleDateString()}</span>
            </div>
        `;

        // Open on click (excluding actions)
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn') && !e.target.closest('.rename-btn')) {
                openCode(code.id);
            }
        });

        // Rename Logic
        const renameBtn = li.querySelector('.rename-btn');
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openRenameModal(code.id, code.title);
        });

        // Delete Logic
        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent opening code
            const confirmed = await showConfirm(
                "Delete Snippet?",
                `Are you sure you want to delete "${code.title}"?`,
                "Delete",
                "#ff8080"
            );
            if (confirmed) {
                await deleteCode(code.id);
            }
        });

        savedList.appendChild(li);
    });
}

async function deleteCode(id) {
    if (!supabase) return;
    const { error } = await supabase
        .from('codes')
        .delete()
        .eq('id', id);

    if (error) {
        showToast('Error deleting: ' + error.message, 'error');
    } else {
        // If current code is deleted, reset view
        if (currentCodeId === id) {
            createNewCode();
        }
        loadSavedCodes();
    }
}

async function saveCode(titleText) {
    if (!user) {
        showToast("Please log in to save codes.", "info");
        authModal.classList.add('active'); // Prompt login
        return;
    }

    const code = view.state.doc.toString();
    const language = languageSelect.value;
    const input = inputElement.value;
    const output = outputElement.textContent;

    // Fix: If updating and no new title provided, keep existing title
    if (titleText) {
        currentCodeTitle = titleText;
    }

    // If somehow we don't have a title yet (should be caught by validation or modal), default
    if (!currentCodeTitle) currentCodeTitle = "Untitled";

    const payload = {
        title: currentCodeTitle,
        language,
        code,
        input,
        output,
        user_id: user.id, // Explicitly set user_id
        updated_at: new Date().toISOString()
    };

    let error;
    let data;

    // Save button loading state
    const originalText = confirmSaveBtn.innerText;
    confirmSaveBtn.innerText = 'Saving...';
    confirmSaveBtn.disabled = true;

    if (currentCodeId) {
        // Update existing
        if (!supabase) return;
        const result = await supabase
            .from('codes')
            .update(payload)
            .eq('id', currentCodeId)
            .select();
        error = result.error;
        data = result.data;
    } else {
        // Insert new
        if (!supabase) return;
        const result = await supabase
            .from('codes')
            .insert([payload])
            .select();
        error = result.error;
        data = result.data;
    }

    confirmSaveBtn.innerText = originalText;
    confirmSaveBtn.disabled = false;

    if (error) {
        showToast('Error saving code: ' + error.message, 'error');
    } else {
        if (data && data.length > 0) {
            currentCodeId = data[0].id;
            // Update Title Display
            updateTitleDisplay();

            closeModal();
            loadSavedCodes(); // Refresh list
        }
    }
}

async function openCode(id) {
    if (!supabase) return;
    const { data, error } = await supabase
        .from('codes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        showToast('Error opening code: ' + error.message, 'error');
        return;
    }

    if (data) {
        // Load into editor
        currentCodeId = data.id;
        currentCodeTitle = data.title; // Fix: Store title
        updateTitleDisplay(); // Show title

        // Update Language UI
        languageSelect.value = data.language;
        view.dispatch({
            effects: langCompartment.reconfigure(getLanguageExtension(data.language))
        });

        // Update Content
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.code }
        });

        // Update Inputs/Outputs
        inputElement.value = data.input || '';
        outputElement.textContent = data.output || '';

        // Highlight active item logic
        document.querySelectorAll('.saved-item').forEach(el => el.classList.remove('active-item'));
        // Find by ID instead of title for accuracy
        const activeItem = document.querySelector(`.delete - btn[data - id="${data.id}"]`)?.closest('.saved-item');
        if (activeItem) activeItem.classList.add('active-item');
    }
}

// Auto-save Logic (Optional, Simple implementation)
const AUTO_SAVE_INTERVAL = 5000; // Increased to 5s
let autoSaveTimer;

function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(async () => {
        if (currentCodeId) {
            // Only auto-save if we are editing an existing record
            const code = view.state.doc.toString();
            const input = inputElement.value;
            const output = outputElement.textContent;

            // Minimal update
            if (supabase) {
                await supabase
                    .from('codes')
                    .update({
                        code,
                        input,
                        output,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentCodeId);

                console.log('Auto-saved');
            }
        }
    }, AUTO_SAVE_INTERVAL);
}

// Start auto-saver
startAutoSave();

// ==========================================
// UI EVENTS
// ==========================================

function createNewCode() {
    // Confirm if there are unsaved changes? (Skipping for simplicity as per requirements)

    currentCodeId = null;
    currentCodeTitle = null;
    updateTitleDisplay(); // Triggers default title

    // Reset inputs
    inputElement.value = '';
    outputElement.textContent = '';

    // Reset Language to default (JS) or keep current? Let's keep current but reset code to template.
    const lang = languageSelect.value;
    const template = templates[lang] || '';

    view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: template }
    });

    // Remove active class from sidebar items
    document.querySelectorAll('.saved-item').forEach(el => el.classList.remove('active-item'));

    // Feedback
    outputElement.textContent = 'New file created. Press Save to keep it.';
    outputElement.className = 'io-content';
}

newCodeBtn.addEventListener('click', createNewCode);

function openSaveModal() {
    isRenaming = false; // Reset mode
    renamingId = null;
    document.querySelector('#save-modal h2').innerText = "Save Snippet";
    confirmSaveBtn.innerText = "Save Code";

    if (currentCodeId) {
        // Just save without modal if ID exists
        saveCode(null);
    } else {
        saveModal.classList.add('active');
        codeTitleInput.value = currentCodeTitle || '';
        codeTitleInput.focus();
    }
}

function openRenameModal(id, currentTitle) {
    isRenaming = true;
    renamingId = id;

    document.querySelector('#save-modal h2').innerText = "Rename Snippet";
    confirmSaveBtn.innerText = "Rename";

    saveModal.classList.add('active');
    codeTitleInput.value = currentTitle || '';
    codeTitleInput.focus();
}

function closeModal() {
    saveModal.classList.remove('active');
    codeTitleInput.value = '';
    isRenaming = false;
    renamingId = null;
}

saveBtn.addEventListener('click', openSaveModal);
cancelSaveBtn.addEventListener('click', closeModal);
confirmSaveBtn.addEventListener('click', () => {
    const title = codeTitleInput.value.trim();
    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }

    if (isRenaming && renamingId) {
        performRename(renamingId, title);
    } else {
        saveCode(title);
    }
});


async function performRename(id, newTitle) {
    const originalText = confirmSaveBtn.innerText;
    confirmSaveBtn.innerText = "Renaming...";
    confirmSaveBtn.disabled = true;

    const { error } = await supabase
        .from('codes')
        .update({ title: newTitle })
        .eq('id', id);

    confirmSaveBtn.innerText = originalText;
    confirmSaveBtn.disabled = false;

    if (error) {
        showToast("Error renaming: " + error.message, "error");
    } else {
        closeModal();
        loadSavedCodes();
        // If the renamed file is currently open, update its local title state
        if (currentCodeId === id) {
            currentCodeTitle = newTitle;
            // updateTitleDisplay(); // If we were showing title in header, we'd call this
        }
    }
}


// Close modal on outside click
saveModal.addEventListener('click', (e) => {
    if (e.target === saveModal) closeModal();
});



// Piston API Run
async function runCode() {
    const lang = languageSelect.value;
    const code = view.state.doc.toString();
    const inputVal = inputElement.value; // Get input from new panel

    runBtn.disabled = true;
    const originalBtnContent = runBtn.innerHTML;
    runBtn.innerHTML = '<span class="spinner"></span> Running...';
    outputElement.textContent = 'Executing...';
    outputElement.className = 'io-content'; // Reset class

    // Map to Piston language names/versions
    const pistonConfig = {
        javascript: { language: 'javascript', version: '18.15.0' },
        python: { language: 'python', version: '3.10.0' },
        cpp: { language: 'c++', version: '10.2.0' },
        java: { language: 'java', version: '15.0.2' }
    };

    const config = pistonConfig[lang];

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: config.language,
                version: config.version,
                files: [
                    {
                        content: code
                    }
                ],
                stdin: inputVal // Pass stdin to Piston
            })
        });

        const data = await response.json();

        if (data.run) {
            outputElement.textContent = data.run.output || 'No output';
            // Piston combines stdout and stderr in .output usually, but we can check stderr
            if (data.run.stderr) {
                // optionally color it red?
            }
        } else {
            outputElement.textContent = 'Error: ' + JSON.stringify(data);
            outputElement.className = 'io-content output-error';
        }

    } catch (error) {
        outputElement.textContent = 'Network or API Execution Error: ' + error.message;
        outputElement.className = 'io-content output-error';
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnContent;
    }
}

// Event Listeners
languageSelect.addEventListener('change', async (e) => {
    const lang = e.target.value;

    // Switch Language Mode
    view.dispatch({
        effects: langCompartment.reconfigure(getLanguageExtension(lang))
    });

    // Update Template ONLY if new - logic:
    // Ideally we don't want to wipe user code when switching lang if they are just browsing
    // But for a simple editor -> switch template is standard behavior unless we track content per lang
    // For now, let's keep it simple but confirm
    if (await showConfirm("Switch Language?", "Switching language will replace current code with a template. Continue?")) {
        const currentDoc = view.state.doc.toString();
        view.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: templates[lang] || '' }
        });
        currentCodeId = null; // Reset ID as it's a new "file" essentially
    } else {
        // Revert select?
        // Implementing revert is tricky without tracking previous value
    }
});

runBtn.addEventListener('click', async () => {
    // Switch to output tab when running
    switchTab('output');
    runCode();
});

// Clear Btn Removed

// Terminal Tabs Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

function switchTab(tabName) {
    // Update Buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
        if (b.dataset.tab === tabName) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Update Panels
    document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.remove('active');
    });

    if (tabName === 'output') {
        document.getElementById('output-panel').classList.add('active');
    } else {
        document.getElementById('input-panel').classList.add('active');
    }
}

// Load codes on start if session exists
initAuth();

// ==========================================
// TOAST & CUSTOM CONFIRM LOGIC
// ==========================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Choose icon based on type
    let icon = '';
    if (type === 'success') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    else if (type === 'error') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    else icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

function showConfirm(title, message, confirmText = 'Confirm', confirmColor = '#646cff') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        titleEl.innerText = title;
        msgEl.innerText = message;
        okBtn.innerText = confirmText;
        okBtn.style.background = confirmColor;

        modal.classList.add('active');

        // Handles cleanup to avoid multiple listeners
        const handleOk = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// Custom Password Prompt Modal (replaces browser prompt)
function showPasswordPrompt(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('password-verify-modal');
        const titleEl = document.getElementById('password-verify-title');
        const passwordInput = document.getElementById('verify-password-input');
        const confirmBtn = document.getElementById('verify-confirm-btn');
        const cancelBtn = document.getElementById('verify-cancel-btn');

        titleEl.innerText = title;
        passwordInput.value = '';

        modal.classList.add('active');
        passwordInput.focus();

        const handleConfirm = () => {
            const password = passwordInput.value;
            cleanup();
            resolve(password || null);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };

        const cleanup = () => {
            modal.classList.remove('active');
            passwordInput.value = '';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            passwordInput.removeEventListener('keydown', handleKeydown);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        passwordInput.addEventListener('keydown', handleKeydown);
    });
}

// ==========================================
// PROFILE & FORGOT PASSWORD LOGIC
// ==========================================

const forgotPasswordLink = document.getElementById('forgot-password-link');
const profileModal = document.getElementById('profile-modal');
const closeProfileBtn = document.getElementById('close-profile-btn');
const profileAvatarLarge = document.getElementById('profile-avatar-large');
const profileEmail = document.getElementById('profile-email');
const profileJoined = document.getElementById('profile-joined');
const newPasswordInput = document.getElementById('new-password');
const changePasswordBtn = document.getElementById('change-password-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const secretCodeDisplay = document.getElementById('secret-code-display');
const revealCodeBtn = document.getElementById('reveal-code-btn');
const copyCodeBtn = document.getElementById('copy-code-btn');

// Store the actual code (hidden by default)
let actualSecretCode = null;
let codeRevealTimeout = null;

// Forgot Password
forgotPasswordLink.addEventListener('click', async () => {
    if (!supabase) return;
    const email = emailInput.value;
    if (!email) {
        showToast("Please enter your email address in the login form first.", "error");
        return;
    }

    const originalText = forgotPasswordLink.innerText;
    forgotPasswordLink.innerText = "Sending...";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href, // Redirect back here
    });

    if (error) {
        showToast("Error sending reset email: " + error.message, "error");
    } else {
        showToast("Password reset email sent! Please check your inbox.", "success");
    }

    forgotPasswordLink.innerText = originalText;
});

// Open Profile
userProfile.addEventListener('click', async (e) => {
    // Prevent opening if clicking logout
    if (e.target.closest('#logout-btn')) return;

    if (user) {
        profileModal.classList.add('active');
        profileAvatarLarge.innerText = user.email.charAt(0).toUpperCase();
        profileEmail.innerText = user.email;

        // Reset code display to hidden
        secretCodeDisplay.innerText = '********';
        actualSecretCode = null;

        // Fetch the user's secret code from user_codes table
        if (!supabase) return;
        const { data: codeData } = await supabase
            .from('user_codes')
            .select('login_code')
            .eq('user_id', user.id)
            .single();

        if (codeData) {
            actualSecretCode = codeData.login_code;
        } else {
            actualSecretCode = 'NOT SET';
        }

        const joinedDate = new Date(user.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        profileJoined.innerText = `Joined: ${joinedDate}`;
    }
});

// Reveal Code Button - Requires password verification
revealCodeBtn.addEventListener('click', async () => {
    if (!actualSecretCode || actualSecretCode === 'NOT SET') {
        showToast("No secret code found. Please log out and log back in.", "error");
        return;
    }

    // Check if already revealed
    if (secretCodeDisplay.innerText !== '********') {
        // Hide it
        secretCodeDisplay.innerText = '********';
        if (codeRevealTimeout) {
            clearTimeout(codeRevealTimeout);
            codeRevealTimeout = null;
        }
        return;
    }

    // Show in-app password prompt
    const password = await showPasswordPrompt("Reveal Secret Code", "Enter your password to reveal the secret code.");

    if (!password) {
        return;
    }

    // Verify password by attempting to re-authenticate
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
    });

    if (error) {
        showToast("Incorrect password. Cannot reveal code.", "error");
        return;
    }

    // Show the code
    secretCodeDisplay.innerText = actualSecretCode;
    showToast("Code revealed! It will hide automatically in 10 seconds.", "info");

    // Auto-hide after 10 seconds
    codeRevealTimeout = setTimeout(() => {
        secretCodeDisplay.innerText = '********';
        codeRevealTimeout = null;
    }, 10000);
});

// Copy Code Button
copyCodeBtn.addEventListener('click', async () => {
    if (!actualSecretCode || actualSecretCode === 'NOT SET') {
        showToast("No secret code to copy.", "error");
        return;
    }

    // If code is not revealed, prompt for password first
    if (secretCodeDisplay.innerText === '********') {
        const password = await showPasswordPrompt("Copy Secret Code", "Enter your password to copy the secret code.");

        if (!password) {
            return;
        }

        // Verify password
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (error) {
            showToast("Incorrect password. Cannot copy code.", "error");
            return;
        }
    }

    // Copy to clipboard
    try {
        await navigator.clipboard.writeText(actualSecretCode);
        showToast("Secret code copied to clipboard!", "success");
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = actualSecretCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast("Secret code copied to clipboard!", "success");
    }
});

// Close Profile
closeProfileBtn.addEventListener('click', () => {
    profileModal.classList.remove('active');
    newPasswordInput.value = '';
    secretCodeDisplay.innerText = '********';
    if (codeRevealTimeout) {
        clearTimeout(codeRevealTimeout);
        codeRevealTimeout = null;
    }
});

// Close on outside click
profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.classList.remove('active');
        newPasswordInput.value = '';
        secretCodeDisplay.innerText = '********';
        if (codeRevealTimeout) {
            clearTimeout(codeRevealTimeout);
            codeRevealTimeout = null;
        }
    }
});

// Change Password
changePasswordBtn.addEventListener('click', async () => {
    const newPassword = newPasswordInput.value;
    if (!newPassword || newPassword.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    const originalText = changePasswordBtn.innerText;
    changePasswordBtn.innerText = "Updating...";
    changePasswordBtn.disabled = true;

    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        showToast("Error updating password: " + error.message, "error");
    } else {
        showToast("Password updated successfully!", "success");
        newPasswordInput.value = '';
    }

    changePasswordBtn.innerText = originalText;
    changePasswordBtn.disabled = false;
});

// Delete Account Data
deleteAccountBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm(
        "Delete Account?",
        "Are you SURE you want to delete your account? This will permanently delete all your saved codes. This action cannot be undone.",
        "Delete Forever",
        "#ff8080"
    );

    if (confirmed) {
        const originalText = deleteAccountBtn.innerText;
        deleteAccountBtn.innerText = "Deleting...";
        deleteAccountBtn.disabled = true;

        // 1. Delete all codes
        if (!supabase) return;
        const { error: deleteError } = await supabase
            .from('codes')
            .delete()
            .eq('user_id', user.id);

        if (deleteError) {
            showToast("Error deleting data: " + deleteError.message, "error");
            deleteAccountBtn.innerText = originalText;
            deleteAccountBtn.disabled = false;
            return;
        }

        // 2. Sign Out
        await supabase.auth.signOut();

        showToast("Your data has been deleted and you have been logged out.", "success");
        profileModal.classList.remove('active');

        // UI naturally updates via onAuthStateChange
    }
});

