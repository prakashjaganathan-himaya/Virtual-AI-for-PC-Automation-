const OpenAI = require("openai");
const { AgentBrowser } = require("./agent/browser");
const readline = require("readline");

// Initialize OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/yourusername/hyperagent", // Optional
    "X-Title": "HyperAgent Browser Automation", // Optional
  },
});

/**
 * Recommended Models on OpenRouter:
 *
 * 1. google/gemini-2.0-flash-exp:free (FREE, 128K context, JSON support)
 * 2. anthropic/claude-3.5-sonnet (Best quality, 200K context, $3/M tokens)
 * 3. openai/gpt-4o (128K context, JSON support, $2.5/M tokens)
 * 4. deepseek/deepseek-chat (128K context, very cheap $0.14/M tokens)
 * 5. meta-llama/llama-3.3-70b-instruct (128K context, $0.35/M tokens)
 * 6. qwen/qwen-2.5-72b-instruct (128K context, $0.35/M tokens)
 */

const MODEL = "google/gemini-2.0-flash-exp:free"; // FREE model with 128K context

async function chatWithAgent() {
  const agentBrowser = new AgentBrowser();
  let conversationHistory = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🤖 AI Browser Agent ready (OpenRouter - " + MODEL + ")");
  console.log("Type your task or 'quit' to exit\n");

  const askQuestion = () => {
    rl.question("You: ", async (task) => {
      if (task.toLowerCase() === "quit") {
        console.log("Goodbye!");
        agentBrowser.close();
        rl.close();
        return;
      }

      // Add user message to history
      conversationHistory.push({
        role: "user",
        content: task,
      });

      try {
        console.log("\n🤔 Thinking...");

        const actions = await agentBrowser.planActions(task);

        console.log(`\n📋 Planned ${actions.length} actions:`);
        actions.forEach((action, i) => {
          console.log(`${i + 1}. ${action.type}: ${action.description}`);
        });

        console.log("\n🎬 Executing actions...\n");

        for (const action of actions) {
          console.log(`▶️  ${action.type}: ${action.description}`);
          const result = await agentBrowser.executeAction(action);

          if (!result.success) {
            console.log(`❌ Action failed: ${result.error}`);
            break;
          } else {
            console.log(`✅ ${result.message || "Success"}`);
          }
        }

        console.log("\n✨ Task completed!\n");

        // Add assistant response to history
        conversationHistory.push({
          role: "assistant",
          content: `I completed the task: ${task}. Executed ${actions.length} actions successfully.`,
        });
      } catch (error) {
        console.error("❌ Error:", error.message);
        conversationHistory.push({
          role: "assistant",
          content: `Error: ${error.message}`,
        });
      }

      askQuestion();
    });
  };

  // Override AgentBrowser's LLM call to use OpenRouter
  agentBrowser.callLLM = async function (messages, options = {}) {
    try {
      const response = await openrouter.chat.completions.create({
        model: MODEL,
        messages: messages,
        response_format: options.response_format || { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("OpenRouter API Error:", error.message);
      if (error.response) {
        console.error("Response:", error.response.data);
      }
      throw error;
    }
  };

  askQuestion();
}

// Export for use by desktop app
module.exports = { chatWithAgent, MODEL };

// Run if called directly
if (require.main === module) {
  chatWithAgent().catch(console.error);
}
