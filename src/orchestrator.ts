import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ReviewReport, ReviewReportSchema } from './types/report-types.js';
import { buildOrchestratorPrompt } from './prompts/orchestrator.prompt.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents/index.js';
import { mcpServersConfig } from './config/mcp.config.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private model: string;

  constructor(options: OrchestratorOptions = {}) {
    this.model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startTime = Date.now();

    // Create async generator for prompt (required for streaming/MCP compatibility)
    async function* generateMessages(userMessage: string) {
      yield {
        type: 'user' as const,
        message: { role: 'user' as const, content: userMessage },
        parent_tool_use_id: null,
        session_id: 'code-review-orchestrator-session',
      };
    }

    // Build orchestrator prompt
    const userPrompt = buildOrchestratorPrompt(owner, repo, prNumber);

    // Configure output format using ReviewReportSchema with proper $refStrategy
    // @ts-ignore - zodToJsonSchema has complex type recursion issues with ReviewReportSchema
    const outputSchema = zodToJsonSchema(ReviewReportSchema, { $refStrategy: 'root' });

    // Define agents for registration
    const agents: Record<string, typeof codeQualityAnalyzer> = {
      'code-quality-analyzer': codeQualityAnalyzer,
      'test-coverage-analyzer': testCoverageAnalyzer,
      'refactoring-suggester': refactoringSuggester
    };

    // Call query with proper SDK configuration
    for await (const message of query({
      prompt: generateMessages(userPrompt),
      options: {
        model: this.model,
        mcpServers: mcpServersConfig,
        allowedTools: ['Task', 'mcp__github__*', 'mcp__eslint__*'],
        agents: agents as Record<string, any>,
        outputFormat: {
          type: 'json_schema',
          schema: outputSchema,
        },
      },
    })) {
      // Handle successful structured output result
      if (message.type === 'result' && (message as any).subtype === 'success' && (message as any).structured_output) {
        // Validate against schema
        const validation = ReviewReportSchema.safeParse((message as any).structured_output);
        if (!validation.success) {
          throw new Error(
            `Invalid review report structure from query: ${validation.error.message}`
          );
        }

        // Calculate and set duration
        const duration = Date.now() - startTime;
        validation.data.metadata.duration = duration;

        return validation.data;
      }

      // Handle error results
      if (message.type === 'result' && (message as any).subtype !== 'success') {
        throw new Error(`Query failed: ${(message as any).subtype}`);
      }
    }

    // If we exit the loop without returning, we got no structured output
    throw new Error('Query produced no structured output from orchestration agent');
  }
}
