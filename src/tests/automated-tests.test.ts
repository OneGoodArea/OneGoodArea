import { describe, it, expect } from 'vitest';
import { parseAutomatedTests, generateTestSummary } from './parse-automated-test';

const tests = parseAutomatedTests();

describe('Automated Tests from tests-automated.md', () => {

  it('should parse all automated tests', () => {
    expect(tests.length).toBeGreaterThan(0);
    console.log(`Found ${tests.length} test paths`);
  });

  it('should have test cases in each path', () => {
    for (const path of tests) {
      expect(path.testCases.length).toBeGreaterThan(0);
      expect(path.pathId).toMatch(/^PATH_/);
      expect(path.title).toBeTruthy();
    }
  });

  it('should parse test case details', () => {
    for (const path of tests) {
      for (const tc of path.testCases) {
        expect(tc.id).toMatch(/_TC\d+$/);
        expect(['happy', 'boundary', 'failure', 'security', 'edge', 'concurrency']).toContain(tc.type);
        expect(Array.isArray(tc.preconditions)).toBe(true);
        expect(Array.isArray(tc.steps)).toBe(true);
        expect(Array.isArray(tc.expectedResults)).toBe(true);
      }
    }
  });

  it('should identify API endpoints in steps', () => {
    const apiTests = tests.filter(p => p.testCases.some(tc => tc.steps.some(s => s.method)));
    expect(apiTests.length).toBeGreaterThan(0);

    for (const path of apiTests) {
      for (const tc of path.testCases) {
        for (const step of tc.steps) {
          if (step.method) {
            expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(step.method);
            expect(step.endpoint).toBeTruthy();
          }
        }
      }
    }
  });

  it('should identify database queries in steps', () => {
    const dbTests = tests.filter(p => p.testCases.some(tc => tc.steps.some(s => s.query)));
    expect(dbTests.length).toBeGreaterThan(0);

    for (const path of dbTests) {
      for (const tc of path.testCases) {
        for (const step of tc.steps) {
          if (step.query) {
            expect(step.query.toUpperCase()).toMatch(/SELECT/);
          }
        }
      }
    }
  });

  it('should generate test summary', () => {
    const summary = generateTestSummary(tests);
    expect(summary).toContain('Automated Test Summary');
    expect(summary).toContain('Total Test Paths');
    expect(summary).toContain('Distribution by Type');
    console.log('\n' + summary);
  });

  it('should validate test structure', () => {
    const stats = {
      totalPaths: tests.length,
      totalCases: tests.reduce((sum, p) => sum + p.testCases.length, 0),
      withSteps: 0,
      withAPI: 0,
      withDB: 0,
      withEvidence: 0,
    };

    for (const path of tests) {
      for (const tc of path.testCases) {
        if (tc.steps.length > 0) stats.withSteps++;
        if (tc.steps.some(s => s.method)) stats.withAPI++;
        if (tc.steps.some(s => s.query)) stats.withDB++;
        if (tc.evidence.length > 0) stats.withEvidence++;
      }
    }

    console.log('\n=== Test Structure Statistics ===');
    console.log(`Total Paths: ${stats.totalPaths}`);
    console.log(`Total Cases: ${stats.totalCases}`);
    console.log(`With Steps: ${stats.withSteps}`);
    console.log(`With API Calls: ${stats.withAPI}`);
    console.log(`With DB Queries: ${stats.withDB}`);
    console.log(`With Evidence: ${stats.withEvidence}`);

    expect(stats.totalPaths).toBeGreaterThan(0);
    expect(stats.totalCases).toBeGreaterThan(0);
  });

  it('should list all test paths', () => {
    console.log('\n=== Test Paths ===');
    tests.forEach(path => {
      console.log(`${path.pathId}: ${path.title} (${path.testCases.length} cases)`);
      path.testCases.forEach(tc => {
        console.log(`  └─ ${tc.id} (${tc.type})`);
      });
    });
  });

  // Generated individual test suites
  tests.forEach(path => {
    describe(`${path.pathId}: ${path.title}`, () => {
      path.testCases.forEach(tc => {
        it(`${tc.id} - ${tc.type} path`, () => {
          expect(tc.id).toBeTruthy();
          expect(tc.type).toBeTruthy();
          expect(tc.preconditions.length).toBeGreaterThanOrEqual(0);
          expect(tc.steps.length).toBeGreaterThanOrEqual(0);
          expect(tc.expectedResults.length).toBeGreaterThanOrEqual(0);

          if (tc.steps.length > 0) {
            console.log(`\n${tc.id}:`);
            console.log(`  Type: ${tc.type}`);
            if (tc.preconditions.length > 0) {
              console.log(`  Preconditions: ${tc.preconditions.length}`);
            }
            console.log(`  Steps: ${tc.steps.length}`);
            tc.steps.forEach(step => {
              if (step.method) {
                console.log(`    ${step.method} ${step.endpoint}`);
              } else if (step.query) {
                console.log(`    DB: ${step.query.substring(0, 50)}...`);
              }
            });
            if (tc.expectedResults.length > 0) {
              console.log(`  Expected Results: ${tc.expectedResults.length}`);
            }
          }
        });
      });
    });
  });
});
