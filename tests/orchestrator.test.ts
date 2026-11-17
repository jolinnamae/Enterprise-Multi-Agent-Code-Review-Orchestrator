import { describe, it, expect } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema,
  ReviewReportJSONSchema
} from '../src/types/index.js';
import { withRetry, withTimeout, ReviewError, ErrorCodes } from '../src/utils/index.js';
import { RateLimiter } from '../src/utils/index.js';

describe('Type Schemas and Validation', () => {
  describe('CodeQualityResult schema', () => {
    it('should validate a valid code quality result', () => {
      const validResult = {
        file: 'src/example.ts',
        issues: [
          {
            line: 10,
            severity: 'high' as const,
            category: 'security' as const,
            description: 'SQL injection risk',
            suggestion: 'Use parameterized queries'
          }
        ],
        overallScore: 75,
        summary: 'Found 1 security issue'
      };

      const result = CodeQualityResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should handle empty issues array', () => {
      const result = CodeQualityResultSchema.safeParse({
        file: 'clean.ts',
        issues: [],
        overallScore: 100,
        summary: 'No issues found'
      });

      expect(result.success).toBe(true);
    });

    it('should validate score boundaries (0 and 100)', () => {
      const scoreZero = CodeQualityResultSchema.safeParse({
        file: 'bad.ts',
        issues: [],
        overallScore: 0,
        summary: 'Critical issues'
      });

      const scoreMax = CodeQualityResultSchema.safeParse({
        file: 'perfect.ts',
        issues: [],
        overallScore: 100,
        summary: 'Perfect code'
      });

      expect(scoreZero.success).toBe(true);
      expect(scoreMax.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const invalidResult = CodeQualityResultSchema.safeParse({
        file: 'test.ts',
        issues: [
          {
            line: 1,
            severity: 'invalid-severity',
            category: 'style' as const,
            description: 'Issue',
            suggestion: 'Fix it'
          }
        ],
        overallScore: 50,
        summary: 'Invalid'
      });

      expect(invalidResult.success).toBe(false);
    });
  });

  describe('TestCoverageResult schema', () => {
    it('should validate a valid test coverage result', () => {
      const validResult = {
        file: 'src/utils.ts',
        hasTests: true,
        testFiles: ['src/utils.test.ts'],
        untestedPaths: [
          {
            type: 'function' as const,
            location: 'calculateTotal at line 5',
            priority: 'high' as const,
            reasoning: 'Critical calculation function',
            suggestedTest: 'it("should calculate total", () => { ... })'
          }
        ],
        coverageEstimate: 65,
        summary: 'Missing tests for edge cases'
      };

      const result = TestCoverageResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should handle no untested paths', () => {
      const result = TestCoverageResultSchema.safeParse({
        file: 'src/tested.ts',
        hasTests: true,
        testFiles: ['src/tested.test.ts'],
        untestedPaths: [],
        coverageEstimate: 100,
        summary: 'Full coverage'
      });

      expect(result.success).toBe(true);
    });

    it('should handle file without tests', () => {
      const result = TestCoverageResultSchema.safeParse({
        file: 'src/untested.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [
          {
            type: 'function' as const,
            location: 'main at line 1',
            priority: 'critical' as const,
            reasoning: 'Entire file untested',
            suggestedTest: 'Create test file'
          }
        ],
        coverageEstimate: 0,
        summary: 'No tests'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('RefactoringSuggestion schema', () => {
    it('should validate refactoring suggestions', () => {
      const validResult = {
        file: 'src/legacy.ts',
        suggestions: [
          {
            type: 'extract-function' as const,
            location: 'processData at line 20',
            impact: 'high' as const,
            description: 'Extract validation logic',
            before: 'if (x < 0) { ... }',
            after: 'validateInput(x)',
            benefits: 'Improves readability'
          }
        ],
        summary: 'Consider extracting validation'
      };

      const result = RefactoringSuggestionSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should handle empty suggestions', () => {
      const result = RefactoringSuggestionSchema.safeParse({
        file: 'src/modern.ts',
        suggestions: [],
        summary: 'Code is well-structured'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('ReviewReport schema', () => {
    it('should validate a complete review report', () => {
      const validReport = {
        pullRequest: {
          owner: 'facebook',
          repo: 'react',
          number: 12345
        },
        fileReviews: [
          {
            file: 'src/example.ts',
            codeQuality: {
              file: 'src/example.ts',
              issues: [],
              overallScore: 85,
              summary: 'Good quality'
            },
            testCoverage: {
              file: 'src/example.ts',
              hasTests: true,
              testFiles: ['src/example.test.ts'],
              untestedPaths: [],
              coverageEstimate: 90,
              summary: 'Well covered'
            },
            refactorings: {
              file: 'src/example.ts',
              suggestions: [],
              summary: 'No refactoring needed'
            }
          }
        ],
        summary: {
          totalFiles: 1,
          overallScore: 85,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [],
        metadata: {
          analyzedAt: new Date().toISOString(),
          duration: 1000,
          agentVersions: {
            'code-quality-analyzer': '1.0',
            'test-coverage-analyzer': '1.0',
            'refactoring-suggester': '1.0'
          }
        }
      };

      const result = ReviewReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('should validate report with multiple files', () => {
      const report = {
        pullRequest: { owner: 'foo', repo: 'bar', number: 999 },
        fileReviews: [
          {
            file: 'file1.ts',
            codeQuality: {
              file: 'file1.ts',
              issues: [],
              overallScore: 80,
              summary: 'Good'
            },
            testCoverage: {
              file: 'file1.ts',
              hasTests: true,
              testFiles: [],
              untestedPaths: [],
              coverageEstimate: 85,
              summary: 'OK'
            },
            refactorings: {
              file: 'file1.ts',
              suggestions: [],
              summary: 'None'
            }
          },
          {
            file: 'file2.ts',
            codeQuality: {
              file: 'file2.ts',
              issues: [],
              overallScore: 90,
              summary: 'Excellent'
            },
            testCoverage: {
              file: 'file2.ts',
              hasTests: false,
              testFiles: [],
              untestedPaths: [],
              coverageEstimate: 0,
              summary: 'Untested'
            },
            refactorings: {
              file: 'file2.ts',
              suggestions: [],
              summary: 'None'
            }
          }
        ],
        summary: {
          totalFiles: 2,
          overallScore: 85,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [],
        metadata: {
          analyzedAt: new Date().toISOString(),
          duration: 2000,
          agentVersions: {
            'code-quality-analyzer': '1.0',
            'test-coverage-analyzer': '1.0',
            'refactoring-suggester': '1.0'
          }
        }
      };

      const result = ReviewReportSchema.safeParse(report);
      expect(result.success).toBe(true);
    });
  });

  describe('JSON Schema exports', () => {
    it('should export CodeQualityResultJSONSchema', () => {
      expect(CodeQualityResultJSONSchema).toBeDefined();
      expect(typeof CodeQualityResultJSONSchema).toBe('object');
    });

    it('should export TestCoverageResultJSONSchema', () => {
      expect(TestCoverageResultJSONSchema).toBeDefined();
      expect(typeof TestCoverageResultJSONSchema).toBe('object');
    });

    it('should export RefactoringSuggestionJSONSchema', () => {
      expect(RefactoringSuggestionJSONSchema).toBeDefined();
      expect(typeof RefactoringSuggestionJSONSchema).toBe('object');
    });

    it('should export ReviewReportJSONSchema', () => {
      expect(ReviewReportJSONSchema).toBeDefined();
      expect(typeof ReviewReportJSONSchema).toBe('object');
    });
  });
});

describe('Production Utilities', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        return 'success';
      }, 3, 10);

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry and eventually succeed', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Not yet');
          }
          return 'success';
        },
        5,
        10
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw ReviewError when retries exhausted', async () => {
      let attempts = 0;
      try {
        await withRetry(
          async () => {
            attempts++;
            throw new Error('Always fails');
          },
          2,
          10
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ReviewError);
        if (error instanceof ReviewError) {
          expect(error.code).toBe(ErrorCodes.RETRY_EXHAUSTED);
        }
        expect(attempts).toBe(2);
      }
    });
  });

  describe('withTimeout', () => {
    it('should complete before timeout', async () => {
      const result = await withTimeout(
        async () => 'success',
        100
      );

      expect(result).toBe('success');
    });

    it('should timeout if operation takes too long', async () => {
      try {
        await withTimeout(
          async () => new Promise(r => setTimeout(r, 1000)),
          50
        );
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error).toBeInstanceOf(ReviewError);
        if (error instanceof ReviewError) {
          expect(error.code).toBe(ErrorCodes.AGENT_TIMEOUT);
        }
      }
    });
  });

  describe('RateLimiter', () => {
    it('should allow immediate request when capacity available', async () => {
      const limiter = new RateLimiter({ maxConcurrent: 5, maxRequestsPerMinute: 10, maxTokensPerMinute: 100000 });

      await limiter.acquire(100);
      expect(limiter.getStatus().activeRequests).toBe(1);

      limiter.release();
      expect(limiter.getStatus().activeRequests).toBe(0);
    });

    it('should track request history', async () => {
      const limiter = new RateLimiter();

      await limiter.acquire(1000);
      const status1 = limiter.getStatus();
      expect(status1.requestsInWindow).toBe(1);
      expect(status1.tokensInWindow).toBe(1000);

      limiter.release();
    });

    it('should respect maxConcurrent limit', async () => {
      const limiter = new RateLimiter({ maxConcurrent: 1, maxRequestsPerMinute: 100, maxTokensPerMinute: 1000000 });

      await limiter.acquire(100);
      expect(limiter.canProceed(100)).toBe(false); // Concurrent limit reached

      limiter.release();
      expect(limiter.canProceed(100)).toBe(true);
    });
  });
});
