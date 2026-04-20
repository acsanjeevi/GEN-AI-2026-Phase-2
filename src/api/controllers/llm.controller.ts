/**
 * LLM Controller
 * Thin controller for LLM-related API endpoints
 * 
 * Following clean architecture: controllers only handle HTTP concerns,
 * all business logic is delegated to use cases
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

import { LlmClientFactory, LlmClientConfig } from '../../infrastructure/llm/LlmClientFactory';
import { ILlmClient, LlmProvider } from '../../infrastructure/llm/LlmClient.interface';
import { ValidationError } from '../../core/errors';
import { getConfig } from '../../core/config';

// Use cases
import {
  suggestLocator,
  SuggestLocatorInput,
  generateStepCode,
  GenerateStepCodeInput,
  generateFullSpec,
  GenerateFullSpecInput,
  healStep,
  HealStepInput,
} from '../../application/llm';

// DTOs
import {
  SuggestLocatorRequestDto,
  SuggestLocatorResponseDto,
  GenerateStepCodeRequestDto,
  GenerateStepCodeResponseDto,
  GenerateFullSpecRequestDto,
  GenerateFullSpecResponseDto,
  HealStepRequestDto,
  HealStepResponseDto,
} from '../dto/llm.dto';

/**
 * Get or create LLM client from configuration
 */
function getLlmClient(): ILlmClient | null {
  try {
    // Try to get configured LLM provider
    const appConfig = getConfig();
    const llmConfig = appConfig.llm;
    
    if (!llmConfig?.provider || !llmConfig?.apiKey) {
      return null;
    }

    const clientConfig: LlmClientConfig = {
      provider: llmConfig.provider as LlmProvider,
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      baseUrl: llmConfig.baseUrl,
      apiVersion: llmConfig.apiVersion,
      deploymentName: llmConfig.deploymentName,
      defaultMaxTokens: llmConfig.maxTokens,
      defaultTemperature: llmConfig.temperature,
    };

    return LlmClientFactory.create(clientConfig);
  } catch {
    return null;
  }
}

/**
 * Validate request and throw if errors
 */
function validateRequest(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed',
      errors.array().map(err => ({
        field: 'field' in err ? String(err.field) : 'unknown',
        message: String(err.msg),
      }))
    );
  }
}

/**
 * POST /llm/suggest-locator
 * Suggest element locators using LLM analysis of DOM snapshot
 */
export async function suggestLocatorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const body = req.body as SuggestLocatorRequestDto;
    const llmClient = getLlmClient();

    if (!llmClient) {
      res.status(503).json({
        success: false,
        error: 'LLM service not configured. Please set LLM_PROVIDER and LLM_API_KEY environment variables.',
      });
      return;
    }

    const input: SuggestLocatorInput = {
      elementDescription: body.elementDescription,
      domSnapshot: body.domSnapshot,
      pageUrl: body.pageUrl,
      pageTitle: body.pageTitle,
      preferredStrategies: body.preferredStrategies,
      additionalContext: body.additionalContext,
      maxSuggestions: body.maxSuggestions,
    };

    const result = await suggestLocator(llmClient, input);

    const response: SuggestLocatorResponseDto = {
      suggestions: result.suggestions.map(s => ({
        strategy: s.strategy,
        value: s.value,
        confidence: s.confidence,
        reasoning: s.reasoning,
        alternatives: s.alternatives,
      })),
      elementDescription: result.elementDescription,
      elementFound: result.elementFound,
      notes: result.notes,
      tokenUsage: result.tokenUsage,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /llm/generate-step-code
 * Generate Playwright code for a single step
 */
export async function generateStepCodeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const body = req.body as GenerateStepCodeRequestDto;
    const llmClient = getLlmClient();

    if (!llmClient) {
      res.status(503).json({
        success: false,
        error: 'LLM service not configured. Please set LLM_PROVIDER and LLM_API_KEY environment variables.',
      });
      return;
    }

    const input: GenerateStepCodeInput = {
      keyword: body.keyword,
      stepText: body.stepText,
      actionType: body.actionType,
      locator: body.locator,
      actionValue: body.actionValue,
      actionOptions: body.actionOptions,
      includeComments: body.includeComments,
      codeStyle: body.codeStyle,
    };

    const result = await generateStepCode(llmClient, input);

    const response: GenerateStepCodeResponseDto = {
      code: result.code,
      imports: result.imports,
      stepText: result.stepText,
      explanation: result.explanation,
      tokenUsage: result.tokenUsage,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /llm/generate-full-spec
 * Generate a complete Playwright test spec from feature scenarios
 */
export async function generateFullSpecHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const body = req.body as GenerateFullSpecRequestDto;
    const llmClient = getLlmClient();

    // Full spec generation can work without LLM (template mode)
    const input: GenerateFullSpecInput = {
      featureName: body.featureName,
      featureDescription: body.featureDescription,
      scenarios: body.scenarios,
      baseUrl: body.baseUrl,
      useFixtures: body.useFixtures,
      testTimeout: body.testTimeout,
      screenshotOnFailure: body.screenshotOnFailure,
      format: body.format,
    };

    const result = await generateFullSpec(llmClient, input);

    const response: GenerateFullSpecResponseDto = {
      specContent: result.specContent,
      suggestedFilename: result.suggestedFilename,
      featureName: result.featureName,
      testCount: result.testCount,
      dependencies: result.dependencies,
      tokenUsage: result.tokenUsage,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /llm/heal-step
 * Heal a broken step by analyzing DOM changes
 */
export async function healStepHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const body = req.body as HealStepRequestDto;
    const llmClient = getLlmClient();

    // Heal step can work without LLM (fallback mode)
    const input: HealStepInput = {
      stepText: body.stepText,
      originalLocator: body.originalLocator,
      errorMessage: body.errorMessage,
      currentDomSnapshot: body.currentDomSnapshot,
      previousDomSnapshot: body.previousDomSnapshot,
      pageUrl: body.pageUrl,
      elementDescription: body.elementDescription,
      healingAttempt: body.healingAttempt,
      maxSuggestions: body.maxSuggestions,
    };

    const result = await healStep(llmClient, input);

    const response: HealStepResponseDto = {
      healed: result.healed,
      suggestions: result.suggestions.map(s => ({
        locator: s.locator,
        confidence: s.confidence,
        explanation: s.explanation,
        changeType: s.changeType,
        preventionTip: s.preventionTip,
      })),
      analysis: result.analysis,
      elementExists: result.elementExists,
      recommendation: result.recommendation,
      tokenUsage: result.tokenUsage,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /llm/status
 * Check LLM service status and configuration
 */
export async function getLlmStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const llmClient = getLlmClient();
    const appConfig = getConfig();
    const llmConfig = appConfig.llm;

    res.status(200).json({
      success: true,
      data: {
        configured: !!llmClient,
        provider: llmConfig?.provider || null,
        model: llmConfig?.model || null,
        isReady: llmClient?.isConfigured() ?? false,
        capabilities: {
          suggestLocator: !!llmClient,
          generateStepCode: !!llmClient,
          generateFullSpec: true, // Works without LLM
          healStep: true, // Works without LLM (fallback mode)
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
