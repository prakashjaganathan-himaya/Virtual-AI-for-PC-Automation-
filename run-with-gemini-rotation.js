require('dotenv/config');
const { HyperAgent } = require('./dist/index.js');

// Add multiple Gemini API keys here (create multiple Google accounts)
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  // Add more keys...
].filter(Boolean);

let currentKeyIndex = 0;

async function main() {
  const task = process.argv[2] || "Find a route from Miami to New Orleans, and provide the detailed route information.";

  console.log('\n🚀 Starting HyperAgent with Google Gemini 2.5 Flash...\n');
  console.log(`Using API Key ${currentKeyIndex + 1} of ${GEMINI_KEYS.length}\n`);
  console.log('Task:', task, '\n');

  const agent = new HyperAgent({
    llm: {
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: GEMINI_KEYS[currentKeyIndex],
    },
    debug: true,
  });

  try {
    const result = await agent.executeTask(task);
    console.log('\n✅ Task completed!');
    console.log('\nResult:', result.output);
  } catch (error) {
    if (error.message.includes('quota') || error.message.includes('limit')) {
      console.error('\n⚠️  API Key limit reached! Switching to next key...\n');
      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;

      // Retry with next key
      console.log(`Retrying with API Key ${currentKeyIndex + 1}...\n`);
      return main();
    }
    console.error('\n❌ Error:', error.message);
  } finally {
    await agent.closeAgent();
  }

  // Rotate to next key for next run
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
}

main().catch(console.error);
