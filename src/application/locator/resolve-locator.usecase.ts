/**
 * Resolve Locator Use Case
 * Maps target descriptions from mapped steps to actual DOM element refs
 * using accessibility snapshot
 */

import { UIAction, UIActionType } from '../../domain/models/MappedStep';
import { Locator, createLocator } from '../../domain/models/Locator';
import { v4 as uuidv4 } from 'uuid';
import {
  AccessibilityNode,
  parseSnapshotString,
  searchSnapshot,
  findByRoleAndName,
  SnapshotSearchResult,
  flattenTree,
} from '../../utils/locator/snapshot-parser';
import { createLogger, ILogger } from '../../infrastructure/logging';

const logger: ILogger = createLogger({ level: 'info', format: 'json' });

/**
 * Input for locator resolution
 */
export interface ResolveLocatorInput {
  /** Target description from mapped step */
  target: string;
  /** The UI action type (helps narrow down element roles) */
  actionType: UIActionType;
  /** Accessibility snapshot (parsed or raw string) */
  snapshot: AccessibilityNode[] | string;
  /** Optional hint about expected role */
  roleHint?: string;
}

/**
 * Output from locator resolution
 */
export interface ResolveLocatorOutput {
  /** Whether resolution was successful */
  resolved: boolean;
  /** The ref to use for targeting element */
  ref?: string;
  /** Confidence of the match (0-1) */
  confidence: number;
  /** The matched element info */
  element?: {
    role: string;
    name?: string;
    ref?: string;
  };
  /** Created locator object (if resolved) */
  locator?: Locator;
  /** Alternative matches if primary confidence is low */
  alternatives?: Array<{
    ref?: string;
    role: string;
    name?: string;
    confidence: number;
  }>;
  /** Reason if resolution failed */
  failureReason?: string;
}

/**
 * Map action types to likely element roles
 */
const ACTION_TO_ROLES: Record<UIActionType, string[]> = {
  click: ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'option'],
  type: ['textbox', 'searchbox', 'combobox', 'spinbutton'],
  fill: ['textbox', 'searchbox', 'combobox', 'spinbutton', 'textarea'],
  clear: ['textbox', 'searchbox', 'combobox', 'textarea'],
  select: ['combobox', 'listbox', 'menu', 'option'],
  check: ['checkbox', 'switch'],
  uncheck: ['checkbox', 'switch'],
  hover: ['button', 'link', 'menuitem', 'img', 'tooltip'],
  scroll: ['scrollbar', 'region', 'document'],
  wait: [],
  screenshot: [],
  navigate: [],
  assert: [],
  press: ['textbox', 'document'],
  drag: [],
  upload: ['button', 'input'],
  download: [],
  focus: [],
  blur: [],
};

export class ResolveLocatorUseCase {
  /**
   * Resolve a target description to an element ref
   */
  execute(input: ResolveLocatorInput): ResolveLocatorOutput {
    const { target: rawTarget, actionType, snapshot, roleHint } = input;

    // Clean up target by removing role prefixes like "input:", "link:", "button:", etc.
    const cleanedTarget = this.cleanTarget(rawTarget);
    
    logger.debug('ResolveLocatorUseCase.execute', { rawTarget, cleanedTarget, actionType, roleHint });

    // Parse snapshot if string
    const nodes: AccessibilityNode[] = 
      typeof snapshot === 'string' ? parseSnapshotString(snapshot) : snapshot;

    const flatNodes = flattenTree(nodes);

    if (nodes.length === 0) {
      return {
        resolved: false,
        confidence: 0,
        failureReason: 'Empty or invalid snapshot',
      };
    }

    // Determine roles to search for based on action type
    const likelyRoles = roleHint 
      ? [roleHint] 
      : ACTION_TO_ROLES[actionType] || [];

    // Strategy 1: Search with role filter (if we have likely roles)
    let results: SnapshotSearchResult[] = [];
    
    if (likelyRoles.length > 0) {
      for (const role of likelyRoles) {
        const roleResults = searchSnapshot(nodes, {
          target: cleanedTarget,
          role,
          minConfidence: 0.4,
          maxResults: 3,
        });
        results.push(...roleResults);
      }
      // Sort combined results by confidence
      results.sort((a, b) => b.confidence - a.confidence);
    }

    // Strategy 2: Search without role filter if no good matches
    if (results.length === 0 || results[0].confidence < 0.7) {
      const generalResults = searchSnapshot(nodes, {
        target: cleanedTarget,
        minConfidence: 0.3,
        maxResults: 5,
      });
      
      // Merge with role-filtered results
      for (const r of generalResults) {
        if (!results.some(existing => existing.ref === r.ref)) {
          results.push(r);
        }
      }
      results.sort((a, b) => b.confidence - a.confidence);
    }

    // Strategy 3: Try exact role+name match
    if (results.length === 0 || results[0].confidence < 0.8) {
      for (const role of likelyRoles) {
        const exactMatch = findByRoleAndName(nodes, role, cleanedTarget);
        if (exactMatch && exactMatch.confidence > (results[0]?.confidence || 0)) {
          results.unshift(exactMatch);
          break;
        }
      }
    }

    // Strategy 4: For form inputs (fill/type), find label with target text and look for adjacent input
    // This handles cases where the input has no accessible name but is in the same row/cell as the label
    if ((actionType === 'fill' || actionType === 'type') && 
        (results.length === 0 || !likelyRoles.includes(results[0]?.node?.role?.toLowerCase()))) {
      const labelMatch = this.findInputByLabel(flatNodes, cleanedTarget, likelyRoles);
      if (labelMatch) {
        logger.debug('Found input via label association', { inputRef: labelMatch.inputRef, inputRole: labelMatch.inputRole });
        // Insert at front if better than current best
        if (!results[0] || results[0].confidence < 0.85) {
          results.unshift({
            node: labelMatch.inputNode,
            ref: labelMatch.inputRef,
            confidence: 0.9,
            matchType: 'combined',
            path: [],
          });
        }
      }
    }

    // Build output
    if (results.length === 0) {
      return {
        resolved: false,
        confidence: 0,
        failureReason: `No element found matching "${cleanedTarget}"`,
      };
    }

    // Filter out root element (e1) and generic containers which are not actionable
    const filteredResults = results.filter(r => {
      // Reject root element e1 (usually body)
      if (r.ref === 'e1' || r.ref === 'E1') {
        return false;
      }
      // Reject generic role elements for click actions (they're usually containers)
      if (r.node.role === 'generic' && !r.node.name) {
        return false;
      }
      return true;
    });

    // If all results were filtered out, return not resolved
    if (filteredResults.length === 0) {
      return {
        resolved: false,
        confidence: 0,
        failureReason: `No actionable element found matching "${cleanedTarget}" (only generic containers found)`,
      };
    }

    const best = filteredResults[0];
    
    // CRITICAL: Require higher confidence for click actions when there's no text match
    // This prevents false positives where random elements get matched with low confidence
    const minRequiredConfidence = 0.5;
    
    // Additional validation: if the element name doesn't contain any part of the target, 
    // require much higher confidence (prevent matching random elements)
    const elementName = (best.node.name || '').toLowerCase();
    const targetWords = cleanedTarget.toLowerCase().split(/\s+/);
    const hasNameOverlap = targetWords.some(word => 
      word.length > 2 && elementName.includes(word)
    );
    
    if (!hasNameOverlap && best.confidence < 0.8) {
      logger.debug('Low confidence match with no name overlap', { target: cleanedTarget, bestMatch: best.node.name || best.node.role });
      return {
        resolved: false,
        confidence: best.confidence,
        failureReason: `No element found matching "${cleanedTarget}" (best match "${best.node.name || best.node.role}" has no name overlap)`,
      };
    }
    
    logger.debug('Resolved locator', {
      target: cleanedTarget,
      ref: best.ref,
      role: best.node.role,
      name: best.node.name,
      confidence: best.confidence,
    });
    
    const alternatives = filteredResults.slice(1, 4).map(r => ({
      ref: r.ref,
      role: r.node.role,
      name: r.node.name,
      confidence: r.confidence,
    }));

    // Create Locator object if resolved
    let locator: Locator | undefined;
    if (best.confidence >= 0.5 && best.ref) {
      const confidenceLevel = best.confidence >= 0.8 ? 'high' : 
                              best.confidence >= 0.6 ? 'medium' : 'low';
      locator = createLocator({
        id: `loc_${uuidv4()}`,
        strategy: 'role',
        value: best.ref,
        description: `${best.node.role}: ${best.node.name || cleanedTarget}`,
        confidence: confidenceLevel,
        source: 'mcp',
      });
    }

    return {
      resolved: best.confidence >= 0.5,
      ref: best.ref,
      confidence: best.confidence,
      element: {
        role: best.node.role,
        name: best.node.name,
        ref: best.ref,
      },
      locator,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      failureReason: best.confidence < 0.5 
        ? `Low confidence match for "${cleanedTarget}" (${(best.confidence * 100).toFixed(0)}%)`
        : undefined,
    };
  }

  /**
   * Clean up target by removing role prefixes like "input:", "link:", etc.
   */
  private cleanTarget(target: string): string {
    // Common role prefixes to remove
    const prefixes = [
      /^(input|textbox|field|text field|text box):\s*/i,
      /^(link|hyperlink|anchor):\s*/i,
      /^(button|btn):\s*/i,
      /^(checkbox|check box|check):\s*/i,
      /^(radio|radio button):\s*/i,
      /^(select|dropdown|combo|combobox):\s*/i,
      /^(text|label|heading|title):\s*/i,
      /^(image|img|icon):\s*/i,
      /^(tab|menu|menuitem):\s*/i,
    ];

    let cleaned = target.trim();
    
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }
    
    // Also remove common suffixes
    cleaned = cleaned.replace(/\s+(field|input|button|link|box|text)$/i, '');
    
    // Remove trailing location qualifiers such as "on rightside panel", "in the form", "inside main container"
    cleaned = cleaned.replace(/\s+(?:on|in|inside|within|at|from)\s+(?:the\s+)?(?:right\s*side|left\s*side|rightside|leftside|main|top|bottom|center|modal|dialog|popup|panel|form|container|section|page|area|header|footer|sidebar|content)\b.*/i, '');
    
    return cleaned.trim();
  }

  /**
   * Find an input element by looking for a label with the target text
   * and then finding an adjacent/sibling input element.
   * 
   * This handles forms where inputs don't have accessible names but
   * are visually/structurally associated with label text.
   * 
   * Pattern: row > cell "Label" + cell > textbox
   */
  private findInputByLabel(
    flatNodes: Array<{ node: AccessibilityNode; path: number[]; depth: number; parent?: AccessibilityNode }>,
    targetText: string,
    inputRoles: string[]
  ): { labelRef?: string; inputRef: string; inputRole: string; inputNode: AccessibilityNode } | null {
    const targetLower = targetText.toLowerCase();
    const inputRolesLower = inputRoles.map(r => r.toLowerCase());
    
    // Find all elements whose name contains the target text
    const labelCandidates = flatNodes.filter(f => {
      const name = (f.node.name || '').toLowerCase();
      const role = f.node.role.toLowerCase();
      // Match if name contains target and it's a label-like element (cell, generic, span, label, etc.)
      return name.includes(targetLower) && 
             ['cell', 'generic', 'paragraph', 'label', 'text', 'statictext'].includes(role);
    });

    logger.debug('Label candidates for input search', { target: targetText, count: labelCandidates.length });

    for (const labelCandidate of labelCandidates) {
      // Look for input in same parent (row) or as sibling
      const labelIndex = flatNodes.indexOf(labelCandidate);
      
      // Search forward in the flat list for the next input element (usually in same row)
      for (let i = labelIndex + 1; i < Math.min(labelIndex + 20, flatNodes.length); i++) {
        const candidate = flatNodes[i];
        const candidateRole = candidate.node.role.toLowerCase();
        
        // Check if this is an input element
        if (inputRolesLower.includes(candidateRole)) {
          // Prefer inputs without names (they're the ones that need label association)
          // or inputs that are close in the tree
          const inputName = candidate.node.name || '';
          
          // Skip if the input already has a different clear name (it belongs to another field)
          if (inputName && 
              !inputName.toLowerCase().includes(targetLower) &&
              inputName.length > 2) {
            // This input has a name that doesn't match - might belong to another field
            // But only skip if we find another input role that better matches
            continue;
          }
          
          logger.debug('Found input via label association', { inputRef: candidate.node.ref, inputRole: candidate.node.role });
          
          return {
            labelRef: labelCandidate.node.ref,
            inputRef: candidate.node.ref!,
            inputRole: candidate.node.role,
            inputNode: candidate.node,
          };
        }
        
        // Stop if we hit another row or major structural element
        if (['row', 'table', 'form', 'section'].includes(candidateRole)) {
          break;
        }
      }
    }

    return null;
  }

  /**
   * Resolve multiple targets at once
   */
  executeMultiple(
    targets: Array<{ target: string; actionType: UIActionType }>,
    snapshot: AccessibilityNode[] | string
  ): Map<string, ResolveLocatorOutput> {
    const results = new Map<string, ResolveLocatorOutput>();
    
    // Parse snapshot once
    const nodes: AccessibilityNode[] = 
      typeof snapshot === 'string' ? parseSnapshotString(snapshot) : snapshot;

    for (const { target, actionType } of targets) {
      const result = this.execute({
        target,
        actionType,
        snapshot: nodes,
      });
      results.set(target, result);
    }

    return results;
  }

  /**
   * Resolve target from UIAction description/value
   * UIAction may have locator already or need resolution from description
   */
  resolveForAction(
    action: UIAction,
    snapshot: AccessibilityNode[] | string
  ): ResolveLocatorOutput {
    // If action already has a resolved locator with ref, return early
    if (action.locator?.value?.startsWith('ref=')) {
      return {
        resolved: true,
        ref: action.locator.value.replace('ref=', ''),
        confidence: 1.0,
        element: {
          role: action.locator.strategy,
          name: action.locator.description,
          ref: action.locator.value.replace('ref=', ''),
        },
        locator: action.locator,
      };
    }

    // Use description or value as target
    const target = action.description || action.value || '';
    if (!target) {
      return {
        resolved: false,
        confidence: 0,
        failureReason: 'No target description available in action',
      };
    }

    return this.execute({
      target,
      actionType: action.type,
      snapshot,
    });
  }

  /**
   * Enhance a UIAction with resolved locator
   */
  enhanceAction(
    action: UIAction,
    snapshot: AccessibilityNode[] | string
  ): UIAction {
    const resolution = this.resolveForAction(action, snapshot);

    if (!resolution.resolved || !resolution.locator) {
      return action;
    }

    return {
      ...action,
      locator: resolution.locator,
    };
  }
}
