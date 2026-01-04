import { basicSetup } from "codemirror"
import { EditorView, keymap } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { defaultKeymap } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { cpp } from "@codemirror/lang-cpp"
import { java } from "@codemirror/lang-java"
import { oneDark } from "@codemirror/theme-one-dark"

const langCompartment = new Compartment();
const languageSelect = document.getElementById('language-select');
const runBtn = document.getElementById('run-btn');
const outputElement = document.getElementById('output');
const clearBtn = document.getElementById('clear-btn');

// Animate Title Letter by Letter
const title = document.getElementById('app-title');
if (title) {
    const text = title.innerText;
    title.innerHTML = '';
    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerText = char === ' ' ? '\u00A0' : char; // Keep spaces
        span.className = 'thunder-char';
        // Randomize delay for a more chaotic "storm" feel, or sequential
        // Let's go with semi-random to look like flickering lights/lightning
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

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}
`,
    java: `// Write your Java code here
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
            langCompartment.of(javascript())
        ]
    }),
    parent: document.getElementById('editor')
});

// Piston API Run
async function runCode() {
    const lang = languageSelect.value;
    const code = view.state.doc.toString();

    runBtn.disabled = true;
    const originalBtnContent = runBtn.innerHTML;
    runBtn.innerHTML = '<span class="spinner"></span> Running...';
    outputElement.textContent = 'Executing...';
    outputElement.className = '';

    // Map to Piston language names/versions
    // We hardcode versions for simplicity, ensuring compatibility with commonly available Piston runtimes
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
                ]
            })
        });

        const data = await response.json();

        if (data.run) {
            outputElement.textContent = data.run.output || 'No output';
            if (data.run.stderr) {
                // We might want to show both stdout and stderr
            }
        } else {
            outputElement.textContent = 'Error: ' + JSON.stringify(data);
            outputElement.className = 'output-error';
        }

    } catch (error) {
        outputElement.textContent = 'Network or API Execution Error: ' + error.message;
        outputElement.className = 'output-error';
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

    // Update Template
    const currentDoc = view.state.doc.toString();
    view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: templates[lang] || '' }
    });
});

runBtn.addEventListener('click', runCode);

clearBtn.addEventListener('click', () => {
    outputElement.textContent = '';
});
