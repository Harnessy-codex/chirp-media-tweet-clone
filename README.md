# Chirp – Social Feed and AI Assistant

Chirp is a small social media app inspired by Twitter. It is made with:

- HTML5
- CSS
- Vanilla JavaScript (no frontend framework)
- JSONPlaceholder for sample users, posts and comments
- OpenRouter for the optional AI chat
- Node.js built-in tools for the small server that protects the AI key

There is no React, TypeScript, Vite, Express or other framework in this project.

## 1. What the app can do

- Show a feed of sample posts and users.
- Show the correct name and username for each post.
- Open and close comments under a post.
- Like and retweet posts. The counts change on the page.
- Write a new post with a 280-character limit.
- Open a user's profile and view their posts.
- Follow and unfollow users.
- Show suggested users.
- Open an AI chat panel and ask questions.
- Ask the AI to sum up a post and its comments.
- Show loading messages and clear error messages.
- Adjust the layout for desktop and phone screens.

Likes, retweets, follows and new posts are kept in the browser while the page is open. They are not saved to a database.

## 2. Project files

```text
chirp-social-feed/
├── index.html
├── package.json
├── server.js
├── README.md
├── .env.example
├── .gitignore
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── profile.css
├── js/
│   ├── main.js
│   ├── api.js
│   ├── feed.js
│   ├── comments.js
│   ├── interactions.js
│   ├── compose.js
│   ├── profile.js
│   └── ai-chat.js
└── assets/
    ├── icons/
    │   └── logo.svg
    └── images/
        └── default-cover.svg
```

## 3. What you need

Install **Node.js 20 or newer**. You also need an internet connection so the app can load sample data and contact OpenRouter.

You do not need to install project packages. The server uses tools that come with Node.js.

## 4. Run Chirp

1. Unzip the project folder.
2. Open the `chirp-social-feed` folder in Visual Studio Code.
3. Open the VS Code terminal.
4. Run this command:

   ```bash
   npm start
   ```

5. Open this address in your browser:

   `http://localhost:3000`

To stop the server, return to the terminal and press `Ctrl + C`.

## 5. Turn on Ask AI

The feed works without an OpenRouter key. The AI chat needs your own key.

1. Create an account and get an API key from [OpenRouter](https://openrouter.ai/).
2. In the project folder, make a copy of `.env.example`.
3. Rename the copy to `.env` (make sure the file is named `.env`, not `.env.txt`).
4. Open `.env` and replace the example value with your key:

   ```text
   OPENROUTER_API_KEY=your_real_key_here
   PORT=3000
   APP_URL=http://localhost:3000
   ```

5. Save the file.
6. Stop the server with `Ctrl + C` and run `npm start` again.

The AI uses the `openrouter/free` model route. The key stays in the server's `.env` file. Do not put the key in any file inside the `js` folder or in `index.html`. Do not share your `.env` file or upload it to GitHub.

## 6. Main JavaScript files

- `main.js` starts the app and connects the parts.
- `api.js` gets users, posts and comments. It uses `Promise.all` to load users and posts at the same time. It gets comments once and keeps them for reuse.
- `feed.js` builds the post cards and displays the feed.
- `comments.js` groups comments by post ID and opens or closes the comment area.
- `interactions.js` handles likes, retweets and follows.
- `compose.js` checks the post length and adds new posts.
- `profile.js` builds profile pages.
- `ai-chat.js` controls the chat panel and sends messages to the local server.
- `server.js` serves the website and sends AI requests to OpenRouter without showing your key to the browser.

## 7. Notes

- JSONPlaceholder gives sample data. It does not save new posts or changes to likes and follows.
- If the feed does not load, check your internet connection and press Retry.
- If Ask AI says the key is missing, check the `.env` file and restart the server.
- Demo bios and follower counts are sample values. JSONPlaceholder does not provide them.
- The optional profile photo API is not required. Chirp uses initials in coloured circles, so the app still works without an avatar service.
