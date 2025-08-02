# NotebookAI Frontend

React TypeScript frontend for the NotebookAI application.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## Features

- User authentication (login/signup)
- Dashboard with notebook management
- Document upload and processing
- AI-powered chat interface
- Notes management
- Responsive design with Tailwind CSS

## Tech Stack

- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- React Router for navigation
- Axios for API communication
- Lucide React for icons

## Configuration

The frontend connects to the backend at `http://localhost:8000/api`. 
To change this, modify the `baseURL` in `src/services/api.ts`.

## Usage

1. Start the backend server first
2. Run the frontend development server
3. Open http://localhost:5173 in your browser
4. Sign up for a new account or login
5. Create notebooks and upload documents
6. Start chatting with your documents!
