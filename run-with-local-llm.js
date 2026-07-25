require('dotenv/config');
const { HyperAgent } = require('./dist/index.js');

async function main() {
  const task = process.argv[2] || "Find a route from Miami to New Orleans, and provide the detailed route information.";

  console.log('\n🚀 Starting HyperAgent with Local LLM (LM Studio)...\n');
  console.log('🔗 Server: http://127.0.0.1:1234');
  console.log('📝 Task:', task, '\n');

  // Configure for local LM Studio
  const agent = new HyperAgent({
    llm: {
      provider: "openai",  // Use OpenAI provider (LM Studio is compatible)
      model: "local-model", // This can be any string - LM Studio will use whatever model you loaded
      baseURL: "http://127.0.0.1:1234/v1", // Your LM Studio endpoint
      apiKey: "lm-studio", // LM Studio doesn't need an API key, but we need to provide something
      temperature: 0.7,
    },
    debug: true,
  });

  try {
    console.log('⚙️  Connecting to LM Studio...\n');
    const result = await agent.executeTask(task);
    console.log('\n✅ Task completed!');
    console.log('\n📊 Result:', result.output);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure LM Studio is running');
    console.error('   2. Go to LM Studio -> Local Server tab');
    console.error('   3. Make sure a model is loaded');
    console.error('   4. Click "Start Server"');
    console.error('   5. Check that server shows: http://127.0.0.1:1234\n');
  }
  // Browser will stay open - close manually when done
}

main().catch(console.error);
