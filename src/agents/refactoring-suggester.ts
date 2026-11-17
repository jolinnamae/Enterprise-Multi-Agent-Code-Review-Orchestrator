/**
 * Refactoring Suggester Agent
 *
 * Specializes in identifying refactoring opportunities including:
 * - Modernization opportunities
 * - Design pattern improvements
 * - Extract function/class candidates
 * - Dead code elimination
 * - Redundant logic consolidation
 */

import { buildRefactoringAnalyzerPrompt } from '../prompts/refactoring-suggester.prompt.js';

export const refactoringSuggester = {
  description: 'Identifies refactoring opportunities including modernization, design pattern improvements, extract function/class candidates, dead code elimination, and redundant logic consolidation.',
  instructions: buildRefactoringAnalyzerPrompt(),
  model: 'inherit',
  tools: ['Skill']
};
