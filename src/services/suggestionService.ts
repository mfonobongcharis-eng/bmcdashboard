// BMC Command Center - KPI Suggestion Service
// Uses Claude Haiku 4.5 API with fallback to rule-based matching

import Anthropic from '@anthropic-ai/sdk';
import type { KPI, Project, Touchpoint, KPISuggestion, Lane } from '../types';
import { supabase } from './authService';

const anthropic = new Anthropic({
  apiKey: import.meta.env.REACT_APP_ANTHROPIC_API_KEY || '',
});

// ============================================================================
// CLAUDE API KPI SUGGESTION (Layer 1: Primary)
// ============================================================================

export const suggestKPIsWithClaude = async (
  taskTitle: string,
  taskDescription: string | undefined,
  project: Project | undefined,
  touchpointId: string | undefined,
  lane: Lane,
  kpiDefinitions: KPI[]
): Promise<KPISuggestion[]> => {
  try {
    // Build touchpoint name for context
    let touchpointName = '';
    if (touchpointId) {
      const { data } = await supabase
        .from('touchpoints')
        .select('name')
        .eq('id', touchpointId)
        .single();
      touchpointName = data?.name || '';
    }

    // Build the prompt for Claude
    const prompt = `You are a KPI matching system for a marketing command center. Your task is to identify which KPIs a given task will most likely impact.

Task Details:
- Title: "${taskTitle}"
- Description: "${taskDescription || '(no description)'}"
- Project: "${project?.name || '(no project)'}"
- Touchpoint: "${touchpointName || '(no touchpoint)'}"
- Lane/Product: "${lane}"

Available KPIs:
${kpiDefinitions.map((k) => `- ${k.name}: ${k.description || 'N/A'} (Category: ${k.category})`).join('\n')}

Based on the task context, identify 2-4 KPIs this task most likely contributes to.
Return ONLY a comma-separated list of KPI names, in order of confidence (highest first).
Example: "Reach, Engagement, Product Support"
Do not include explanations, asterisks, or any other text.`;

    // Call Claude API (with 2-second timeout)
    const timeoutPromise = new Promise<KPISuggestion[]>((_, reject) =>
      setTimeout(() => reject(new Error('Claude API timeout')), 2000)
    );

    const claudePromise = (async () => {
      const message = await anthropic.completions.create({
        model: 'claude-instant-1',
        max_tokens_to_sample: 150,
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      });

      const responseText = message.completion || '';

      // Parse Claude's response
      const suggestedNames = responseText
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n.length > 0);

      // Map names back to KPI objects with confidence scores
      const suggestions = suggestedNames
        .map((name: string, index: number) => {
          const kpi = kpiDefinitions.find(
            (k) => k.name.toLowerCase() === name.toLowerCase()
          );
          if (!kpi) return null;

          return {
            kpiId: kpi.id,
            name: kpi.name,
            confidence: Math.max(95 - index * 5, 70), // Descending confidence
            reason: `Matched by Claude semantic analysis`,
          } as KPISuggestion;
        })
        .filter((s): s is KPISuggestion => s !== null);

      return suggestions.length > 0 ? suggestions : [];
    })();

    return Promise.race([claudePromise, timeoutPromise]).catch(() => {
      // If Claude fails or times out, fall back to rule-based
      console.warn('Claude API failed, falling back to rule-based suggestions');
      return suggestKPIsWithRules(taskTitle, taskDescription, project, lane, kpiDefinitions);
    });
  } catch (error) {
    console.error('Error in Claude KPI suggestion:', error);
    // Fall back to rule-based matching
    return suggestKPIsWithRules(
      taskTitle,
      taskDescription,
      project,
      lane,
      kpiDefinitions
    );
  }
};

// ============================================================================
// RULE-BASED KPI SUGGESTION (Layer 2: Fallback - Zero Cost)
// ============================================================================

const categoryKeywords: Record<string, string[]> = {
  'Reach': [
    'instagram',
    'linkedin',
    'facebook',
    'tiktok',
    'post',
    'social',
    'publish',
    'content',
    'blog',
    'article',
  ],
  'Engagement': [
    'carousel',
    'video',
    'reel',
    'interactive',
    'engagement',
    'click',
    'share',
    'like',
    'comment',
  ],
  'Email Open Rate': [
    'email',
    'newsletter',
    'send',
    'campaign',
    'mailchimp',
    'mailgun',
    'sendgrid',
  ],
  'Lead Generation': [
    'lead',
    'merchant',
    'activation',
    'conversion',
    'form',
    'signup',
    'webinar',
    'contact',
  ],
  'Brand Awareness': [
    'brand',
    'thought leadership',
    'awareness',
    'blog',
    'article',
    'press',
    'media',
  ],
  'Product Support': ['product', 'feature', 'support', 'help', 'guide'],
};

export const suggestKPIsWithRules = (
  taskTitle: string,
  taskDescription: string | undefined,
  project: Project | undefined,
  lane: Lane,
  kpiDefinitions: KPI[]
): KPISuggestion[] => {
  const text = `${taskTitle} ${taskDescription || ''} ${project?.name || ''} ${lane}`
    .toLowerCase();

  const matches: { name: string; score: number }[] = [];

  // Keyword-based matching
  for (const [kpiName, keywords] of Object.entries(categoryKeywords)) {
    const matchCount = keywords.filter((k) => text.includes(k)).length;
    if (matchCount > 0) {
      matches.push({ name: kpiName, score: matchCount });
    }
  }

  // Lane-specific matching
  if (lane === 'medusa') {
    if (!matches.find((m) => m.name === 'Product Support')) {
      matches.push({ name: 'Product Support', score: 1 });
    }
  }

  // Sort by score (descending) and limit to 4
  const topMatches = matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Map to KPI suggestions
  return topMatches
    .map((match) => {
      const kpi = kpiDefinitions.find(
        (k) => k.name.toLowerCase() === match.name.toLowerCase()
      );
      if (!kpi) return null;

      return {
        kpiId: kpi.id,
        name: kpi.name,
        confidence: Math.max(80 - matches.indexOf(match) * 10, 50),
        reason: 'Matched by rule-based keyword analysis (fallback)',
      } as KPISuggestion;
    })
    .filter((s): s is KPISuggestion => s !== null);
};

// ============================================================================
// PROJECT SUGGESTION (Non-AI, Keyword Matching)
// ============================================================================

export const suggestProject = async (
  taskTitle: string,
  taskDescription: string | undefined
): Promise<{ projectId: string; name: string; confidence: number } | null> => {
  // Fetch all projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('is_archived', false);

  if (error || !projects) return null;

  // Extract keywords from task
  const taskText = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
  const taskWords = taskText.split(/\s+/);

  // Score each project
  const scored = projects
    .map((project) => {
      const projectWords = project.name.toLowerCase().split(/\s+/);
      const matches = projectWords.filter((w: string) => taskText.includes(w)).length;
      const similarity = matches / projectWords.length;

      return {
        ...project,
        confidence: Math.round(similarity * 100),
      };
    })
    .filter((p) => p.confidence > 70)
    .sort((a, b) => b.confidence - a.confidence);

  if (scored.length === 0) return null;

  const topMatch = scored[0];
  return {
    projectId: topMatch.id,
    name: topMatch.name,
    confidence: topMatch.confidence,
  };
};

// ============================================================================
// EXPORTED SERVICE OBJECT
// ============================================================================

export const suggestionService = {
  suggestKPIs: suggestKPIsWithClaude,
  suggestProject,
};
