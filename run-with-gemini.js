require('dotenv/config');
const { HyperAgent } = require('./dist/index.js');

async function main() {
  const task = process.argv[2] || "Find a route from Miami to New Orleans, and provide the detailed route information.";

  console.log('\n🚀 Starting HyperAgent with Google Gemini 2.5 Flash...\n');
  console.log('Task:', task, '\n');

  const agent = new HyperAgent({
    llm: {
      provider: "gemini",
      model: "gemini-2.5-flash",
    },
    debug: true,
  });

  try {
    const result = await agent.executeTask(task);
    console.log('\n✅ Task completed!');
    console.log('\nResult:', result.output);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await agent.closeAgent();
  }
}

main().catch(console.error);
