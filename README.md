# LangRead - Language Learning Through Reading

A Readlang alternative that helps you learn languages by reading native content. Built with React, TypeScript, Express, and Gemini AI.

## Features

- **Read Native Content**: Paste or upload text in your target language
- **Instant Translations**: Click any word or phrase to get AI-powered translations and explanations
- **Vocabulary Building**: Automatically save words you look up
- **Spaced Repetition**: Practice with flashcards using the SM-2 algorithm
- **Cross-Device Sync**: Access your vocabulary and texts from any device
- **Mobile-Friendly**: Responsive design works on laptop and phone browsers

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + TypeScript + SQLite
- **AI**: Google Gemini API (cheap and effective)
- **Authentication**: JWT

## Setup Instructions

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Environment Variables

Open the `.env` file in the project root and add your Gemini API key:

```env
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
GEMINI_API_KEY=your-api-key-here
```

### 3. Install Dependencies (if not already done)

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

This will start both the backend server (on port 3001) and the frontend development server (on port 5173).

### 5. Open the App

Open your browser and go to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## How to Use

### 1. Register an Account

- Go to http://localhost:5173
- Click "Register"
- Fill in your email, password, and optionally your native language and learning language

### 2. Add a Text

- Click "+ New Text"
- Enter a title, select the language, and paste your text
- Click "Create Text"

### 3. Read and Learn

- Click "Read" on any text
- Select any word or phrase in the text
- Click "Translate" to get an AI-powered explanation
- Click "Save to Vocabulary" to add it to your word list

### 4. Practice with Flashcards

- Click "Flashcards" in the navigation
- Review words using spaced repetition
- Rate how well you remembered each word (Again, Hard, Good, Easy)
- The algorithm will schedule reviews accordingly

### 5. Manage Vocabulary

- Click "Vocabulary" to see all your saved words
- View translations, context, and review schedules
- Delete words you no longer need

## Mobile Access

The app is mobile-responsive and works in any modern browser. To access from your phone:

1. Make sure your laptop and phone are on the same network
2. Find your laptop's IP address:
   - Mac/Linux: `ifconfig | grep inet`
   - Windows: `ipconfig`
3. On your phone, go to `http://YOUR_IP:5173`
4. Register/login with the same account

## Future Android App

This project is built with React and can easily be converted to a native Android app using Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap sync
npx cap open android
```

## Database

The app uses SQLite for simplicity. The database file (`lang-read.db`) is created automatically on first run.

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/texts` - Get all texts
- `POST /api/texts` - Create a new text
- `GET /api/texts/:id` - Get a specific text
- `DELETE /api/texts/:id` - Delete a text
- `POST /api/translate` - Translate text using Gemini
- `GET /api/vocabulary` - Get all vocabulary
- `GET /api/vocabulary/due` - Get vocabulary due for review
- `POST /api/vocabulary` - Add vocabulary
- `DELETE /api/vocabulary/:id` - Delete vocabulary
- `POST /api/vocabulary/:id/review` - Review vocabulary (spaced repetition)

## Development

- Frontend runs on Vite dev server with hot reload
- Backend runs with tsx in watch mode for auto-restart
- TailwindCSS for styling with utility classes

## License

MIT

## Credits

Inspired by [Readlang](https://readlang.com) - the amazing language learning tool created by Steve Ridout.
