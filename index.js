const mineflayer = require("mineflayer");
const Vec3 = require("vec3");
const axios = require("axios");
require("dotenv").config();

function createBot() {
  const bot = mineflayer.createBot({
    host: process.env.MINECRAFT_SERVER,
    port: parseInt(process.env.MINECRAFT_PORT),
    username: process.env.BOT_USERNAME,
    version: "1.21.5"
  });

  bot.once("spawn", () => {
    console.log("✅ Bot is online!");

    // Anti-AFK jump every 30 sec
    setInterval(() => {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 500);
    }, 30000);
  });

  bot.on("death", () => console.log("☠️ Bot died"));
  bot.on("respawn", () => console.log("🧟 Bot respawned"));
  bot.on("end", () => {
    console.log("🔁 Disconnected — reconnecting...");
    setTimeout(createBot, 5000);
  });

  let protectPlayer = "ArthWarrior3201";

  bot.on("chat", async (username, message) => {
    if (username === bot.username) return;

    const msg = message.toLowerCase();

    try {
      // Build command
      if (msg === "!build") {
        const block = bot.inventory.items().find(item =>
          item.name.includes("planks") || item.name.includes("stone")
        );
        if (!block) return bot.chat("No blocks found.");
        const ref = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (ref) {
          await bot.equip(block, "hand");
          await bot.placeBlock(ref, new Vec3(1, 0, 0));
          return bot.chat("Block placed!");
        } else {
          return bot.chat("No reference block found.");
        }
      }

      // Attack command
      if (msg === "!attack") {
        const target = bot.nearestEntity(e =>
          e.type === "mob" || (e.type === "player" && e.username !== bot.username)
        );
        if (target) {
          bot.chat(`Attacking ${target.name || target.username}`);
          bot.attack(target);
        } else {
          bot.chat("No target found.");
        }
        return;
      }

      // Mine command
      if (msg === "!mine") {
        const block = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (block && block.name !== "air") {
          bot.chat("Mining...");
          await bot.dig(block);
        } else {
          bot.chat("Nothing to mine.");
        }
        return;
      }

      // Protect command
      if (msg === "!protect") {
        protectPlayer = username;
        bot.chat(`Now protecting ${username}`);
        return;
      }

      // Look at protect player if online
      const target = bot.players[protectPlayer]?.entity;
      if (target) {
        bot.lookAt(target.position.offset(0, 1.5, 0));
      }

      // If it's a command starting with !
      if (msg.startsWith("!")) {
        const command = msg.slice(1).trim();
        bot.chat(`/${command}`);
        return;
      }

      // HuggingFace AI reply
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/google/flan-t5-large",
        { inputs: message },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const reply = (response.data[0]?.generated_text || "I don't know.").slice(0, 256);
      bot.chat(reply);

    } catch (err) {
      console.error("⚠️ Error:", err.message);
      bot.chat("🤖 Error or timeout");
    }
  });
}

createBot();
