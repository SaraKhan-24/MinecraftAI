# Minecraft AI Companion Bot (Botty)

An advanced, AI-powered Minecraft companion bot built using **Mineflayer** and the **Gemini 2.5 Flash API**. The bot operates as a helpful, casual gaming buddy that can converse through standard text chat and live, bi-directional voice chat using the **Plasmo Voice** mod. It is also capable of parsing voice/text commands to trigger in-game pathfinding behaviors like following players or staying in place.

---

## 🌟 Features

*   **Multimodal AI Integration:** Powered by Google's `gemini-2.5-flash` model, allowing natural, casual, and highly responsive conversations.
*   **Bi-Directional Voice Chat:** Integrated with the **Plasmo Voice** channel system:
    *   Listens to live player microphone streams in-game.
    *   Converts and compiles raw audio buffers using **FFmpeg**.
    *   Transmits audio files directly to the Gemini multimodal endpoint.
    *   Converts AI text responses to speech using Text-to-Speech (TTS).
    *   Broadcasts the final audio stream back to the Minecraft server's voice chat.
*   **Voice & Text Intent Parsing:** Automatically parses specific action tags (e.g., `[ACTION:FOLLOW]`, `[ACTION:STOP]`) from AI responses and triggers physical pathfinding routines (powered by `mineflayer-pathfinder`).
*   **In-Game Avatar & Cosmetics:** 
    *   The core bot client is given in-game invisibility to prevent visual glitches.
    *   A custom-named Creeper ("Botty") is summoned as a visual avatar and continuously teleported to the bot's coordinates.
    *   Features graceful shutdown handlers (`SIGINT`, `SIGTERM`) to clean up spawned entities and clear the world of custom tags.

---

## 📂 Project Structure

The project is split into two primary components:

```text
MinecraftAI/
├── Minecraft Server/       # Pre-configured Minecraft server files (Fabric 1.20.1)
│   ├── mods/               # Server-side mods (Fabric API, Plasmo Voice, Steve AI)
│   └── server.properties   # Server configuration
└── wang-fei-bot/           # The Node.js application hosting the Mineflayer bot
    ├── bot.js              # Core bot logic, voice pipeline, and API integration
    ├── package.json        # Project dependencies (mineflayer, plasmovoice, dotenv)
    └── .env                # API key configuration
```

---

## 🛠️ Prerequisites

Before running the project, ensure you have the following installed on your machine:

1.  **Node.js** (v18.0.0 or higher)
2.  **FFmpeg** (installed and added to your system path)
    *   *Linux:* `sudo apt install ffmpeg`
    *   *macOS:* `brew install ffmpeg`
    *   *Windows:* Download from the official website and configure environment variables.
3.  **Minecraft Java Edition** (v1.20.1 client to join the server)

---

## 🚀 Setup & Installation

### 1. Configure the Minecraft Server
1. Navigate to the `Minecraft Server` directory.
2. Launch the server (e.g., using `java -jar fabric-server-launch.jar nogui` or your preferred startup script).
3. Ensure the server is running on port `25565` (default).

### 2. Configure the Bot
1. Navigate to the `wang-fei-bot` directory:
   ```bash
   cd wang-fei-bot
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Create or configure the `.env` file in the `wang-fei-bot` folder and add your Google Gemini API Key:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```

---

## 🎮 How to Use

1.  **Start the Minecraft Server** and log into the game.
2.  **Start the Bot:**
    Run the bot from the `wang-fei-bot` directory:
    ```bash
    node bot.js
    ```
3.  **In-Game Interactions:**
    *   **Text Chat:** Say hello, mention "botty", or ask questions. The bot will respond casually in chat.
    *   **Voice Chat (Plasmo Voice):** Talk to the bot using in-game proximity voice chat. Note that the bot is configured to prioritize and respond specifically to the player `saruuuheart`.
    *   **Movement Commands:**
        *   Text or speak: *"follow"* or *"come here"* to make the bot follow you.
        *   Text or speak: *"stop"* or *"stay"* to stop the bot in its tracks.

---

## ⚙️ Configuration & Customization

All configurations can be found and modified inside `wang-fei-bot/bot.js`:

*   **Target Player for Voice Chat:** Under Section 4, update `saruuuheart` to your Minecraft username so the bot listens and responds to your voice:
    ```javascript
    if (data && data.player && data.player.toLowerCase() === 'your_username')
    ```
*   **Personality Prompts:** You can modify the system instructions for Gemini inside the `askTheBrain` (text chat) and `askTheBrainWithAudio` (voice chat) functions to change how the bot speaks, behaves, or formats its responses.
