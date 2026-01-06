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

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
// TODO: Replace these with your actual Supabase URL and Anon Key from your project dashboard.
// IMPORTANT: Ensure you have created a table named 'codes' with columns:
// id (uuid), title (text), language (text), code (text), input (text), output (text), created_at (timestamp)
// AND Disable RLS (Row Level Security) for this table to allow anonymous reads/writes.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const langCompartment = new Compartment();
const languageSelect = document.getElementById('language-select');
const runBtn = document.getElementById('run-btn');
const saveBtn = document.getElementById('save-btn');
const outputElement = document.getElementById('output');
const inputElement = document.getElementById('input-area');
const clearBtn = document.getElementById('clear-btn');
const savedList = document.getElementById('saved-list');

// Modal Elements
const saveModal = document.getElementById('save-modal');
const codeTitleInput = document.getElementById('code-title');
const cancelSaveBtn = document.getElementById('cancel-save-btn');
const confirmSaveBtn = document.getElementById('confirm-save-btn');

let currentCodeId = null; // Track currently open code ID

// Animate Title Letter by Letter
const title = document.getElementById('app-title');
if (title) {
    const text = title.innerText;
    title.innerHTML = '';
    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerText = char === ' ' ? '\u00A0' : char; // Keep spaces
        span.className = 'thunder-char';
        span.style.animationDelay = `${Math.random() * 2}s`;
        title.appendChild(span);
    });
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
            oneDark,
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
// SUPABASE FUNCTIONS
// ==========================================

async function loadSavedCodes() {
    savedList.innerHTML = '<li class="empty-state">Loading...</li>';

    // Fetch list of codes
    const { data, error } = await supabase
        .from('codes')
        .select('id, title, language, created_at')
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

    savedList.innerHTML = '';
    data.forEach(code => {
        const li = document.createElement('li');
        li.className = 'saved-item';

        // Structure with delete button
        li.innerHTML = `
            <div class="saved-item-header">
                <span class="saved-item-title">${code.title || 'Untitled'}</span>
                <button class="delete-btn" title="Delete" data-id="${code.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
            <div class="saved-item-meta">
                <span>${code.language}</span>
                <span>${new Date(code.created_at).toLocaleDateString()}</span>
            </div>
        `;

        // Open on click (excluding delete button)
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                openCode(code.id);
            }
        });

        // Delete Logic
        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent opening code
            if (confirm(`Delete "${code.title}"?`)) {
                await deleteCode(code.id);
            }
        });

        savedList.appendChild(li);
    });
}

async function deleteCode(id) {
    const { error } = await supabase
        .from('codes')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting: ' + error.message);
    } else {
        // If current code is deleted, reset view
        if (currentCodeId === id) {
            createNewCode();
        }
        loadSavedCodes();
    }
}

async function saveCode(titleText) {
    const code = view.state.doc.toString();
    const language = languageSelect.value;
    const input = inputElement.value;
    const output = outputElement.textContent;

    const payload = {
        title: titleText,
        language,
        code,
        input,
        output,
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
        const result = await supabase
            .from('codes')
            .update(payload)
            .eq('id', currentCodeId)
            .select();
        error = result.error;
        data = result.data;
    } else {
        // Insert new
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
        alert('Error saving code: ' + error.message);
    } else {
        if (data && data.length > 0) {
            currentCodeId = data[0].id;
            closeModal();
            loadSavedCodes(); // Refresh list
            // Visual feedback could go here
        }
    }
}

async function openCode(id) {
    const { data, error } = await supabase
        .from('codes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Error opening code: ' + error.message);
        return;
    }

    if (data) {
        // Load into editor
        currentCodeId = data.id;

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
        const activeItem = Array.from(document.querySelectorAll('.saved-item')).find(el => el.innerHTML.includes(data.title));
        if (activeItem) activeItem.classList.add('active-item');
    }
}

// Auto-save Logic (Optional, Simple implementation)
const AUTO_SAVE_INTERVAL = 3000;
let autoSaveTimer;

function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(async () => {
        if (currentCodeId) {
            // Only auto-save if we are editing an existing record
            const code = view.state.doc.toString();
            const input = inputElement.value;
            const output = outputElement.textContent;

            await supabase
                .from('codes')
                .update({
                    code,
                    input,
                    output,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentCodeId);

            // Quietly fail or succeed
            console.log('Auto-saved');
        }
    }, AUTO_SAVE_INTERVAL);
}

// Start auto-saver
startAutoSave();

// ==========================================
// UI EVENTS
// ==========================================

const newCodeBtn = document.getElementById('new-code-btn');

function createNewCode() {
    // Confirm if there are unsaved changes? (Skipping for simplicity as per requirements)

    currentCodeId = null;

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
    outputElement.textContent = 'New file created. Ready to code.';
    outputElement.className = 'io-content';
}

newCodeBtn.addEventListener('click', createNewCode);

function openSaveModal() {
    if (currentCodeId) {
        // Just save without modal if ID exists
        saveCode(null);
    } else {
        saveModal.classList.add('active');
        codeTitleInput.focus();
    }
}

function closeModal() {
    saveModal.classList.remove('active');
    codeTitleInput.value = '';
}

saveBtn.addEventListener('click', openSaveModal);
cancelSaveBtn.addEventListener('click', closeModal);
confirmSaveBtn.addEventListener('click', () => {
    const title = codeTitleInput.value.trim();
    if (!title) {
        alert('Please enter a title');
        return;
    }
    saveCode(title);
});

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
languageSelect.addEventListener('change', (e) => {
    const lang = e.target.value;

    // Switch Language Mode
    view.dispatch({
        effects: langCompartment.reconfigure(getLanguageExtension(lang))
    });

    // Update Template ONLY if new - logic:
    // Ideally we don't want to wipe user code when switching lang if they are just browsing
    // But for a simple editor -> switch template is standard behavior unless we track content per lang
    // For now, let's keep it simple but confirm
    if (confirm("Switching language will replace current code with a template. Continue?")) {
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

clearBtn.addEventListener('click', () => {
    // Clear the active panel content
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'output') {
        outputElement.textContent = '';
    } else {
        inputElement.value = '';
    }
});

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

// Load codes on start
loadSavedCodes();
