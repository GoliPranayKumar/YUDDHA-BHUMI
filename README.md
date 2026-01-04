# Simple Code IDE

A fast, lightweight online code editor built with [Vite](https://vitejs.dev/) and [CodeMirror 6](https://codemirror.net/).

## Features

- **Multi-language Support**: JavaScript, Python, C++, Java.
- **Code Execution**: Runs code seamlessly using the [Piston API](https://piston.readthedocs.io/).
  > **Note**: This is a secure environment that doesn't accept runtime input. Please use fixed values in your code.
- **Modern UI**: Dark mode, glassmorphism design, and responsive layout.

## Getting Started

1.  Navigate to the project directory:
    ```bash
    cd code-editor
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open the local URL (typically `http://localhost:5173`) in your browser.

## Technologies

- **Vite**: Vanilla JS bundler.
- **CodeMirror 6**: Extensible code editor component.
- **Piston API**: Safe remote code execution engine.
