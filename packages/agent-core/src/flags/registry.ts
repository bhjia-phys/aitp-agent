import type { FlagDefinitionInput } from './types';

/**
 * Experimental feature flags. Empty by default — there are no experimental features yet.
 *
 * To add one, append an entry and gate the feature with `flags.enabled('my-feature')`:
 *   { id: 'my-feature', env: 'KIMI_CODE_EXPERIMENTAL_MY_FEATURE', default: false, surface: 'both' }
 *
 * Keep the `as const satisfies` — it derives the literal `FlagId` union that gives `enabled()`
 * autocomplete and typo-checking. `env` must start with 'KIMI_CODE_EXPERIMENTAL_', be unique, and
 * not equal the master switch 'KIMI_CODE_EXPERIMENTAL_FLAG'; `id` must not be 'flag'.
 */
export const FLAG_DEFINITIONS = [
  {
    id: 'physics-memory',
    env: 'KIMI_CODE_EXPERIMENTAL_PHYSICS_MEMORY',
    default: false,
    surface: 'core',
  },
  {
    id: 'research-ledger',
    env: 'KIMI_CODE_EXPERIMENTAL_RESEARCH_LEDGER',
    default: false,
    surface: 'core',
  },
  {
    id: 'research-action',
    env: 'KIMI_CODE_EXPERIMENTAL_RESEARCH_ACTION',
    default: false,
    surface: 'core',
  },
  {
    id: 'domain-profile',
    env: 'KIMI_CODE_EXPERIMENTAL_DOMAIN_PROFILE',
    default: false,
    surface: 'core',
  },
  {
    id: 'workflow-recipe',
    env: 'KIMI_CODE_EXPERIMENTAL_WORKFLOW_RECIPE',
    default: false,
    surface: 'core',
  },
  {
    id: 'research-harness',
    env: 'KIMI_CODE_EXPERIMENTAL_RESEARCH_HARNESS',
    default: false,
    surface: 'core',
  },
  {
    id: 'goal-command',
    env: 'KIMI_CODE_EXPERIMENTAL_GOAL_COMMAND',
    default: false,
    surface: 'both',
  },
  {
    id: 'micro-compaction',
    env: 'KIMI_CODE_EXPERIMENTAL_MICRO_COMPACTION',
    default: false,
    surface: 'core',
  },
  {
    id: 'background-ask',
    env: 'KIMI_CODE_EXPERIMENTAL_BACKGROUND_ASK',
    default: false,
    surface: 'core',
  },
] as const satisfies readonly FlagDefinitionInput[];

/** Literal union of registered flag ids. */
export type FlagId = (typeof FLAG_DEFINITIONS)[number]['id'];
