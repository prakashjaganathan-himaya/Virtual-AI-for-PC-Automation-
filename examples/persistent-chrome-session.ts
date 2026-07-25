/**
 * # Persistent Chrome Session Example
 *
 * This example demonstrates how to use HyperAgent with your Chrome browser's
 * persistent profile. The browser will:
 * 1. Open using your Chrome profile (with all your logged-in accounts)
 * 2. Execute tasks while maintaining your session
 * 3. Stay open after task completion (won't auto-close)
 *
 * ## Prerequisites
 *
 * 1. Node.js environment
 * 2. API key for your LLM provider set in your .env file
 * 3. Make sure Chrome is NOT already running (close it before running this script)
 *
 * ## Running the Example
 *
 * ```bash
 * yarn ts-node -r tsconfig-paths/register examples/persistent-chrome-session.ts
 * ```
 */

import "dotenv/config";
import { HyperAgent } from "@hyperbrowser/agent";
import chalk from "chalk";

async function runWithPersistentSession() {
  console.log(chalk.cyan.bold("\n===== Running with Persistent Chrome Session ====="));
  console.log(chalk.yellow("Note: Make sure Chrome is not already running!"));

  const agent = new HyperAgent({
    llm: {
      provider: "openai", // Change this to your preferred provider
      model: "gpt-4o",
    },
    localConfig: {
      autoClose: false, // Keep browser open after task completion
    },
    debug: true, // Enable debug mode for detailed logs
  });

  try {
    // Example task - replace with your own task
    const result = await agent.executeTask(
      "Go to google.com and search for 'playwright automation'",
      {
        onStep: (step) => {
          console.log("\n" + chalk.cyan.bold(`===== STEP ${step.idx} =====`));
          console.log(chalk.white(`Action: ${step.action.type}`));
          if (step.thinking) {
            console.log(chalk.gray(`Thinking: ${step.thinking}`));
          }
          console.log(chalk.cyan.bold("===============") + "\n");
        },
      }
    );

    console.log(chalk.green.bold("\n✓ Task Completed Successfully!"));
    console.log(chalk.white(`Result: ${result.output}`));
    console.log(chalk.yellow("\nBrowser will remain open. Close it manually when done."));

  } catch (error) {
    console.error(chalk.red("Error:"), error);
  }

  // Note: We're NOT calling closeAgent() to keep the browser open
  // If you want to close it programmatically, uncomment the line below:
  // await agent.closeAgent();
}

(async () => {
  await runWithPersistentSession();
})().catch((error) => {
  console.error(chalk.red("Fatal Error:"), error);
  process.exit(1);
});
