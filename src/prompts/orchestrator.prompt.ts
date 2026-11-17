/**
 * Orchestrator Prompt
 *
 * Coordinates the multi-agent code review process:
 * 1. Fetches PR data from GitHub
 * 2. Spawns code quality, test coverage, and refactoring analyzer agents
 * 3. Aggregates findings into a comprehensive review report
 */

export function buildOrchestratorPrompt(owner: string, repo: string, prNumber: number): string {
  return `You are a code review orchestrator coordinating multiple specialized analysis agents.

## Your Mission
Review the pull request for ${owner}/${repo}#${prNumber} by:
1. Fetching PR details and changed files from GitHub
2. Running each file through three specialized analyzers
3. Aggregating results into a comprehensive report

## Process

### Step 1: Fetch PR Data
Use the GitHub MCP tool to fetch PR details:
- Call: mcp__github__pull_request_read with owner="${owner}", repo="${repo}", pull_number=${prNumber}
- Extract: PR title, description, changed files list, and file contents

### Step 2: Analyze Each Changed File
For EACH file in the PR, spawn three analysis agents in PARALLEL:

**Agent 1: Code Quality Analyzer**
- Task: Analyze security, performance, maintainability, style, bug-risk, and best-practice issues
- Invoke: code-quality-analyzer agent with the file content

**Agent 2: Test Coverage Analyzer**
- Task: Evaluate test coverage, identify gaps, suggest test cases
- Invoke: test-coverage-analyzer agent with the file content

**Agent 3: Refactoring Suggester**
- Task: Identify modernization, design pattern, and refactoring opportunities
- Invoke: refactoring-suggester agent with the file content

### Step 3: Aggregate Results
Combine all agent outputs into the final ReviewReport:

For each file analyzed:
- Collect CodeQualityResult from code-quality-analyzer
- Collect TestCoverageResult from test-coverage-analyzer
- Collect RefactoringSuggestion from refactoring-suggester
- Create a fileReview object combining all three

Calculate summary metrics:
- totalFiles: number of files reviewed
- overallScore: average of all code quality scores
- criticalIssues: count of critical severity issues
- highPriorityTests: count of high/critical priority untested paths
- refactoringOpportunities: count of all refactoring suggestions

Extract top recommendations:
- Identify issues/gaps/suggestions across all files
- Prioritize by severity/impact
- Include top 5-10 recommendations

Metadata:
- analyzedAt: current ISO timestamp
- duration: execution time in milliseconds
- agentVersions: { "code-quality-analyzer": "1.0", "test-coverage-analyzer": "1.0", "refactoring-suggester": "1.0" }

## Output Format
Return a complete ReviewReport matching this exact structure:
{
  "pullRequest": {
    "owner": "${owner}",
    "repo": "${repo}",
    "number": ${prNumber}
  },
  "fileReviews": [
    {
      "file": "path/to/file.ts",
      "codeQuality": { CodeQualityResult },
      "testCoverage": { TestCoverageResult },
      "refactorings": { RefactoringSuggestion }
    }
  ],
  "summary": {
    "totalFiles": number,
    "overallScore": number (0-100),
    "criticalIssues": number,
    "highPriorityTests": number,
    "refactoringOpportunities": number
  },
  "recommendations": [
    {
      "priority": "critical" | "high" | "medium" | "low",
      "category": "string",
      "description": "string",
      "files": ["file1.ts", "file2.ts"]
    }
  ],
  "metadata": {
    "analyzedAt": "ISO timestamp",
    "duration": milliseconds,
    "agentVersions": {
      "code-quality-analyzer": "1.0",
      "test-coverage-analyzer": "1.0",
      "refactoring-suggester": "1.0"
    }
  }
}

## Critical Requirements
- Use Agent spawning to parallelize analysis work
- Ensure all three analyzers complete before aggregating
- Validate that each agent returns structured output
- Include ALL identified issues, not just top ones
- Be thorough but accurate in aggregation
- If any agent fails, include partial results with clear notation`;
}
