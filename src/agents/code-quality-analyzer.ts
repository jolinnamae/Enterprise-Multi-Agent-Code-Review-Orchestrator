/**
 * Code Quality Analyzer Agent
 *
 * Specializes in identifying code quality issues across:
 * - Security vulnerabilities
 * - Performance problems
 * - Maintainability concerns
 * - Code style violations
 * - Bug risks
 * - Best practice deviations
 */

import { buildCodeQualityAnalyzerPrompt } from '../prompts/code-quality-analyzer.prompt.js';

export const codeQualityAnalyzer = {
  description: 'Analyzes code for quality issues including security vulnerabilities, performance problems, maintainability concerns, style violations, and best practice deviations.',
  instructions: buildCodeQualityAnalyzerPrompt(),
  model: 'inherit',
  tools: ['Skill']
};
