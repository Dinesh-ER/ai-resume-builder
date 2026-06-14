# AI-Powered Resume Builder

A professional, full-featured resume builder that leverages Google's Gemini AI to help users craft high-quality resumes. Create, format, and export your professional history with the power of generative AI.

## 🚀 Features

- **AI Content Generation:** Automatically generate professional summaries and work experience bullet points using Google Gemini.
- **Real-time Preview:** See your resume updates instantly as you fill out the forms.
- **Dynamic Formatting:** Professional layouts with automatic word-wrapping and spacing management.
- **Export to PDF:** Generate and download high-quality PDF versions of your resume.
- **Responsive Design:** Optimized for both desktop and mobile resume editing.

## 🛠 Tech Stack

- **Frontend:** [React.js](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Routing:** [React Router](https://reactrouter.com/)
- **AI Integration:** [Google Generative AI (Gemini API)](https://ai.google.dev/)
- **Styling:** CSS3 / Modern Flexbox & Grid

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.x or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Google Cloud / AI Studio account to get a Gemini API Key.

## ⚙️ Getting Started

### 1. Clone the repository
```sh
git clone https://github.com/your-username/resume-builder.git
cd resume-builder
```

### 2. Install dependencies
```sh
npm install
```

### 3. Environment Configuration (API Key Setup)
The application requires an API key from Google AI Studio to use the AI-powered features.

1.  Go to the [Google AI Studio](https://aistudio.google.com/) and create a new API Key.
2.  In the root directory of this project, create a new file named `.env`:
    ```sh
    # On Windows (Command Prompt)
    type NUL > .env
    # On Linux/macOS/Git Bash
    touch .env
    ```
3.  Open the `.env` file and add your API key like this:
    ```env
    VITE_GOOGLE_AI_API_KEY=your_actual_api_key_here
    ```
    > **Note:** Because this project uses **Vite**, environment variables must be prefixed with `VITE_` to be accessible in your application code.

### 4. Run the Development Server
```sh
npm run dev
```
The application should now be running on `http://localhost:5173` (or the port shown in your terminal).

## 🏗️ Production Build

To create an optimized production build, run:
```sh
npm run build
```
The output files will be located in the `dist/` directory, ready for deployment to platforms like Vercel, Netlify, or GitHub Pages.

## 🤝 Contributing

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.
Copyright (c) 2026 Dinesh-kumar