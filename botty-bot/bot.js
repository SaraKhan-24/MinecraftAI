require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalFollow = goals.GoalFollow;
const plasmoVoice = require('mineflayer-plasmovoice');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ CRITICAL: GEMINI_API_KEY is missing! Did you create your .env file?");
  process.exit(1);
}

console.log("Starting Botty AI script with full Voice channels...");

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'Botty',
  version: '1.20.1'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(plasmoVoice.plugin);

let incomingAudioChunks = [];
let isProcessingVoice = false;
let voiceReady = false; 
let tickCount = 0;
let voiceConversationHistory = []; 

// --- 1. TEXT AI GENERATION ---
async function askTheBrain(playerName, playerMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const systemIdentity = "You are Botty, a chill, ultra-casual, and super friendly Minecraft gaming buddy. Speak naturally like a real player using text shortcuts, slang, and contractions. Keep replies short, snappy, and under 2 sentences max. Never say robotic things like 'How can I assist you?' or introduce yourself.";

  const requestPayload = {
    contents: [{
      parts: [{ text: `${systemIdentity}\n\nPlayer ${playerName} says: "${playerMessage}"` }]
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    return "My thoughts are a bit scrambled right now...";
  }
}

// --- 2. GAME WORLD LIFE CYCLES ---
bot.on('spawn', () => {
  console.log('🤖 Botty has successfully spawned into the server!');
  bot.chat('/gamerule sendCommandFeedback false');
  bot.chat('/effect give Botty minecraft:invisibility infinite 1 true');
  bot.chat('/kill @e[tag=botty_skin]');
  bot.chat('/summon minecraft:creeper ~ ~ ~ {Tags:["botty_skin"],NoAI:1b,Invulnerable:1b,CustomName:\'"Botty"\'}');
});

bot.on('physicsTick', () => {
  if (bot.entity) {
    tickCount++;
    if (tickCount % 10 === 0) {
      bot.chat('/execute at Botty run tp @e[tag=botty_skin,limit=1] ~ ~1.4 ~');
    }
  }
});

// Clean up skin entity if the bot dies to environmental damage
bot.on('death', () => {
  console.log("💀 Botty died in-game. Clearing skin entity...");
  bot.chat('/kill @e[tag=botty_skin]');
});

// --- 3. TEXT CHAT LISTENER ---
bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  console.log(`[Game Chat] ${username}: ${message}`);
  const lowerCaseMsg = message.toLowerCase();

  const isFollowCommand = lowerCaseMsg.includes('follow') || lowerCaseMsg.includes('come here') || lowerCaseMsg.includes('come to me');
  const isStopCommand = lowerCaseMsg.includes('stop') || lowerCaseMsg.includes('stay');

  if (isStopCommand) {
    bot.pathfinder.setGoal(null);
    bot.chat("Stopping here!");
    return;
  }

  if (isFollowCommand) {
    const target = bot.players[username]?.entity;
    if (!target) {
      bot.chat(`I can't see you anywhere! Come closer!`);
      return;
    }
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalFollow(target, 2), true);
    bot.chat("On my way!");
    return;
  }

  if (lowerCaseMsg.includes('botty') || lowerCaseMsg.includes('bot') || lowerCaseMsg.includes('hey')) {
    bot.chat("...💭...");
    const aiReplyText = await askTheBrain(username, message);
    bot.chat(aiReplyText);
  }
});

bot.on('error', (err) => console.log('Runtime Error: ', err));
bot.on('kicked', (reason) => console.log('Bot was kicked: ', reason));


// --- 4. DIAGNOSTIC AUDIO STREAMING ---
bot.on("plasmovoice_connected", () => {
  console.log("🎙️ Bot successfully connected to Plasmo Voice network channels!");
  console.log("⏳ Muffling initial server voice backlog dump... Please wait 4 seconds.");

  setTimeout(() => {
    voiceReady = true;
    console.log("✅ Voice lines are perfectly clear! Botty is now listening to your live microphone.");
  }, 4000);
});

bot.on('plasmovoice_voice', (data) => {
  if (!voiceReady) return; 

  if (data && data.player && data.player.toLowerCase() === 'saruuuheart') {
    if (!isProcessingVoice) {
      incomingAudioChunks.push(data.data);
      process.stdout.write("•");
    }
  }
});

bot.on('plasmovoice_voice_end', async (data) => {
  if (!voiceReady) return; 
  if (!data || !data.player || data.player.toLowerCase() !== 'saruuuheart') return;
  if (isProcessingVoice || incomingAudioChunks.length === 0) return;

  console.log("\n🎙️ [Mic Released] Processing gathered buffers...");

  const completeRawAudio = Buffer.concat(incomingAudioChunks);
  incomingAudioChunks = [];

  if (completeRawAudio.length < 5000) {
    console.log("⚠️ Diagnostic Alert: Payload too small (noise filtered).");
    return;
  }

  if (completeRawAudio.length > 2000000) {
    console.log(`⚠️ Audio stream too large. Discarding payload to protect API keys.`);
    isProcessingVoice = false;
    return;
  }

  isProcessingVoice = true;
  console.log("🧪 Handing file compilation off to FFmpeg...");

  const sessionId = Date.now();
  const rawFilePath = path.join(__dirname, `input_${sessionId}.raw`);
  const wavFilePath = path.join(__dirname, `input_${sessionId}.wav`);
  const temporaryMp3Path = path.join(__dirname, `temp_${sessionId}.mp3`);
  const finalBroadcastWavPath = path.join(__dirname, `reply_${sessionId}.wav`);

  try {
    fs.writeFileSync(rawFilePath, completeRawAudio);
    await convertRawToWav(rawFilePath, wavFilePath);

    console.log("🧠 Transmitting WAV stream payload to Gemini AI...");
    let aiReplyString = await askTheBrainWithAudio(wavFilePath);
    console.log(`Gemini Voice Output: "${aiReplyString}"`);

    if (aiReplyString.includes("trouble converting")) {
      isProcessingVoice = false;
      return;
    }

    // --- UPGRADE: PARSE VOICE INTENT ACTION TAGS ---
    if (aiReplyString.includes('[ACTION:FOLLOW]')) {
      console.log("🏃 Intent Parsed: Voice command triggered a FOLLOW action.");
      aiReplyString = aiReplyString.replace('[ACTION:FOLLOW]', '').trim(); // Clear tag from speech output
      
      const target = bot.players['saruuuheart']?.entity;
      if (target) {
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        bot.pathfinder.setGoal(new GoalFollow(target, 2), true);
      }
    } else if (aiReplyString.includes('[ACTION:STOP]')) {
      console.log("🛑 Intent Parsed: Voice command triggered a STOP action.");
      aiReplyString = aiReplyString.replace('[ACTION:STOP]', '').trim(); // Clear tag from speech output
      bot.pathfinder.setGoal(null);
    }

    voiceConversationHistory.push(`Botty: ${aiReplyString}`);
    if (voiceConversationHistory.length > 6) voiceConversationHistory.shift(); 

    await textToSpeech(aiReplyString, temporaryMp3Path);

    console.log("✨ Upsampling and generating a custom silence tail pad...");
    await cleanAndUpsampleOutput(temporaryMp3Path, finalBroadcastWavPath);

    console.log("🔊 Injecting stream back to game client speakers...");
    bot.plasmovoice.sendAudio(finalBroadcastWavPath);

    const wordCount = aiReplyString.split(' ').length;
    const estimatedSpeechDuration = (wordCount * 350) + 1800;

    await new Promise(resolve => setTimeout(resolve, estimatedSpeechDuration));

  } catch (err) {
    console.error("Error processing voice pipeline:", err);
  } finally {
    try {
      if (fs.existsSync(rawFilePath)) fs.unlinkSync(rawFilePath);
      if (fs.existsSync(wavFilePath)) fs.unlinkSync(wavFilePath);
      if (fs.existsSync(temporaryMp3Path)) fs.unlinkSync(temporaryMp3Path);
      setTimeout(() => { if (fs.existsSync(finalBroadcastWavPath)) fs.unlinkSync(finalBroadcastWavPath); }, 5000);
    } catch (e) { }

    isProcessingVoice = false;
    console.log("🎙️ Ear channels reset. Ready for next sentence.");
  }
});


// --- 5. AUDIO SYSTEM TRANSLATION RUNTIMES ---
function convertRawToWav(rawPath, wavPath) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -f s16le -ar 48000 -ac 1 -i "${rawPath}" "${wavPath}"`;
    exec(command, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function cleanAndUpsampleOutput(inputMp3, outputWav) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${inputMp3}" -ar 48000 -ac 1 -af "apad=pad_dur=0.6" "${outputWav}"`;
    exec(command, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function askTheBrainWithAudio(wavPath) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  if (!fs.existsSync(wavPath)) {
    return "I had trouble converting your voice waves...";
  }

  const wavBase64 = fs.readFileSync(wavPath).toString('base64');
  const recentExchanges = voiceConversationHistory.join("\n");

  // UPGRADE: Added direct control tag rules into system identity
  const systemIdentity = `You are Botty, a cool, friendly, and ultra-casual gaming buddy hanging out in Minecraft. Speak in a relaxed, conversational tone using contractions.

CRITICAL PROMPT DIRECTIVES:
- Keep responses short, snappy, and concise (under 2 sentences max). 
- DO NOT say 'Hey', 'Yo', or the player's name at the start of your message. 
- DO NOT re-introduce yourself or state your name.
- You are in the middle of an active voice call. Respond naturally.

CRITICAL ACTION CHANNELS:
- If the player tells you to come here, follow them, or come to them, append exactly '[ACTION:FOLLOW]' to the very end of your response text.
- If the player tells you to stop walking, stay there, or freeze, append exactly '[ACTION:STOP]' to the very end of your response text.

Recent context:\n${recentExchanges}`;

  const requestPayload = {
    contents: [{
      parts: [
        { inlineData: { mimeType: "audio/wav", data: wavBase64 } },
        { text: systemIdentity }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) throw new Error(`Gemini status code: ${response.status}`);

    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      return "I had trouble converting your voice waves...";
    }
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Gemini API Audio Error:", error);
    return "I had trouble converting your voice waves...";
  }
}

async function textToSpeech(text, outputPath) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
  } catch (error) {
    console.error("TTS conversion failure:", error);
  }
}

// --- 6. GLOBAL PROCESS SAFETY NET & GRACEFUL SHUTDOWN ---
process.on('uncaughtException', (err) => {
  if (err.code === 'ERR_SOCKET_BAD_PORT') return;
  console.error("Uncaught System Exception:", err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Hidden Async Rejection detected at:', promise, 'reason:', reason);
});

// UPGRADE: Intercepts Ctrl+C (SIGINT) to auto-kill the leftover Creeper skin entity before exiting
function cleanExitHandler() {
  console.log("\n🛑 Script shutdown signal detected. Cleaning up summoned Minecraft entities...");
  try {
    if (bot && bot.entity) {
      bot.chat('/kill @e[tag=botty_skin]');
      console.log("🧹 Leftover skin tag successfully purged from world.");
    }
  } catch (e) {
    console.log("Could not process chat cleanup command on exit.");
  }
  // Give the server a brief 300ms window to execute the command packet before severing the socket
  setTimeout(() => {
    process.exit(0);
  }, 300);
}

process.on('SIGINT', cleanExitHandler);
process.on('SIGTERM', cleanExitHandler);