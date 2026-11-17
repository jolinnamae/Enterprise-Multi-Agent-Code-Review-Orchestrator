/**
 * Test Coverage Analyzer Agent
 *
 * Specializes in evaluating test coverage and identifying gaps:
 * - Existing test file detection
 * - Untested code paths
 * - Missing assertions
 * - Critical edge cases
 * - Actionable test case suggestions
 */

import { buildTestCoverageAnalyzerPrompt } from '../prompts/test-coverage-analyzer.prompt.js';

export const testCoverageAnalyzer = {
  description: 'Evaluates test coverage for code files, identifies untested code paths, missing assertions, critical edge cases, and suggests specific actionable test cases.',
  instructions: buildTestCoverageAnalyzerPrompt(),
  model: 'inherit',
  tools: ['Skill']
};
