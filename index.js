const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const Vec3 = require("vec3");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

const bot = mineflayer.createBot({
  host: process.env.MINECRAFT_SERVER,
  port: parseInt(process.env.MINECRAFT_PORT),
  username: process.env.BOT_USERNAME,
  version: false,
});

bot.loadPlugin(pathfinder);

bot.on('spawn', () => {
  bot.chat("Bot online!");
  setInterval(() => {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 500);
  }, 30000);
});

let protectPlayer = "ArthWarrior3201";

function followTarget() {
  const target = bot.players[protectPlayer]?.entity;
  if (target) {
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
  }
}

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  const msg = message.toLowerCase();

  try {
    if (msg === '!build') {
      const block = bot.inventory.items().find(item => item.name.includes("planks") || item.name.includes("stone"));
      if (!block) return bot.chat("No blocks to place!");
      const ref = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      await bot.equip(block, 'hand');
      await bot.placeBlock(ref, new Vec3(1, 0, 0));
      bot.chat("Block placed!");
      return;
    }

    if (msg === '!attack') {
      const target = bot.nearestEntity(e => e.type === 'mob' || (e.type === 'player' && e.username !== bot.username));
      if (target) {
        bot.chat(`Attacking ${target.name || target.username}!`);
        bot.attack(target);
      } else {
        bot.chat("No target found.");
      }
      return;
    }

    if (msg === '!mine') {
      const block = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (block?.name !== 'air') {
        bot.chat("Mining...");
        await bot.dig(block);
      } else {
        bot.chat("Nothing to mine below.");
      }
      return;
    }

    if (msg === '!protect') {
      protectPlayer = username;
      bot.chat(`Protecting you now, ${username}`);
      followTarget();
      return;
    }

    if (msg.startsWith('!')) {
      const command = msg.slice(1).trim();
      bot.chat(`/${command}`);
      return;
    }

    const response = await openai.chat.completions.create({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [
        { role: "system", content: "You are a helpful, fun Minecraft player." },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.8
    });

    const reply = response.choices[0].message.content;
    bot.chat(reply.slice(0, 256));
  } catch (err) {
    console.error("Error:", err.message);
    bot.chat("Something went wrong.");
  }
});
