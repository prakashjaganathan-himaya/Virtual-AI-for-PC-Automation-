# Using HyperAgent with Local LLM (LM Studio)

This guide shows you how to use HyperAgent with a local LLM running on your RTX 3060 using LM Studio.

## Step 1: Install and Set Up LM Studio

1. **Download LM Studio** (if you haven't already)
   - Go to: https://lmstudio.ai/
   - Download and install for Windows

2. **Download a Model**

   Recommended models for your RTX 3060 (12GB VRAM):

   ### Best Options:

   - **Qwen2.5-Coder-7B-Instruct-GGUF** (Q4_K_M) - Excellent for coding tasks, ~4.9GB
     - Fast and smart for automation tasks
     - Good instruction following

   - **Hermes-3-Llama-3.1-8B-GGUF** (Q5_K_M) - Great general purpose, ~5.7GB
     - Excellent instruction following
     - Good for web automation

   - **Mistral-7B-Instruct-v0.3-GGUF** (Q5_K_M) - Reliable and fast, ~5.1GB
     - Very stable
     - Good reasoning

   - **Llama-3.2-3B-Instruct-GGUF** (Q6_K) - Smaller but fast, ~2.7GB
     - Great if you want faster responses
     - Still decent quality

   ### How to Download in LM Studio:
   1. Open LM Studio
   2. Click the search icon (🔍) on the left sidebar
   3. Search for model name (e.g., "qwen2.5-coder-7b")
   4. Select the **Q4_K_M** or **Q5_K_M** quantization
   5. Click Download

## Step 2: Start the Local Server

1. Open LM Studio
2. Click **"Local Server"** tab on the left sidebar
3. Select your downloaded model from the dropdown
4. Click **"Start Server"**
5. Make sure it says: `Server running at http://localhost:1234`

   **Important Settings:**
   - Context Length: 8192 or higher (recommended)
   - GPU Offload: Max (use all VRAM)
   - Temperature: 0.7

## Step 3: Run HyperAgent with Local LLM

### Basic Usage:

```bash
cd f:\Autonomous-Browser-Agent\HyperAgent
node run-with-local-llm.js "Your task here"
```

### Examples:

```bash
# Route finding
node run-with-local-llm.js "Find a route from Miami to New Orleans"

# Web scraping
node run-with-local-llm.js "Go to Hacker News and get the top 5 article titles"

# Product search
node run-with-local-llm.js "Search Amazon for laptops under $1000"
```

## Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:1234"
- **Solution**: Make sure LM Studio server is running
- Go to LM Studio → Local Server → Click "Start Server"

### Error: "Model not found" or "No response"
- **Solution**: Make sure a model is loaded in LM Studio
- Select a model from the dropdown before starting the server

### Slow Performance
- **Solution**:
  1. Use a smaller quantization (Q4_K_M instead of Q6_K)
  2. Increase GPU offload in LM Studio settings
  3. Use a smaller model (3B instead of 7B)
  4. Lower context length to 4096

### Out of Memory
- **Solution**:
  1. Use Q4_K_M quantization (smaller)
  2. Close other GPU-intensive programs
  3. Try a smaller model (3B parameters)

## Customizing the Configuration

Edit `run-with-local-llm.js` to change settings:

```javascript
const agent = new HyperAgent({
  llm: {
    provider: "openai",
    model: "local-model",
    baseURL: "http://localhost:1234/v1",  // Change if using different port
    apiKey: "not-needed",
    temperature: 0.7,  // 0.0 = deterministic, 1.0 = creative
  },
  debug: true,  // Set to false to reduce output
});
```

## Performance Tips

1. **Use Q4_K_M quantization** - Best balance of speed and quality
2. **Enable GPU offload to max** in LM Studio
3. **Start with 7B models** - Good balance for RTX 3060
4. **Increase context window** to 8192+ for better task understanding
5. **Use Qwen2.5-Coder** models for web automation tasks

## Benefits of Local LLM

✅ **Free** - No API costs
✅ **Private** - Data never leaves your computer
✅ **Unlimited** - No rate limits or quotas
✅ **Fast** - No network latency with RTX 3060
✅ **Offline** - Works without internet

## Switching Between Local and Cloud

You can easily switch between local and cloud models:

- **Local LLM**: `node run-with-local-llm.js "task"`
- **Gemini (Cloud)**: `node run-with-gemini.js "task"`
- **DeepSeek (Cloud)**: `node run-with-deepseek.js "task"`

Use local for privacy/unlimited tasks, cloud for best quality.
