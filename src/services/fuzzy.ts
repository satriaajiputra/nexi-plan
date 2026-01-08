import type { Task } from "../models/task.js";

/**
 * Fuzzy search result with score
 */
export interface FuzzyMatch {
  task: Task;
  score: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () => []);

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        (matrix[i - 1]![j] ?? 0) + 1, // deletion
        (matrix[i]![j - 1] ?? 0) + 1, // insertion
        (matrix[i - 1]![j - 1] ?? 0) + cost // substitution
      );
    }
  }

  return matrix[len1]![len2] ?? 0;
}

/**
 * Calculate fuzzy match score (0-1, where 1 is perfect match)
 */
function calculateScore(query: string, text: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match bonus
  if (lowerText === lowerQuery) {
    return 1;
  }

  // Starts with bonus
  if (lowerText.startsWith(lowerQuery)) {
    return 0.9;
  }

  // Contains bonus
  if (lowerText.includes(lowerQuery)) {
    return 0.8;
  }

  // Levenshtein distance based score
  const maxLen = Math.max(query.length, text.length);
  const distance = levenshteinDistance(lowerQuery, lowerText);
  const normalizedScore = 1 - distance / maxLen;

  // Boost for words that start with query characters
  const words = lowerText.split(/\s+/);
  let startsWithBonus = 0;
  for (const word of words) {
    if (word.startsWith(lowerQuery)) {
      startsWithBonus = 0.3;
      break;
    }
  }

  return Math.max(0, normalizedScore * 0.7 + startsWithBonus);
}

/**
 * Search tasks with fuzzy matching
 * Returns results sorted by relevance score
 */
export function fuzzySearchTasks(
  tasks: Task[],
  query: string
): FuzzyMatch[] {
  // Handle empty query - return no results
  if (!query || query.trim().length === 0) {
    return [];
  }

  const results: FuzzyMatch[] = [];

  for (const task of tasks) {
    // Search in name
    const nameScore = calculateScore(query, task.name);

    // Search in description
    const descScore = task.description
      ? calculateScore(query, task.description)
      : 0;

    // Take the best score
    const score = Math.max(nameScore, descScore);

    // Only include results with meaningful matches (score > 0.3)
    if (score > 0.3) {
      results.push({ task, score });
    }
  }

  // Sort by score descending (best matches first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Find best matching task
 */
export function findBestMatch(tasks: Task[], query: string): Task | null {
  const results = fuzzySearchTasks(tasks, query);
  return results.length > 0 ? results[0]!.task : null;
}

/**
 * Check if query might match a task ID
 */
export function matchesTaskId(query: string, taskId: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerId = taskId.toLowerCase();

  // Exact match
  if (lowerId === lowerQuery) {
    return true;
  }

  // Task ID starts with query (for partial matches)
  if (lowerId.startsWith(lowerQuery)) {
    return true;
  }

  return false;
}
