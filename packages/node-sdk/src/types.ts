import type {
  AutoresearchEventStatus,
  AutoresearchEventType,
  AutoresearchPhase,
  AutoresearchStatus,
  AutoresearchTerminalAnswerState,
  ExportSessionManifest,
  ResumeSessionResult,
  ShellEnvironment,
  TelemetryClient,
  TelemetryContextPatch,
  TelemetryProperties,
} from '@moonshot-ai/agent-core';
import type { Kaos } from '@moonshot-ai/kaos';
import type { KimiHostIdentity, OAuthRefreshOutcome } from '@moonshot-ai/kimi-code-oauth';
import type { ContentPart } from '@moonshot-ai/kosong';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type Unsubscribe = () => void;

export type {
  AgentReplayRecord,
  AutoresearchEventStatus,
  AutoresearchEventType,
  AutoresearchPhase,
  AutoresearchSnapshot,
  AutoresearchStatus,
  AutoresearchTerminalAnswerState,
  AutoresearchToolResult,
  AgentBackgroundTaskInfo,
  BackgroundConfig,
  BackgroundTaskInfo,
  BackgroundTaskStatus,
  ConfigDiagnostics,
  ContextMessage,
  ExperimentalFeatureState,
  ExperimentalFlagMap,
  ExperimentalFlagSource,
  ExportSessionManifest,
  GoalBudgetLimits,
  GoalBudgetReport,
  GoalChange,
  GoalChangeStats,
  GoalSnapshot,
  GoalStatus,
  GoalToolResult,
  KimiConfig,
  KimiConfigPatch,
  LoopControl,
  McpServerInfo,
  McpStartupMetrics,
  ModelAlias,
  MoonshotServiceConfig,
  OAuthRef,
  PluginGithubMetadata,
  PluginGithubRef,
  PluginInfo,
  PluginMcpServerInfo,
  PluginSource,
  PluginSummary,
  ProcessBackgroundTaskInfo,
  PromptOrigin,
  ProviderConfig,
  ProviderType,
  QuestionBackgroundTaskInfo,
  ReloadSummary,
  ResumedAgentState,
  ServicesConfig,
  ShellEnvironment,
  SkillSummary,
  ThinkingConfig,
  ToolInfo,
} from '@moonshot-ai/agent-core';

export type { KimiHostIdentity, OAuthRefreshOutcome };
export type { TelemetryClient, TelemetryContextPatch, TelemetryProperties };
export type { ContentPart, Role, ToolCall } from '@moonshot-ai/kosong';

export type PermissionMode = 'yolo' | 'manual' | 'auto';

export interface CreateGoalInput {
  readonly objective: string;
  readonly replace?: boolean;
}

export interface StartAutoresearchInput {
  readonly topicId: string;
  readonly objective: string;
  readonly researchQuestion: string;
  readonly operator?: string | undefined;
  readonly title?: string | undefined;
  readonly claimId?: string | undefined;
  readonly aitpSessionId?: string | undefined;
  readonly hypothesis?: string | undefined;
  readonly phase?: AutoresearchPhase | undefined;
  readonly replace?: boolean | undefined;
}

export interface UpdateAutoresearchInput {
  readonly status?: AutoresearchStatus | undefined;
  readonly phase?: AutoresearchPhase | undefined;
  readonly terminalAnswerState?: AutoresearchTerminalAnswerState | undefined;
  readonly stopReason?: string | undefined;
  readonly operator?: string | undefined;
  readonly aitpSliceRefs?: readonly string[] | undefined;
  readonly actionRefs?: readonly string[] | undefined;
  readonly evidenceRefs?: readonly string[] | undefined;
  readonly validationRefs?: readonly string[] | undefined;
  readonly sourceRefs?: readonly string[] | undefined;
  readonly answerPacketRef?: string | undefined;
  readonly eventType?: AutoresearchEventType | undefined;
  readonly eventSummary?: string | undefined;
  readonly payload?: Readonly<Record<string, unknown>> | undefined;
}

export interface RecordAutoresearchEventInput {
  readonly eventType: AutoresearchEventType;
  readonly summary: string;
  readonly status?: AutoresearchEventStatus | undefined;
  readonly phase?: AutoresearchPhase | undefined;
  readonly operator?: string | undefined;
  readonly claimId?: string | undefined;
  readonly actionId?: string | undefined;
  readonly actionRef?: string | undefined;
  readonly sourceRefs?: readonly string[] | undefined;
  readonly evidenceRefs?: readonly string[] | undefined;
  readonly validationRefs?: readonly string[] | undefined;
  readonly artifactRefs?: readonly string[] | undefined;
  readonly payload?: Readonly<Record<string, unknown>> | undefined;
}

export interface AutoresearchLifecycleInput {
  readonly reason?: string | undefined;
  readonly operator?: string | undefined;
}

export type TextPromptPart = Extract<ContentPart, { type: 'text' }>;
export type PromptPart = Extract<ContentPart, { type: 'text' | 'image_url' | 'video_url' }>;

export type PromptInput = readonly PromptPart[];

export interface KimiHarnessOptions {
  readonly identity?: KimiHostIdentity | undefined;
  readonly homeDir?: string | undefined;
  readonly configPath?: string | undefined;
  readonly autoLoadConfig?: boolean | undefined;
  readonly uiMode?: string;
  readonly skillDirs?: readonly string[];
  readonly telemetry?: TelemetryClient | undefined;
  readonly onOAuthRefresh?: ((outcome: OAuthRefreshOutcome) => void) | undefined;
}

export interface CreateSessionOptions {
  readonly id?: string | undefined;
  readonly workDir: string;
  readonly model?: string | undefined;
  readonly thinking?: string | undefined;
  readonly permission?: PermissionMode | undefined;
  readonly planMode?: boolean;
  readonly metadata?: JsonObject | undefined;
  readonly kaos?: Kaos | undefined;
  readonly persistenceKaos?: Kaos | undefined;
}

export interface RenameSessionInput {
  readonly id: string;
  readonly title: string;
}

export interface ResumeSessionInput {
  readonly id: string;
  readonly kaos?: Kaos | undefined;
  readonly persistenceKaos?: Kaos | undefined;
}

export interface ForkSessionInput {
  readonly id: string;
  readonly forkId?: string;
  readonly title?: string;
  readonly metadata?: JsonObject;
}

export interface ExportSessionInput {
  readonly id: string;
  readonly outputPath?: string | undefined;
  readonly includeGlobalLog?: boolean | undefined;
  /** Host version to record in the export manifest. */
  readonly version: string;
  /** How the CLI was installed (e.g. 'npm-global', 'native'). */
  readonly installSource?: string | undefined;
  readonly shellEnv?: ShellEnvironment | undefined;
}

export interface ExportSessionResult {
  readonly zipPath: string;
  readonly entries: readonly string[];
  readonly sessionDir: string;
  readonly manifest: ExportSessionManifest;
}

export interface ListSessionsOptions {
  readonly workDir?: string;
  readonly sessionId?: string;
}

export interface GetConfigOptions {
  readonly reload?: boolean | undefined;
}

export interface CompactOptions {
  readonly instruction?: string | undefined;
}

export interface PlanInfo {
  readonly id: string;
  readonly content: string;
  readonly path: string;
}

export type SessionPlan = PlanInfo | null;

export interface TokenUsage {
  readonly inputOther: number;
  readonly output: number;
  readonly inputCacheRead: number;
  readonly inputCacheCreation: number;
}

export interface SessionUsage {
  readonly byModel?: Record<string, TokenUsage> | undefined;
  readonly currentTurn?: TokenUsage | undefined;
  readonly total?: TokenUsage | undefined;
}

export interface SessionStatus {
  readonly model?: string;
  readonly thinkingLevel: string;
  readonly permission: PermissionMode;
  readonly planMode: boolean;
  readonly swarmMode?: boolean | undefined;
  readonly contextTokens: number;
  readonly maxContextTokens: number;
  readonly contextUsage: number;
  readonly usage?: SessionUsage;
}

export interface SessionSummary {
  readonly id: string;
  readonly title?: string | undefined;
  readonly lastPrompt?: string;
  readonly workDir: string;
  readonly sessionDir: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly archived?: boolean | undefined;
  readonly metadata?: JsonObject | undefined;
}

export type ResumedSessionState = Pick<ResumeSessionResult, 'sessionMetadata' | 'agents' | 'warning'>;

export interface ResumedSessionSummary extends SessionSummary, ResumedSessionState { }
