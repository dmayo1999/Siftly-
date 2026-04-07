# 🚀 Siftly — Quick Start in Codespaces

This fork is pre-configured for **GitHub Codespaces**.

## 1. Entering your API Key
The application needs an AI provider to categorize your bookmarks.
1. In the file explorer on the left, open the `.env` file.
2. Find the line `ANTHROPIC_API_KEY=` or `OPENAI_API_KEY=`.
3. Paste your key and save the file. (Nothing is sent to me or the repo owner; this stays in your private Codespace).

## 2. Running the App
The background setup (npm install and database setup) happened automatically.
1. If the app hasn't started yet, run `npm run dev` in the terminal.
2. Click **"Open in Browser"** when the popup appears for Port 3000.

## 3. Importing Bookmarks
1. Go to [https://x.com/i/bookmarks](https://x.com/i/bookmarks).
2. Use the **Export Bookmarklet** provided in Siftly's "Import" tab.
3. Upload the resulting JSON file.

---
*Note: This environment is entirely isolated and safe. Feel free to explore without any risk to your local machine.*
