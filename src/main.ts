import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/index.js';
import { logger } from './utils/index.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const args = process.argv.slice(2);
  const [owner, repo, prStr] = args;

  // Validate command line arguments
  if (!owner || !repo || !prStr) {
    console.error('Usage: npm run dev <owner> <repo> <pr-number>');
    console.error('Example: npm run dev facebook react 12345');
    process.exit(1);
  }

  // Validate PR number is a positive integer
  const prNumber = parseInt(prStr, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    console.error(`Error: PR number must be a positive integer, got "${prStr}"`);
    process.exit(1);
  }

  // Validate authentication
  const hasAnthropicAuth = !!process.env.ANTHROPIC_API_KEY;
  const hasBedrockAuth =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_REGION;

  if (!hasAnthropicAuth && !hasBedrockAuth) {
    console.error('Authentication error: Missing required credentials');
    console.error('Please configure ONE of the following:');
    console.error('  - Anthropic API: Set ANTHROPIC_API_KEY');
    console.error('  - AWS Bedrock: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION');
    process.exit(1);
  }

  // Log authentication method
  if (hasBedrockAuth) {
    console.log('🔐 Using AWS Bedrock authentication');
  } else {
    console.log('🔐 Using Anthropic API authentication');
  }

  // Validate ANTHROPIC_MODEL
  if (!process.env.ANTHROPIC_MODEL) {
    console.error('Configuration error: ANTHROPIC_MODEL environment variable is required');
    console.error('Examples:');
    console.error('  - For Anthropic API: claude-sonnet-4-5-20250929');
    console.error('  - For AWS Bedrock: us.anthropic.claude-sonnet-4-5-20250929-v1:0');
    process.exit(1);
  }

  try {
    // Create orchestrator and run review
    console.log(`\nReviewing ${owner}/${repo}#${prNumber}...`);
    const orchestrator = new CodeReviewOrchestrator();
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    // Generate reports
    const reportGenerator = new ReportGenerator();
    const markdownReport = reportGenerator.generateMarkdownReport(report);
    const htmlReport = reportGenerator.generateHTMLReport(report);
    const jsonReport = reportGenerator.generateJSONReport(report);

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save reports with consistent naming
    const basename = `${owner}_${repo}_${prNumber}`;
    const markdownPath = path.join(reportsDir, `${basename}.md`);
    const htmlPath = path.join(reportsDir, `${basename}.html`);
    const jsonPath = path.join(reportsDir, `${basename}.json`);

    fs.writeFileSync(markdownPath, markdownReport, 'utf-8');
    fs.writeFileSync(htmlPath, htmlReport, 'utf-8');
    fs.writeFileSync(jsonPath, jsonReport, 'utf-8');

    // Summary
    console.log('\n✅ Code review completed successfully');
    console.log(`📄 Reports saved to ${reportsDir}/`);
    console.log(`  - Markdown: ${basename}.md`);
    console.log(`  - HTML: ${basename}.html`);
    console.log(`  - JSON: ${basename}.json`);
    console.log(`\n📊 Summary: Score ${report.summary.overallScore}/100`);
  } catch (error) {
    // Handle errors gracefully
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error(`❌ Error: ${String(error)}`);
    }
    logger.error('Code review failed', { error });
    process.exit(1);
  }
}

main();
