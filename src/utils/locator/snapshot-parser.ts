/**
 * Snapshot Parser Utility
 * Parses accessibility snapshot from Playwright MCP and provides search capabilities
 * 
 * This is a pure utility with NO infrastructure dependencies
 * 
 * Playwright MCP snapshot format example:
 * ```yaml
 * - generic [ref=e1]:
 *   - generic [ref=e3]:
 *     - textbox "Username" [ref=e13]
 *     - button "Login" [disabled] [ref=e14]
 * ```
 */

import { createLogger, ILogger } from '../../infrastructure/logging';

const logger: ILogger = createLogger({ level: 'info', format: 'json' });

/**
 * Accessibility node from Playwright snapshot
 */
export interface AccessibilityNode {
  /** Element role (button, textbox, link, etc.) */
  role: string;
  /** Accessible name */
  name?: string;
  /** Reference ID for targeting element */
  ref?: string;
  /** Accessible description */
  description?: string;
  /** Current value (for inputs) */
  value?: string;
  /** Checked state (for checkboxes) */
  checked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Expanded state (for expandable elements) */
  expanded?: boolean;
  /** Focused state */
  focused?: boolean;
  /** Selected state */
  selected?: boolean;
  /** Child nodes */
  children?: AccessibilityNode[];
}

/**
 * Flattened node with path information
 */
export interface FlattenedNode {
  /** The accessibility node */
  node: AccessibilityNode;
  /** Path to this node (indices) */
  path: number[];
  /** Depth in the tree */
  depth: number;
  /** Parent node (if any) */
  parent?: AccessibilityNode;
}

/**
 * Search match result
 */
export interface SnapshotSearchResult {
  /** The matching node */
  node: AccessibilityNode;
  /** Reference ID for targeting */
  ref?: string;
  /** Match confidence (0-1) */
  confidence: number;
  /** How it matched */
  matchType: 'exact-name' | 'partial-name' | 'role-match' | 'description-match' | 'combined';
  /** Path in the tree */
  path: number[];
}

/**
 * Search options
 */
export interface SnapshotSearchOptions {
  /** Target text/description to search for */
  target: string;
  /** Optional role filter */
  role?: string;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Maximum results to return */
  maxResults?: number;
  /** Include disabled elements */
  includeDisabled?: boolean;
}

/**
 * Extract YAML content from Playwright MCP snapshot response
 * Handles markdown code blocks and various formats
 */
function extractYamlFromResponse(snapshotString: string): string {
  // If it's wrapped in markdown code blocks, extract the content
  const yamlBlockMatch = snapshotString.match(/```yaml\s*([\s\S]*?)```/);
  if (yamlBlockMatch) {
    return yamlBlockMatch[1].trim();
  }
  
  // If there's a "Page Snapshot:" section, extract after it
  const pageSnapshotMatch = snapshotString.match(/Page Snapshot:\s*\n([\s\S]*)/);
  if (pageSnapshotMatch) {
    let content = pageSnapshotMatch[1];
    // Remove ```yaml wrapper if present at the start
    if (content.trim().startsWith('```yaml')) {
      content = content.replace(/^\s*```yaml\s*\n?/, '').replace(/```\s*$/, '');
    }
    return content.trim();
  }
  
  // Return as-is if no special formatting detected
  return snapshotString;
}

/**
 * Parse a snapshot string into AccessibilityNode tree
 * The snapshot from Playwright MCP comes as a formatted YAML-like string
 * 
 * Format example:
 * - generic [ref=e1]:
 *   - generic [ref=e3]:
 *     - textbox "Username" [ref=e13]
 *     - button "Login" [disabled] [ref=e14]
 */
export function parseSnapshotString(snapshotString: string): AccessibilityNode[] {
  logger.info('parseSnapshotString called', { inputLength: snapshotString.length });
  
  // Extract YAML from markdown if needed
  const yamlContent = extractYamlFromResponse(snapshotString);
  logger.info('Extracted YAML content', { yamlLength: yamlContent.length });
  
  const nodes: AccessibilityNode[] = [];
  const lines = yamlContent.split('\n');
  
  logger.info('Parsing snapshot lines', { lineCount: lines.length });
  
  const stack: { node: AccessibilityNode; indent: number }[] = [];
  let parsedCount = 0;
  let skippedCount = 0;
  
  for (const line of lines) {
    // Skip empty lines, comments, and metadata lines
    const trimmed = line.trim();
    if (!trimmed || 
        trimmed.startsWith('#') || 
        trimmed.startsWith('Page URL:') ||
        trimmed.startsWith('Page Title:') ||
        trimmed.startsWith('- Page URL:') ||
        trimmed.startsWith('- Page Title:')) {
      skippedCount++;
      continue;
    }
    
    const parsed = parseSnapshotLine(line);
    if (!parsed) {
      skippedCount++;
      continue;
    }
    
    parsedCount++;
    const { indent, node } = parsed;
    
    // Find parent based on indentation
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      // Root level node
      nodes.push(node);
    } else {
      // Child of current parent
      const parent = stack[stack.length - 1].node;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    }
    
    stack.push({ node, indent });
  }
  
  logger.info('Parsing complete', { 
    nodeCount: nodes.length, 
    parsedLines: parsedCount,
    skippedLines: skippedCount,
    totalFlatNodes: flattenTree(nodes).length 
  });
  
  return nodes;
}

/**
 * Parse a single line from snapshot string
 * 
 * Playwright MCP format examples:
 * - generic [ref=e1]:
 * - textbox "Username" [ref=e13]
 * - button "Login" [disabled] [ref=e14]
 * - heading "Welcome" [level=2] [ref=e20]
 * - link "Sign up" [focused] [ref=e25]
 * - StaticText: Some text content
 */
function parseSnapshotLine(line: string): { indent: number; node: AccessibilityNode } | null {
  // Calculate indentation (count leading spaces)
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1].length : 0;
  
  const content = line.trim();
  
  // Must start with a dash for YAML list item
  if (!content.startsWith('-')) return null;
  
  // Remove leading dash and trim
  let text = content.substring(1).trim();
  
  // Remove trailing colon if present (indicates children follow)
  text = text.replace(/:$/, '');
  
  // Extract ref if present [ref=xxx]
  const refMatch = text.match(/\[ref=([^\]]+)\]/);
  const ref = refMatch ? refMatch[1] : undefined;
  
  // Extract and track other attributes in square brackets
  const attributes: Record<string, string | boolean> = {};
  let textWithoutAttributes = text;
  
  // Process all bracket attributes: [ref=e1], [disabled], [level=2], [focused], [active], etc.
  const bracketPattern = /\[([^\]=]+)(?:=([^\]]+))?\]/g;
  let match;
  while ((match = bracketPattern.exec(text)) !== null) {
    const attrName = match[1];
    const attrValue = match[2];
    
    if (attrName === 'ref') {
      // ref already captured
    } else if (attrValue !== undefined) {
      attributes[attrName] = attrValue;
    } else {
      // Boolean attribute like [disabled], [focused], [active]
      attributes[attrName] = true;
    }
    
    // Remove this bracket from text for role/name parsing
    textWithoutAttributes = textWithoutAttributes.replace(match[0], '');
  }
  
  textWithoutAttributes = textWithoutAttributes.trim();
  
  // Parse role and name
  let role: string;
  let name: string | undefined;
  let value: string | undefined;
  
  // Pattern 1: role "name"  (e.g., textbox "Username")
  const quotedMatch = textWithoutAttributes.match(/^(\S+)\s+"([^"]*)"(.*)$/);
  
  // Pattern 2: role: value  (e.g., StaticText: Some text)
  const colonValueMatch = textWithoutAttributes.match(/^(\S+):\s*(.+)$/);
  
  // Pattern 3: just role (e.g., generic)
  const simpleMatch = textWithoutAttributes.match(/^(\S+)$/);
  
  if (quotedMatch) {
    role = quotedMatch[1];
    name = quotedMatch[2];
    // Check for additional text after name (could be value)
    const remainder = quotedMatch[3]?.trim();
    if (remainder) {
      value = remainder;
    }
  } else if (colonValueMatch) {
    role = colonValueMatch[1];
    value = colonValueMatch[2];
  } else if (simpleMatch) {
    role = simpleMatch[1];
  } else {
    // Fallback: first word is role, rest is name
    const parts = textWithoutAttributes.split(/\s+/);
    role = parts[0] || 'generic';
    if (parts.length > 1) {
      name = parts.slice(1).join(' ').replace(/"/g, '').trim() || undefined;
    }
  }
  
  // Build the node
  const node: AccessibilityNode = {
    role,
    ref,
  };
  
  if (name) node.name = name;
  if (value) node.value = value;
  
  // Map bracket attributes to node properties
  if (attributes.disabled) node.disabled = true;
  if (attributes.focused) node.focused = true;
  if (attributes.checked) node.checked = true;
  if (attributes.selected) node.selected = true;
  if (attributes.expanded !== undefined) {
    node.expanded = attributes.expanded === true || attributes.expanded === 'true';
  }
  if (attributes.level) {
    // level is stored as description for headings
    node.description = `Level ${attributes.level}`;
  }
  
  return {
    indent,
    node,
  };
}

/**
 * Flatten the accessibility tree into a list
 */
export function flattenTree(
  nodes: AccessibilityNode[],
  parent?: AccessibilityNode,
  path: number[] = [],
  depth: number = 0
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  
  nodes.forEach((node, index) => {
    const currentPath = [...path, index];
    
    result.push({
      node,
      path: currentPath,
      depth,
      parent,
    });
    
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, node, currentPath, depth + 1));
    }
  });
  
  return result;
}

/**
 * Search for elements in the accessibility tree
 */
export function searchSnapshot(
  nodes: AccessibilityNode[],
  options: SnapshotSearchOptions
): SnapshotSearchResult[] {
  const {
    target,
    role,
    minConfidence = 0.3,
    maxResults = 10,
    includeDisabled = false,
  } = options;
  
  const flattened = flattenTree(nodes);
  const results: SnapshotSearchResult[] = [];
  const targetLower = target.toLowerCase();
  const targetWords = targetLower.split(/\s+/);
  
  for (const { node, path } of flattened) {
    // Skip disabled elements if not included
    if (!includeDisabled && node.disabled) continue;
    
    // Role filter
    if (role && node.role.toLowerCase() !== role.toLowerCase()) continue;
    
    // Calculate match score
    const matchResult = calculateMatchScore(node, targetLower, targetWords);
    
    if (matchResult.confidence >= minConfidence) {
      results.push({
        node,
        ref: node.ref,
        confidence: matchResult.confidence,
        matchType: matchResult.matchType,
        path,
      });
    }
  }
  
  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  
  return results.slice(0, maxResults);
}

/**
 * Calculate match score between node and target
 */
function calculateMatchScore(
  node: AccessibilityNode,
  targetLower: string,
  targetWords: string[]
): { confidence: number; matchType: SnapshotSearchResult['matchType'] } {
  const nameLower = (node.name || '').toLowerCase();
  const descLower = (node.description || '').toLowerCase();
  const roleLower = node.role.toLowerCase();
  const valueLower = (node.value || '').toLowerCase();
  
  // Exact name match
  if (nameLower === targetLower) {
    return { confidence: 1.0, matchType: 'exact-name' };
  }
  
  // Name contains target or target contains name
  if (nameLower.includes(targetLower) || targetLower.includes(nameLower)) {
    const ratio = Math.min(nameLower.length, targetLower.length) / 
                  Math.max(nameLower.length, targetLower.length);
    return { confidence: 0.7 + (ratio * 0.2), matchType: 'partial-name' };
  }
  
  // Check if target words match name words
  const nameWords = nameLower.split(/\s+/);
  const wordMatches = targetWords.filter(tw => 
    nameWords.some(nw => nw.includes(tw) || tw.includes(nw))
  ).length;
  
  if (wordMatches > 0) {
    const confidence = 0.5 + (wordMatches / targetWords.length) * 0.4;
    return { confidence, matchType: 'partial-name' };
  }
  
  // Role + partial name combination
  if (targetWords.includes(roleLower)) {
    const remainingWords = targetWords.filter(w => w !== roleLower);
    if (remainingWords.length === 0) {
      return { confidence: 0.6, matchType: 'role-match' };
    }
    
    const otherMatch = remainingWords.some(w => 
      nameLower.includes(w) || descLower.includes(w)
    );
    if (otherMatch) {
      return { confidence: 0.75, matchType: 'combined' };
    }
  }
  
  // Description match
  if (descLower.includes(targetLower)) {
    return { confidence: 0.5, matchType: 'description-match' };
  }
  
  // Value match (for inputs)
  if (valueLower && valueLower.includes(targetLower)) {
    return { confidence: 0.4, matchType: 'partial-name' };
  }
  
  return { confidence: 0, matchType: 'partial-name' };
}

/**
 * Find element by role and name
 */
export function findByRoleAndName(
  nodes: AccessibilityNode[],
  role: string,
  name?: string
): SnapshotSearchResult | null {
  const flattened = flattenTree(nodes);
  
  for (const { node, path } of flattened) {
    if (node.role.toLowerCase() === role.toLowerCase()) {
      if (!name || (node.name && node.name.toLowerCase() === name.toLowerCase())) {
        return {
          node,
          ref: node.ref,
          confidence: name ? 1.0 : 0.8,
          matchType: 'exact-name',
          path,
        };
      }
    }
  }
  
  return null;
}

/**
 * Find element by ref
 */
export function findByRef(nodes: AccessibilityNode[], ref: string): AccessibilityNode | null {
  const flattened = flattenTree(nodes);
  
  for (const { node } of flattened) {
    if (node.ref === ref) {
      return node;
    }
  }
  
  return null;
}

/**
 * Get all elements of a specific role
 */
export function getElementsByRole(nodes: AccessibilityNode[], role: string): AccessibilityNode[] {
  const flattened = flattenTree(nodes);
  return flattened
    .filter(({ node }) => node.role.toLowerCase() === role.toLowerCase())
    .map(({ node }) => node);
}

/**
 * Build a selector hint from accessibility node
 */
export function buildSelectorHint(node: AccessibilityNode): string {
  const parts: string[] = [];
  
  if (node.role) {
    parts.push(`role=${node.role}`);
  }
  
  if (node.name) {
    parts.push(`name="${node.name}"`);
  }
  
  if (node.ref) {
    parts.push(`ref=${node.ref}`);
  }
  
  return parts.join(', ');
}
