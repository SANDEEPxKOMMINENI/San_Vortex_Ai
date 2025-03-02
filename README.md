# SAN_Vortex_AI GPT

A modern ChatGPT clone built with React, TypeScript, and Supabase.

## Features

- 🔐 User authentication with Supabase Auth
- 💬 Chat with multiple AI models via OpenRouter
- 📁 Organize chats in folders
- ⭐ Favorite important conversations
- 📱 Responsive design for all devices
- 🌙 Theme customization
- 📷 Image and PDF upload support
- 👤 User profiles and settings

## Tech Stack

- React with TypeScript
- Tailwind CSS for styling
- Supabase for backend (auth, database, storage)
- OpenRouter for AI model access
- Zustand for state management
- React Markdown for message rendering

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/sandy-gpt.git
cd sandy-gpt
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Create a `.env` file based on `.env.example` and add your Supabase credentials

4. Start the development server
```bash
npm run dev
# or
yarn dev
```
4. go to profile and save the api from 
```bash
https://openrouter.ai/settings/keys

copy the newly create api key in profile and save and then refresh after saving

then boom you are free to use your own personal chat bot with more advanced models than chatgpt
```

### Setting up Supabase

1. Create a new Supabase project
2. Run the SQL migrations in the `supabase/migrations` folder
3. Set up storage buckets for avatars and chat files
4. Update your `.env` file with the Supabase URL and anon key

## Deployment

The app can be deployed to any static hosting service like Netlify, Vercel, or GitHub Pages.

## License

MIT
