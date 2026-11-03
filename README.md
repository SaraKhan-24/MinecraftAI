# Minecraft AI Companion (Botty)

A Minecraft companion bot built with Mineflayer and the Gemini 2.5 Flash API. Botty chats in text, listens and replies through in-game voice chat (Plasmo Voice), and follows or stops on spoken or typed commands.

## What it does

- **Text chat.** Responds in a casual gaming-buddy tone using Gemini.
- **Voice chat.** Receives a player's microphone audio from the Plasmo Voice channel, converts it with FFmpeg, sends it to Gemini's multimodal endpoint, turns the reply into speech with text-to-speech, and plays it back in voice chat.
- **Commands from natural language.** The model's reply can include action tags such as `[ACTION:FOLLOW]` and `[ACTION:STOP]`; the bot parses them and runs the matching pathfinding behavior (`mineflayer-pathfinder`).
- **Avatar.** The bot client is invisible, and a named Creeper entity is teleported to its position as a visible avatar. Shutdown handlers (`SIGINT`, `SIGTERM`) remove the spawned entity.

## Voice pipeline

```
Player mic (Plasmo Voice) -> raw audio buffer -> FFmpeg -> Gemini (audio in)
        -> text reply (+ optional action tag) -> TTS -> audio back to voice chat
```

## Project structure

```text
MinecraftAI/
├── Minecraft Server/    # Fabric 1.20.1 server config and mods
└── botty-bot/
    ├── bot.js           # Bot logic, voice pipeline, Gemini integration
    ├── package.json
    └── .env             # GEMINI_API_KEY (not committed)
```

## Requirements

- Node.js 18 or newer
- FFmpeg on your PATH (`sudo apt install ffmpeg`, `brew install ffmpeg`, or the Windows installer)
- Minecraft Java Edition 1.20.1 client

## Setup

1. Start the Minecraft server from `Minecraft Server/` (default port 25565).
2. Install and configure the bot:
   ```bash
   cd botty-bot
   npm install
   ```
   Create `.env`:
   ```env
   GEMINI_API_KEY="your_key_here"
   ```
3. Run:
   ```bash
   node bot.js
   ```

## Usage

- **Text:** say hello or mention "botty" in chat.
- **Voice:** speak in proximity voice chat. The bot currently listens to one configured player.
- **Commands:** say or type "follow" or "come here" to make it follow you; "stop" or "stay" to make it stay.

## Configuration

In `botty-bot/bot.js`:
- **Target player:** the voice handler compares against a single username. Change it to your own, or move it to an environment variable.
- **Personality:** edit the system prompts in `askTheBrain` (text) and `askTheBrainWithAudio` (voice).

## Limitations

- Voice replies depend on the round trip to the Gemini API, so there is noticeable latency.
- Voice input is handled for a single configured player.
- Intent handling covers follow and stop only.

## Third-party components

Mineflayer, mineflayer-pathfinder, Plasmo Voice, Fabric and Fabric API, the Steve AI mod, FFmpeg, and the Google Gemini API. These remain under their own licenses.
