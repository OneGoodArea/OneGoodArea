/**
 * Parser for automated tests from tests-automated.md
 * Extracts test specifications and converts them to executable test cases
 */

import fs from 'fs';
import path from 'path';

export interface TestStep {
  number: number;
  description: string;
  method?: string; // HTTP method
  endpoint?: string; // API endpoint
  body?: string; // Request body
  query?: string; // DB query
  verification?: string; // What to verify
}

export interface TestCase {
  id: string;
  type: 'happy' | 'boundary' | 'failure' | 'security' | 'edge' | 'concurrency';
  preconditions: string[];
  steps: TestStep[];
  expectedResults: string[];
  evidence: string[];
}

export interface PathTest {
  pathId: string;
  title: string;
  testCases: TestCase[];
}

export function parseAutomatedTests(): PathTest[] {
  const testPlanPath = path.join(process.cwd(), 'tests-automated.md');
  const content = fs.readFileSync(testPlanPath, 'utf-8');
  
  const paths: PathTest[] = [];
  
  // Split by path sections
  const pathSections = content.split(/^### (PATH_\w+_\d+)\s*—\s*(.+?)$/m);
  
  for (let i = 1; i < pathSections.length; i += 3) {
    const pathId = pathSections[i];
    const title = pathSections[i + 1];
    const content = pathSections[i + 2];
    
    const testCases = parseTestCases(content);
    
    if (testCases.length > 0) {
      paths.push({ pathId, title, testCases });
    }
  }
  
  return paths;
}

function parseTestCases(content: string): TestCase[] {
  const cases: TestCase[] = [];
  
  // Extract code blocks
  const codeBlockMatch = content.match(/```\n([\s\S]*?)\n```/);
  if (!codeBlockMatch) return cases;
  
  const codeBlock = codeBlockMatch[1];
  
  // Split by test case - look for TC identifiers followed by a colon and content until the next TC or end
  const testCaseMatches = codeBlock.matchAll(/\s+(\w+_TC\d+):([\s\S]*?)(?=\n\s+\w+_TC\d+:|$)/g);
  
  for (const match of testCaseMatches) {
    const testId = match[1];
    const testContent = match[2];
    
    const typeMatch = testContent.match(/TYPE:\s*(\w+)/);
    const type = (typeMatch?.[1] || 'happy') as TestCase['type'];
    
    const preconditions = extractList(testContent, 'PRECONDITIONS');
    const steps = extractSteps(testContent);
    const expectedResults = extractList(testContent, 'EXPECTED RESULT');
    const evidence = extractList(testContent, 'EVIDENCE');
    
    cases.push({
      id: testId,
      type,
      preconditions,
      steps,
      expectedResults,
      evidence,
    });
  }
  
  return cases;
}

function extractList(content: string, header: string): string[] {
  const regex = new RegExp(`${header}:\\s*((?:-[^\\n]*\\n?)+)`, 'i');
  const match = content.match(regex);
  
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
}

function extractSteps(content: string): TestStep[] {
  // Look for STEPS: section and capture everything until EXPECTED RESULT
  const stepsMatch = content.match(/STEPS:([\s\S]*?)(?=\s*(?:EXPECTED RESULT|$))/i);
  if (!stepsMatch) {
    return [];
  }
  
  const stepsText = stepsMatch[1];
  const steps: TestStep[] = [];
  
  // Match numbered steps: "1. description" with optional continuation lines
  // Non-anchored regex to handle indentation variations
  const stepMatches = stepsText.matchAll(/\s+(\d+)\.\s+([^\n]*(?:\n\s+(?!\d+\.)[^\n]*)*)/g);
  
  for (const match of stepMatches) {
    const number = parseInt(match[1], 10);
    const description = match[2]
      .split('\n')
      .map(line => line.trim())
      .join(' ')
      .trim();
    
    if (!description) continue;
    
    const step: TestStep = { number, description };
    
    // Extract HTTP method and endpoint
    const methodMatch = description.match(/(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
    if (methodMatch) {
      step.method = methodMatch[1].toUpperCase();
      step.endpoint = methodMatch[2];
    }
    
    // Extract body (JSON object)
    const bodyMatch = description.match(/with body:?\s*(\{[^}]*\})/);
    if (bodyMatch) {
      step.body = bodyMatch[1];
    }
    
    // Extract DB query
    const queryMatch = description.match(/Query DB:?\s*(SELECT\s+[^.]+)/i);
    if (queryMatch) {
      step.query = queryMatch[1].trim();
    }
    
    steps.push(step);
  }
  
  return steps;
}

export function generateTestSummary(paths: PathTest[]): string {
  let summary = '# Automated Test Summary\n\n';
  
  const stats = {
    totalPaths: paths.length,
    totalCases: paths.reduce((sum, p) => sum + p.testCases.length, 0),
    byType: {} as Record<string, number>,
  };
  
  for (const path of paths) {
    for (const tc of path.testCases) {
      stats.byType[tc.type] = (stats.byType[tc.type] || 0) + 1;
    }
  }
  
  summary += `**Total Test Paths:** ${stats.totalPaths}\n`;
  summary += `**Total Test Cases:** ${stats.totalCases}\n\n`;
  summary += `## Distribution by Type\n`;
  for (const [type, count] of Object.entries(stats.byType).sort()) {
    summary += `- ${type}: ${count}\n`;
  }
  
  summary += `\n## Tests by Path\n`;
  for (const path of paths) {
    summary += `\n### ${path.pathId}: ${path.title}\n`;
    summary += `${path.testCases.length} test case(s)\n`;
    summary += path.testCases.map(tc => `  - ${tc.id} (${tc.type})`).join('\n');
  }
  
  return summary;
}
