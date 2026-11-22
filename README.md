# Chirp — Social Feed & AI Assistant

Chirp is a learning project that demonstrates how a social media-style web application works. It includes a post feed, user profiles, comments, simple post interactions, and an AI chat assistant.

The project is built with **HTML5, CSS3, and vanilla JavaScript**. A small server built with Node.js handles the website and keeps the OpenRouter API key out of the browser.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Setting up Ask AI](#setting-up-ask-ai)
- [API endpoints](#api-endpoints)
- [How the project works](#how-the-project-works)
- [Important notes](#important-notes)
- [Troubleshooting](#troubleshooting)

## Features

### Social feed

- Loads sample users and posts from JSONPlaceholder.
- Shows each post with the correct author's name and username.
- Displays comments for each post.
- Lets users like and retweet posts.
- Includes a compose box with a 280-character limit.
- Adds newly created posts to the top of the feed.

### User profiles

- Opens a profile when a user's name or avatar is selected.
- Shows user information and that user's posts.
- Includes Follow and Following actions.
- Displays suggested users.

### AI assistant

- Opens from the floating Ask AI button.
- Sends questions to an AI model through OpenRouter.
- Can summarise a post and its comments.
- Keeps conversation messages during the current chat session.
- Shows loading and error messages while requests are handled.

### Custom welcome endpoint

- Provides a welcome message from the app's own server.
- Uses JavaScript to request the message and display it in the Chirp page.

### Responsive layout

- Uses a wider layout for desktop screens.
- Adjusts navigation and content for smaller screens.

## Technology

| Technology or service | Purpose |
|---|---|
| HTML5 | Builds the page structure. |
| CSS3 | Styles the page and makes the layout responsive. |
| Vanilla JavaScript | Runs the app's features in the browser. |
| Node.js | Runs the local server. |
| JSONPlaceholder | Supplies sample users, posts, and comments. |
| OpenRouter | Connects the app to an AI model. |

The project does not use React, Vue, Angular, TypeScript, Vite, or Express. The server uses built-in Node.js features, so no extra npm packages are needed for the current setup.

## Project structure

```text
chirp-media/
├── index.html
├── package.json
├── start-chirp.bat
├── server.js
├── .env.example
├── .gitignore
├── README.md
│
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── profile.css
│
├── js/
│   ├── main.js
│   ├── api.js
│   ├── feed.js
│   ├── comments.js
│   ├── interactions.js
│   ├── compose.js
│   ├── profile.js
│   └── ai-chat.js
│
└── assets/
    ├── icons/
    │   └── logo.svg
    └── images/
        └── default-cover.svg
```

### Main files

| File | What it does |
|---|---|
| `index.html` | Holds the main page structure. |
| `server.js` | Starts the local server, serves the app files, and sends AI requests to OpenRouter. |
| `js/main.js` | Starts the app and connects its main parts. |
| `js/api.js` | Gets users, posts, and comments from JSONPlaceholder. |
| `js/feed.js` | Creates and displays feed posts. |
| `js/comments.js` | Groups and displays comments. |
| `js/interactions.js` | Handles likes, retweets, and follow actions. |
| `js/compose.js` | Checks and publishes new posts. |
| `js/profile.js` | Displays user profile pages. |
| `js/ai-chat.js` | Controls the AI chat panel and sends messages to the local server. |
| `css/style.css` | Contains the main styles. |
| `css/responsive.css` | Adjusts the layout for different screen sizes. |
| `css/profile.css` | Contains profile page styles. |

## Requirements

- Node.js **20 or newer**.
- A modern web browser.
- An internet connection for JSONPlaceholder and OpenRouter.
- An OpenRouter API key to use the AI features.

You can check your installed versions in the terminal:

```bash
node -v
npm -v
```

## Getting started

1. Download or clone the project.
2. Extract the ZIP file, if you downloaded it as a ZIP.
3. Open the project folder in Visual Studio Code.
4. Open the VS Code terminal in the project folder.
5. Start the app:

   **Windows PowerShell:**

   ```powershell
   npm.cmd start
   ```

   **Command Prompt, macOS, or Linux:**

   ```bash
   npm start
   ```

6. Open the app in your browser:

   [http://localhost:3000](http://localhost:3000)

To stop the server, go to the terminal and press `Ctrl + C`.

> **Important:** Run Chirp through its Node.js server. Do not open `index.html` directly or use Live Server for the full project. The AI chat and the app's `/api/...` routes need the Node.js server.

## Setting up Ask AI

The social feed can load without an OpenRouter key. The AI chat needs a key of your own.

1. Create an account at [OpenRouter](https://openrouter.ai/).
2. Create an API key in your OpenRouter account.
3. In the main project folder, make a copy of `.env.example`.
4. Rename the copy to `.env`. Make sure it is not saved as `.env.txt`.
5. Open `.env` and add your key:

   ```env
   OPENROUTER_API_KEY=your_openrouter_key_here
   PORT=3000
   APP_URL=http://localhost:3000
   ```

6. Save the file.
7. Restart the server so it reads the new settings.

Chirp uses the OpenRouter `openrouter/free` model route. The server reads the key from `.env` and sends AI requests to OpenRouter. The key should never be placed in `index.html`, in the files inside `js/`, or in any code sent to the browser.

**Keep `.env` private.** The `.gitignore` file is set to stop Git from adding it to a commit. Do not share your key or upload the `.env` file to GitHub.

## API endpoints

### JSONPlaceholder endpoints

The app uses these external endpoints to get sample data:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `https://jsonplaceholder.typicode.com/users` | Gets sample user accounts. |
| `GET` | `https://jsonplaceholder.typicode.com/posts` | Gets sample posts. |
| `GET` | `https://jsonplaceholder.typicode.com/comments` | Gets comments for posts. |

Users and posts are requested together. Comments are requested once and grouped by post ID for use in the feed.

### Chirp's own endpoints

These routes are handled by `server.js`:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/hello` | Returns the Chirp welcome message as JSON. |
| `GET` | `/api/health` | Checks server status and whether the AI key is set. |
| `POST` | `/api/chat` | Sends chat messages to OpenRouter and returns the AI response. |

The welcome endpoint can be tested in a browser while the server is running:

[http://localhost:3000/api/hello](http://localhost:3000/api/hello)

The chat endpoint is used by the app. It expects a `POST` request with a JSON message list.

### OpenRouter endpoint

The Node.js server sends AI requests to:

```text
https://openrouter.ai/api/v1/chat/completions
```

The browser sends its chat request to Chirp's own `/api/chat` route. This keeps the OpenRouter key on the server instead of exposing it in frontend JavaScript.

## How the project works

1. The browser loads `index.html`, the CSS files, and `js/main.js`.
2. `main.js` starts the app and calls the other JavaScript modules.
3. `api.js` requests the sample data from JSONPlaceholder.
4. The feed and profile modules use that data to build the page.
5. When a user sends an AI message, `ai-chat.js` sends it to `/api/chat` on the local server.
6. `server.js` adds the private API key, sends the request to OpenRouter, and returns the AI reply to the browser.

## Important notes

- JSONPlaceholder is a sample-data service. New posts are added in the browser only; they are not saved to JSONPlaceholder.
- Likes, retweets, follows, and newly created posts are temporary. They are not stored in a database and may reset when the page is refreshed.
- Profile details that are not provided by JSONPlaceholder, such as bios and follower counts, are demonstration values.
- Profile photos are optional. The app can use initials when no avatar image is available.
- OpenRouter model availability and response time can vary. The free model route may choose different models for different requests.

## Troubleshooting

### PowerShell says that `npm.ps1` cannot run

Use this command instead:

```powershell
npm.cmd start
```

This avoids changing the PowerShell script execution policy.

### The browser cannot open Chirp

- Make sure the server is running in the terminal.
- Check that the terminal says Chirp is running on port `3000`.
- Open `http://localhost:3000`.
- If port `3000` is already in use, stop the other app using it or change `PORT` in `.env`.

### The feed does not load

- Check your internet connection.
- Make sure JSONPlaceholder is reachable.
- Refresh the page and check the browser console for errors.

### The welcome message does not appear

- Make sure the server is running.
- Check that the page contains an element with the ID `welcome-message`.
- Check that `main.js` calls the function that fetches `/api/hello`.
- Open `http://localhost:3000/api/hello` to check the endpoint response.

### Ask AI says the key is missing or does not respond

- Check that the file is named `.env`, not `.env.txt`.
- Check that `OPENROUTER_API_KEY` contains your real key.
- Make sure there are no extra spaces around the key.
- Restart the server after changing `.env`.
- Check that your OpenRouter account and selected model route are available.

## Learning goals

This project is also a way to practise web development. It gives you experience with:

- HTML page structure and CSS layouts.
- JavaScript functions and modules.
- Fetching data from APIs.
- HTTP methods such as `GET` and `POST`.
- JSON requests and responses.
- `async` and `await`.
- Error handling with `try...catch`.
- Creating API endpoints with Node.js.
- Connecting a frontend to a backend service.

---

**Project:** Chirp — Social Feed & AI Assistant  
**Built with:** HTML5, CSS3, Vanilla JavaScript, and Node.js  
**AI service:** OpenRouter  
**Sample data:** JSONPlaceholder
