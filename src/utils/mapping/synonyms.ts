/**
 * Synonym Resolution Utility
 * Maps natural language phrases to UI action types
 * 
 * This is a pure utility with NO infrastructure dependencies
 */

import { UIActionType, AssertionType } from '../../domain/models/MappedStep';

/**
 * Action synonym mapping
 * Maps various natural language verbs/phrases to UIActionType
 */
export const ACTION_SYNONYMS: Record<string, UIActionType> = {
  // Navigation
  'navigate': 'navigate',
  'go to': 'navigate',
  'open': 'navigate',
  'visit': 'navigate',
  'browse to': 'navigate',
  'load': 'navigate',
  'access': 'navigate',
  
  // Click actions
  'click': 'click',
  'tap': 'click',
  'press': 'click',
  'hit': 'click',
  'select': 'click',
  'choose': 'click',
  'pick': 'click',
  
  // Type/Input actions
  'type': 'type',
  'enter': 'type',
  'input': 'type',
  'write': 'type',
  'fill in': 'fill',
  'fill': 'fill',
  'populate': 'fill',
  'set': 'fill',
  
  // Clear actions
  'clear': 'clear',
  'erase': 'clear',
  'delete': 'clear',
  'remove': 'clear',
  'empty': 'clear',
  
  // Select/Dropdown actions
  'select option': 'select',
  'choose option': 'select',
  'pick option': 'select',
  'select from dropdown': 'select',
  'select from': 'select',
  
  // Checkbox actions
  'check': 'check',
  'tick': 'check',
  'enable': 'check',
  'mark': 'check',
  'uncheck': 'uncheck',
  'untick': 'uncheck',
  'disable': 'uncheck',
  'unmark': 'uncheck',
  
  // Hover actions
  'hover': 'hover',
  'hover over': 'hover',
  'mouse over': 'hover',
  'move to': 'hover',
  'point to': 'hover',
  
  // Drag actions
  'drag': 'drag',
  'drag and drop': 'drag',
  'move': 'drag',
  
  // Scroll actions
  'scroll': 'scroll',
  'scroll to': 'scroll',
  'scroll down': 'scroll',
  'scroll up': 'scroll',
  
  // Wait actions
  'wait': 'wait',
  'wait for': 'wait',
  'pause': 'wait',
  'delay': 'wait',
  
  // Focus actions
  'focus': 'focus',
  'focus on': 'focus',
  'blur': 'blur',
  'unfocus': 'blur',
  
  // Screenshot actions
  'screenshot': 'screenshot',
  'capture': 'screenshot',
  'take screenshot': 'screenshot',
  'snap': 'screenshot',
  
  // Key press actions
  'press key': 'press',
  'hit key': 'press',
  'keyboard': 'press',
  
  // Upload actions
  'upload': 'upload',
  'attach': 'upload',
  'upload file': 'upload',
  'attach file': 'upload',
  
  // Download actions
  'download': 'download',
  'save file': 'download',
  
  // Assert/Verify actions
  'see': 'assert',
  'verify': 'assert',
  'assert': 'assert',
  'check that': 'assert',
  'confirm': 'assert',
  'ensure': 'assert',
  'should see': 'assert',
  'should have': 'assert',
  'should be': 'assert',
  'should contain': 'assert',
  'expect': 'assert',
  'validate': 'assert',
};

/**
 * Assertion type synonyms
 * Maps assertion phrases to AssertionType
 */
export const ASSERTION_SYNONYMS: Record<string, AssertionType> = {
  // Visibility
  'visible': 'visible',
  'displayed': 'visible',
  'shown': 'visible',
  'appears': 'visible',
  'hidden': 'hidden',
  'not visible': 'hidden',
  'invisible': 'hidden',
  'disappears': 'hidden',
  
  // State
  'enabled': 'enabled',
  'active': 'enabled',
  'clickable': 'enabled',
  'disabled': 'disabled',
  'inactive': 'disabled',
  'grayed out': 'disabled',
  
  // Checkbox state
  'checked': 'checked',
  'selected': 'checked',
  'ticked': 'checked',
  'unchecked': 'unchecked',
  'unselected': 'unchecked',
  'unticked': 'unchecked',
  
  // Content
  'text': 'text',
  'contain': 'text',
  'contains': 'text',
  'has text': 'text',
  'shows': 'text',
  'display': 'text',
  'displays': 'text',
  'show': 'text',
  'include': 'text',
  'includes': 'text',
  'value': 'value',
  'has value': 'value',
  
  // Attribute
  'attribute': 'attribute',
  'has attribute': 'attribute',
  'property': 'attribute',
  
  // Count
  'count': 'count',
  'number': 'count',
  'length': 'count',
  
  // URL
  'url': 'url',
  'address': 'url',
  'location': 'url',
  
  // Title
  'title': 'title',
  'page title': 'title',
};

/**
 * Element type synonyms
 * Maps natural language element names to semantic types
 */
export const ELEMENT_SYNONYMS: Record<string, string> = {
  // Buttons
  'button': 'button',
  'btn': 'button',
  'submit': 'button',
  'submit button': 'button',
  'cancel button': 'button',
  
  // Links
  'link': 'link',
  'hyperlink': 'link',
  'anchor': 'link',
  
  // Inputs
  'input': 'input',
  'field': 'input',
  'text field': 'input',
  'textbox': 'input',
  'text box': 'input',
  'input field': 'input',
  
  // Password
  'password': 'password',
  'password field': 'password',
  
  // Email
  'email': 'email',
  'email field': 'email',
  
  // Textarea
  'textarea': 'textarea',
  'text area': 'textarea',
  'multiline': 'textarea',
  
  // Dropdowns
  'dropdown': 'select',
  'drop down': 'select',
  'select': 'select',
  'combobox': 'select',
  'combo box': 'select',
  'listbox': 'select',
  
  // Checkboxes
  'checkbox': 'checkbox',
  'check box': 'checkbox',
  'tickbox': 'checkbox',
  
  // Radio buttons
  'radio': 'radio',
  'radio button': 'radio',
  'option': 'radio',
  
  // Images
  'image': 'image',
  'img': 'image',
  'picture': 'image',
  'photo': 'image',
  'icon': 'image',
  
  // Tables
  'table': 'table',
  'grid': 'table',
  'row': 'row',
  'cell': 'cell',
  'column': 'column',
  
  // Headers
  'header': 'header',
  'heading': 'heading',
  'title': 'heading',
  'h1': 'heading',
  'h2': 'heading',
  'h3': 'heading',
  
  // Labels
  'label': 'label',
  'text': 'text',
  'paragraph': 'text',
  'message': 'text',
  
  // Dialogs
  'dialog': 'dialog',
  'modal': 'dialog',
  'popup': 'dialog',
  'alert': 'alert',
  'confirm': 'dialog',
  'prompt': 'dialog',
  
  // Menu
  'menu': 'menu',
  'navigation': 'navigation',
  'nav': 'navigation',
  'sidebar': 'navigation',
  'menu item': 'menuitem',
  
  // Tab
  'tab': 'tab',
  'tab panel': 'tabpanel',
  
  // Form
  'form': 'form',
};

/**
 * Resolve action type from natural language phrase
 * @param phrase - Natural language phrase
 * @returns UIActionType or undefined if not found
 */
export function resolveActionType(phrase: string): UIActionType | undefined {
  const normalized = phrase.toLowerCase().trim();
  
  // Direct match
  if (ACTION_SYNONYMS[normalized]) {
    return ACTION_SYNONYMS[normalized];
  }
  
  // Partial match (phrase starts with synonym)
  for (const [synonym, actionType] of Object.entries(ACTION_SYNONYMS)) {
    if (normalized.startsWith(synonym)) {
      return actionType;
    }
  }
  
  // Check if any synonym is contained in the phrase
  for (const [synonym, actionType] of Object.entries(ACTION_SYNONYMS)) {
    if (normalized.includes(synonym)) {
      return actionType;
    }
  }
  
  return undefined;
}

/**
 * Resolve assertion type from natural language phrase
 * @param phrase - Natural language phrase
 * @returns AssertionType or undefined if not found
 */
export function resolveAssertionType(phrase: string): AssertionType | undefined {
  const normalized = phrase.toLowerCase().trim();
  
  // Direct match
  if (ASSERTION_SYNONYMS[normalized]) {
    return ASSERTION_SYNONYMS[normalized];
  }
  
  // Check if any synonym is contained in the phrase
  for (const [synonym, assertionType] of Object.entries(ASSERTION_SYNONYMS)) {
    if (normalized.includes(synonym)) {
      return assertionType;
    }
  }
  
  return undefined;
}

/**
 * Resolve element type from natural language phrase
 * @param phrase - Natural language phrase
 * @returns Semantic element type or undefined if not found
 */
export function resolveElementType(phrase: string): string | undefined {
  const normalized = phrase.toLowerCase().trim();
  
  // Direct match
  if (ELEMENT_SYNONYMS[normalized]) {
    return ELEMENT_SYNONYMS[normalized];
  }
  
  // Check if any synonym is contained in the phrase
  for (const [synonym, elementType] of Object.entries(ELEMENT_SYNONYMS)) {
    if (normalized.includes(synonym)) {
      return elementType;
    }
  }
  
  return undefined;
}

/**
 * Get all synonyms for an action type
 * @param actionType - UI action type
 * @returns Array of synonyms
 */
export function getSynonymsForAction(actionType: UIActionType): string[] {
  return Object.entries(ACTION_SYNONYMS)
    .filter(([, type]) => type === actionType)
    .map(([synonym]) => synonym);
}

/**
 * Get all synonyms for an assertion type
 * @param assertionType - Assertion type
 * @returns Array of synonyms
 */
export function getSynonymsForAssertion(assertionType: AssertionType): string[] {
  return Object.entries(ASSERTION_SYNONYMS)
    .filter(([, type]) => type === assertionType)
    .map(([synonym]) => synonym);
}

/**
 * Check if a phrase likely indicates an assertion
 * @param phrase - Natural language phrase
 * @returns true if the phrase indicates an assertion
 */
export function isAssertionPhrase(phrase: string): boolean {
  const normalized = phrase.toLowerCase().trim();
  const assertionIndicators = [
    'should', 'verify', 'assert', 'check', 'confirm', 
    'ensure', 'expect', 'see', 'validate', 'must'
  ];
  
  return assertionIndicators.some(indicator => normalized.includes(indicator));
}

/**
 * Check if a phrase likely indicates a navigation
 * @param phrase - Natural language phrase
 * @returns true if the phrase indicates navigation
 */
export function isNavigationPhrase(phrase: string): boolean {
  const normalized = phrase.toLowerCase().trim();
  const navigationIndicators = [
    'navigate', 'go to', 'open', 'visit', 'browse', 
    'load', 'access', 'url', 'page', 'website'
  ];
  
  return navigationIndicators.some(indicator => normalized.includes(indicator));
}

/**
 * Check if a phrase likely indicates a wait/delay
 * @param phrase - Natural language phrase
 * @returns true if the phrase indicates waiting
 */
export function isWaitPhrase(phrase: string): boolean {
  const normalized = phrase.toLowerCase().trim();
  const waitIndicators = [
    'wait', 'pause', 'delay', 'until', 'appear', 'disappear',
    'loading', 'loaded', 'ready'
  ];
  
  return waitIndicators.some(indicator => normalized.includes(indicator));
}
