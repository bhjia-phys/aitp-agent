import { homedir } from 'node:os';
import { join } from 'pathe';
import type { Kaos } from '@moonshot-ai/kaos';

import { ErrorCodes, KimiError } from '#/errors';
import { getRootLogger, log } from '#/logging/logger';
import type { Logger, SessionLogHandle } from '#/logging/types';
import type { KimiConfig, SDKSessionRPC } from '#/rpc';
import { proxyWithExtraPayload } from '#/rpc/types';

import { Agent, type AgentOptions, type AgentType } from '../agent';
import { HookEngine, type HookDef } from './hooks';
import type { PermissionManagerOptions, PermissionRule } from '../agent/permission';
import {
  createDynamicAitpMcpFirstCuratedRagProvider,
  createDynamicAitpMcpFirstLiteratureComparisonDraftProvider,
  createDynamicAitpMcpFirstLiteratureSourceReviewHandoffProvider,
  createDynamicAitpMcpFirstProcessGraphSliceProvider,
  createDynamicAitpMcpFirstRecordRefLookupProvider,
  createDynamicAitpMcpFirstRuntimePayloadProfilesProvider,
  createDynamicAitpMcpFirstWriteBridgeExecutor,
  type AitpCuratedRagProvider,
  type AitpCommandRunner,
  type AitpLiteratureComparisonDraftProvider,
  type AitpLiteratureSourceReviewHandoffProvider,
  type AitpMcpWriteBridgeTransport,
  type AitpProcessGraphSliceProvider,
  type AitpRecordRefLookupProvider,
  type AitpRuntimePayloadProfilesProvider,
  type AitpWriteBridgeExecutor,
} from '../aitp';
import { parseBooleanEnv, resolveConfigValue, type BackgroundConfig } from '../config';
import {
  createDefaultBenchmarkAdapterRegistry,
  type BenchmarkAdapterRegistry,
} from '../benchmark-adapter';
import { DomainProfileRegistry, resolveDomainProfileRoots } from '../domain-profile';
import { makeErrorPayload } from '../errors';
import {
  McpConnectionManager,
  McpOAuthService,
  type McpServerEntry,
  type SessionMcpConfig,
} from '../mcp';
import { PhysicsMemoryRegistry, resolvePhysicsMemoryRoots } from '../physics-memory';
import { ResearchEvalCaseRegistry, resolveResearchEvalCaseRoots } from '../research-harness';
import { ResearchLedgerRegistry, resolveResearchLedgerRoots } from '../research-ledger';
import { WorkflowRecipeRegistry, resolveWorkflowRecipeRoots } from '../workflow-recipe';
import { registerBuiltinTheoreticalPhysicsDefaults } from '../research-defaults/theoretical-physics';
import type { EnabledPluginSessionStart } from '../plugin';
import {
  DEFAULT_AGENT_PROFILES,
  DEFAULT_INIT_PROMPT,
  loadAgentsMd,
  prepareSystemPromptContext,
  type ResolvedAgentProfile,
} from '../profile';
import type { ProviderManager } from './provider-manager';
import {
  registerBuiltinSkills,
  resolveSkillRoots,
  SkillRegistry,
  summarizeSkill,
  type SkillRoot,
  type SkillSummary,
} from '../skill';
import { noopTelemetryClient, type TelemetryClient } from '../telemetry';
import { SessionSubagentHost } from './subagent-host';
import type { ToolServices } from '../tools/support/services';
import { FlagResolver, type ExperimentalFlagResolver } from '../flags';

export interface SessionOptions {
  readonly kaos: Kaos;
  readonly persistenceKaos?: Kaos;
  readonly config?: KimiConfig;
  readonly id?: string | undefined;
  readonly homedir: string;
  readonly kimiHomeDir?: string;
  readonly rpc: SDKSessionRPC;
  readonly toolServices?: ToolServices;
  readonly initializeMainAgent?: boolean | undefined;
  readonly providerManager?: ProviderManager | undefined;
  readonly background?: BackgroundConfig | undefined;
  readonly hooks?: readonly HookDef[];
  readonly permissionRules?: readonly PermissionRule[];
  readonly skills?: SessionSkillConfig;
  readonly domainProfiles?: SessionDomainProfileConfig;
  readonly physicsMemory?: SessionPhysicsMemoryConfig;
  readonly researchLedger?: SessionResearchLedgerConfig;
  readonly researchHarness?: SessionResearchHarnessConfig;
  readonly workflowRecipes?: SessionWorkflowRecipeConfig;
  readonly benchmarkAdapters?: BenchmarkAdapterRegistry;
  readonly aitp?: SessionAitpBridgeConfig;
  readonly aitpProcessGraphProvider?: AitpProcessGraphSliceProvider | undefined;
  readonly aitpRuntimePayloadProfilesProvider?: AitpRuntimePayloadProfilesProvider | undefined;
  readonly aitpRecordRefLookupProvider?: AitpRecordRefLookupProvider | undefined;
  readonly aitpCuratedRagProvider?: AitpCuratedRagProvider | undefined;
  readonly aitpLiteratureComparisonDraftProvider?: AitpLiteratureComparisonDraftProvider | undefined;
  readonly aitpLiteratureSourceReviewHandoffProvider?: AitpLiteratureSourceReviewHandoffProvider | undefined;
  readonly aitpWriteBridge?: AitpWriteBridgeExecutor | undefined;
  readonly mcpConfig?: SessionMcpConfig;
  readonly telemetry?: TelemetryClient | undefined;
  readonly pluginSessionStarts?: readonly EnabledPluginSessionStart[];
  readonly appVersion?: string;
  readonly experimentalFlags?: ExperimentalFlagResolver;
}

export interface SessionSkillConfig {
  readonly userHomeDir?: string;
  /** Brand data dir (KIMI_CODE_HOME); user brand skills live under `<brandHomeDir>/skills`. */
  readonly brandHomeDir?: string;
  readonly explicitDirs?: readonly string[];
  readonly extraDirs?: readonly string[];
  readonly pluginSkillRoots?: readonly SkillRoot[];
  readonly mergeAllAvailableSkills?: boolean;
  readonly builtinDir?: string;
}

export interface SessionPhysicsMemoryConfig {
  readonly userHomeDir?: string;
  readonly explicitDirs?: readonly string[];
  readonly extraDirs?: readonly string[];
}

export interface SessionDomainProfileConfig {
  readonly userHomeDir?: string;
  readonly explicitDirs?: readonly string[];
  readonly extraDirs?: readonly string[];
}

export interface SessionResearchLedgerConfig {
  readonly userHomeDir?: string;
  readonly explicitDirs?: readonly string[];
  readonly extraDirs?: readonly string[];
}

export interface SessionResearchHarnessConfig {
  readonly userHomeDir?: string;
  readonly explicitDirs?: readonly string[];
  readonly extraDirs?: readonly string[];
}

export interface SessionWorkflowRecipeConfig {
  readonly userHomeDir?: string;
  readonly explicitDirs?: readonly string[];
  readonly extraDirs?: readonly string[];
}

export interface SessionAitpBridgeConfig {
  readonly enabled?: boolean | undefined;
  readonly command?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly graphSliceLimit?: number | undefined;
  readonly mcpServerName?: string | undefined;
  readonly fallbackOnMcpError?: boolean | undefined;
  readonly runner?: AitpCommandRunner | undefined;
}

export interface AgentMeta {
  readonly homedir: string;
  readonly type: AgentType;
  readonly parentAgentId: string | null;
  readonly swarmItem?: string;
}

interface ResumedAgent {
  readonly agent: Agent;
  readonly warning?: string;
}

type AgentEntry = Agent | Promise<ResumedAgent>;

export interface CreateAgentOptions {
  readonly profile?: ResolvedAgentProfile;
  readonly parentAgentId?: string;
  readonly swarmItem?: string;
  readonly persistMetadata?: boolean;
}

export interface SessionMeta {
  createdAt: string;
  updatedAt: string;
  title: string;
  isCustomTitle: boolean;
  lastPrompt?: string;
  forkedFrom?: string;
  agents: Record<string, AgentMeta>;
  custom: Record<string, any>;
}

const BACKGROUND_KEEP_ALIVE_ON_EXIT_ENV = 'KIMI_CODE_BACKGROUND_KEEP_ALIVE_ON_EXIT';

export class Session {
  readonly rpc: SDKSessionRPC;
  readonly telemetry: TelemetryClient;
  readonly skills: SkillRegistry;
  readonly domainProfiles: DomainProfileRegistry | null;
  readonly physicsMemory: PhysicsMemoryRegistry | null;
  readonly researchLedger: ResearchLedgerRegistry | null;
  readonly benchmarkAdapters: BenchmarkAdapterRegistry;
  readonly researchHarness: ResearchEvalCaseRegistry | null;
  readonly workflowRecipes: WorkflowRecipeRegistry | null;
  readonly agents: Map<string, AgentEntry> = new Map();
  readonly mcp: McpConnectionManager;
  readonly log: Logger;
  private readonly logHandle: SessionLogHandle | undefined;
  readonly hookEngine: HookEngine;
  readonly experimentalFlags: ExperimentalFlagResolver;
  private toolKaos: Kaos;
  private persistenceKaos: Kaos;
  private agentIdCounter = 0;
  private readonly skillsReady: Promise<void>;
  private readonly domainProfilesReady: Promise<void>;
  private readonly physicsMemoryReady: Promise<void>;
  private readonly researchLedgerReady: Promise<void>;
  private readonly researchHarnessReady: Promise<void>;
  private readonly workflowRecipesReady: Promise<void>;
  metadata: SessionMeta = {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: 'New Session',
    isCustomTitle: false,
    agents: {},
    custom: {},
  };
  private writeMetadataPromise = Promise.resolve();

  constructor(public readonly options: SessionOptions) {
    // Attach the per-session log sink up front so the constructor's
    // fire-and-forget `loadSkills` / `loadMcpServers` failures (and
    // anything else that races) land in the session log, not just global.
    this.logHandle =
      options.id === undefined
        ? undefined
        : getRootLogger().attachSession({
          sessionId: options.id,
          sessionDir: options.homedir,
        });
    this.log =
      this.logHandle?.logger ??
      (options.id === undefined ? log : log.createChild({ sessionId: options.id }));
    this.rpc = options.rpc;
    this.experimentalFlags = options.experimentalFlags ?? new FlagResolver();
    this.hookEngine = new HookEngine(options.hooks, {
      cwd: options.kaos.getcwd(),
      sessionId: options.id,
    });
    this.telemetry = options.telemetry ?? noopTelemetryClient;
    this.toolKaos = options.kaos;
    this.persistenceKaos = options.persistenceKaos ?? options.kaos;
    this.skills = new SkillRegistry({
      sessionId: options.id,
    });
    this.domainProfiles = this.experimentalFlags.enabled('domain-profile')
      ? new DomainProfileRegistry({
          onWarning: (message, cause) => {
            this.log.warn('domain profile load warning', { message, cause });
          },
        })
      : null;
    this.physicsMemory = this.experimentalFlags.enabled('physics-memory')
      ? new PhysicsMemoryRegistry({
          onWarning: (message, cause) => {
            this.log.warn('physics memory load warning', { message, cause });
          },
        })
      : null;
    this.researchLedger = this.experimentalFlags.enabled('research-ledger')
      ? new ResearchLedgerRegistry({
          onWarning: (message, cause) => {
            this.log.warn('research ledger load warning', { message, cause });
          },
        })
      : null;
    this.benchmarkAdapters =
      options.benchmarkAdapters ?? createDefaultBenchmarkAdapterRegistry();
    this.researchHarness = this.experimentalFlags.enabled('research-harness')
      ? new ResearchEvalCaseRegistry({
          onWarning: (message, cause) => {
            this.log.warn('research harness load warning', { message, cause });
          },
        })
      : null;
    this.workflowRecipes = this.experimentalFlags.enabled('workflow-recipe')
      ? new WorkflowRecipeRegistry({
          onWarning: (message, cause) => {
            this.log.warn('workflow recipe load warning', { message, cause });
          },
        })
      : null;
    this.mcp = new McpConnectionManager({
      oauthService: new McpOAuthService({ kimiHomeDir: options.kimiHomeDir }),
      log: this.log,
    });
    this.mcp.onStatusChange((entry) => {
      this.onMcpServerStatusChange(entry);
    });
    this.skillsReady = this.loadSkills()
      .catch((error: unknown) => {
        this.log.error('skills load failed', error);
      })
      .then(() => {
        this.refreshAgentBuiltinTools();
      });
    this.domainProfilesReady = this.loadDomainProfiles()
      .catch((error: unknown) => {
        this.log.error('domain profiles load failed', error);
      })
      .then(() => {
        this.refreshAgentBuiltinTools();
      });
    this.physicsMemoryReady = this.loadPhysicsMemory()
      .catch((error: unknown) => {
        this.log.error('physics memory load failed', error);
      })
      .then(() => {
        this.refreshAgentBuiltinTools();
      });
    this.researchLedgerReady = this.loadResearchLedger()
      .catch((error: unknown) => {
        this.log.error('research ledger load failed', error);
      })
      .then(() => {
        this.refreshAgentBuiltinTools();
      });
    this.researchHarnessReady = this.loadResearchHarness()
      .catch((error: unknown) => {
        this.log.error('research harness load failed', error);
      })
      .then(() => {
        this.refreshAgentBuiltinTools();
      });
    this.workflowRecipesReady = this.loadWorkflowRecipes()
      .catch((error: unknown) => {
        this.log.error('workflow recipes load failed', error);
      })
      .then(() => {
        this.refreshAgentBuiltinTools();
      });
    void this.loadMcpServers().catch((error: unknown) => {
      this.emitInitialMcpLoadError(error);
    });
  }


  setToolKaos(kaos: Kaos) {
    this.toolKaos = kaos;
    for (const agent of this.readyAgents()) {
      agent.setKaos(kaos.withCwd(agent.config.cwd));
    }
    this.refreshAgentBuiltinTools();
  }

  /**
   * Kaos used by session-internal bootstrap (AGENTS.md context, cwd listing)
   * and metadata persistence. Always backed by the persistence sink (typically
   * the local filesystem) so a transient ACP-side failure on system files like
   * `AGENTS.md` never blocks `bootstrapAgentProfile` — tool calls still route
   * through `agent.kaos` and continue to honor the ACP bridge.
   */
  systemContextKaos(cwd: string): Kaos {
    return this.persistenceKaos.withCwd(cwd);
  }

  async createMain() {
    const { agent } = await this.createAgent({ type: 'main' }, {
      profile: DEFAULT_AGENT_PROFILES['agent'],
    });
    await this.triggerSessionStart('startup');
    return agent;
  }

  async resume(): Promise<{ warning?: string }> {
    await this.skillsReady;
    await this.domainProfilesReady;
    await this.physicsMemoryReady;
    await this.researchLedgerReady;
    await this.researchHarnessReady;
    await this.workflowRecipesReady;
    const { agents } = await this.readMetadata();
    this.agents.clear();
    // Only the main agent is needed to reopen the session; subagents replay
    // lazily when an RPC or Agent(resume=...) call asks for their state.
    const { warning } =
      agents['main'] === undefined ? { warning: undefined } : await this.resumeAgent('main');
    // A session migrated from an external tool ships a wire without the
    // `config.update` bootstrap events a natively-created agent writes, so the
    // main agent comes back with an empty system prompt and no tools. Apply the
    // default profile so the resumed session is usable. Native sessions always
    // replay a non-empty system prompt and never enter this branch.
    const main = this.getReadyAgent('main');
    const profile = DEFAULT_AGENT_PROFILES['agent'];
    if (main !== undefined && profile !== undefined && main.config.systemPrompt === '') {
      await this.bootstrapAgentProfile(main, profile);
    }
    await this.triggerSessionStart('resume');
    return { warning };
  }

  async close(): Promise<void> {
    try {
      await Promise.allSettled(
        Array.from(this.readyAgents(), async (agent) => agent.cron?.stop()),
      );
      await this.stopBackgroundTasksOnExit();
      await this.flushMetadata();
      await this.triggerSessionEnd('exit');
    } finally {
      try {
        await this.mcp.shutdown();
      } finally {
        await this.logHandle?.close();
      }
    }
  }

  async closeForReload(): Promise<void> {
    try {
      await Promise.allSettled(
        Array.from(this.readyAgents(), async (agent) => agent.cron?.stop()),
      );
      await this.flushMetadata();
    } finally {
      try {
        await this.mcp.shutdown();
      } finally {
        await this.logHandle?.close();
      }
    }
  }

  private async stopBackgroundTasksOnExit(): Promise<void> {
    const keepAliveOnExit = resolveConfigValue({
      env: process.env,
      envKey: BACKGROUND_KEEP_ALIVE_ON_EXIT_ENV,
      configValue: this.options.background?.keepAliveOnExit,
      defaultValue: true,
      parseEnv: parseBooleanEnv,
    });
    if (keepAliveOnExit) return;
    await Promise.all(
      Array.from(this.readyAgents(), (agent) =>
        agent.background.stopAll('Session closed'),
      ),
    );
  }

  async createAgent(
    config: Partial<AgentOptions>,
    options: CreateAgentOptions = {},
  ): Promise<{ readonly id: string; readonly agent: Agent }> {
    await this.skillsReady;
    await this.domainProfilesReady;
    await this.physicsMemoryReady;
    await this.researchLedgerReady;
    await this.researchHarnessReady;
    await this.workflowRecipesReady;
    const type = config.type ?? 'main';
    const id = type === 'main' ? 'main' : this.nextGeneratedAgentId();
    const homedir = config.homedir ?? join(this.options.homedir, 'agents', id);
    const parentAgentId = options.parentAgentId ?? null;
    const agent = this.instantiateAgent(id, homedir, type, config, parentAgentId);
    if (options.profile) {
      await this.bootstrapAgentProfile(agent, options.profile);
    }
    agent.physicsMemory?.recordRootsLoaded('session-start');
    agent.researchLedger?.recordRootsLoaded('session-start');

    this.agents.set(id, agent);
    if (options.persistMetadata !== false) {
      this.metadata.agents[id] = {
        homedir,
        type,
        parentAgentId,
        swarmItem: options.swarmItem,
      };
      void this.writeMetadata();
    }

    return { id, agent };
  }

  async ensureAgentResumed(id: string): Promise<Agent> {
    const entry = this.agents.get(id);
    if (entry !== undefined) return (await this.resolveAgentEntry(entry)).agent;
    if (this.metadata.agents[id] === undefined) {
      throw new KimiError(ErrorCodes.AGENT_NOT_FOUND, `Agent "${id}" was not found`);
    }
    return (await this.resumeAgent(id)).agent;
  }

  /**
   * Applies a profile's derived config — cwd, system prompt, active tools — to
   * an agent. Fresh creation and resume-of-an-incomplete-wire both route
   * through here so the two paths cannot drift apart.
   */
  private async bootstrapAgentProfile(
    agent: Agent,
    profile: ResolvedAgentProfile,
  ): Promise<void> {
    const context = await prepareSystemPromptContext(
      this.systemContextKaos(agent.kaos.getcwd()),
      this.options.kimiHomeDir,
    );
    agent.useProfile(profile, context);
  }

  async generateAgentsMd(): Promise<void> {
    await this.skillsReady;
    const mainAgent = this.requireMainAgent();

    try {
      const handle = await mainAgent.subagentHost!.spawn({
        profileName: 'coder',
        parentToolCallId: 'generate-agents-md',
        prompt: DEFAULT_INIT_PROMPT,
        description: 'Initialize AGENTS.md',
        runInBackground: false,
        signal: new AbortController().signal,
      });
      await handle.completion;

      const agentsMd = await loadAgentsMd(mainAgent.kaos, this.options.kimiHomeDir);
      mainAgent.context.appendSystemReminder(initCompletionReminder(agentsMd), {
        kind: 'injection',
        variant: 'init',
      });
      await mainAgent.records.flush();
    } catch (error) {
      throw new KimiError(
        ErrorCodes.SESSION_INIT_FAILED,
        error instanceof Error ? error.message : 'Init failed',
        { cause: error },
      );
    }
  }

  get hasActiveTurn(): boolean {
    for (const agent of this.readyAgents()) {
      if (agent.turn.hasActiveTurn) return true;
    }
    return false;
  }

  protected get metadataPath() {
    return join(this.options.homedir, 'state.json');
  }

  writeMetadata() {
    const text = JSON.stringify(this.metadata, null, 2);
    const write = async () => {
      await this.persistenceKaos.mkdir(this.options.homedir, { parents: true, existOk: true });
      await this.persistenceKaos.writeText(this.metadataPath, text);
    };
    this.writeMetadataPromise = this.writeMetadataPromise.then(write, write);
    return this.writeMetadataPromise;
  }

  async readMetadata() {
    const text = await this.persistenceKaos.readText(this.metadataPath);
    this.metadata = JSON.parse(text);
    return this.metadata;
  }

  async flushMetadata() {
    await this.skillsReady;
    await this.writeMetadataPromise;
    await Promise.all(Array.from(this.readyAgents()).map((agent) => agent.records.flush()));
  }

  async listSkills(): Promise<readonly SkillSummary[]> {
    await this.skillsReady;
    return this.skills.listSkills().map(summarizeSkill);
  }

  private async loadSkills(): Promise<void> {
    const roots = await resolveSkillRoots({
      paths: {
        userHomeDir: this.options.skills?.userHomeDir ?? homedir(),
        brandHomeDir: this.options.skills?.brandHomeDir ?? this.options.kimiHomeDir,
        workDir: this.options.kaos.getcwd(),
      },
      explicitDirs: this.options.skills?.explicitDirs,
      extraDirs: this.options.skills?.extraDirs,
      pluginSkillRoots: this.options.skills?.pluginSkillRoots,
      mergeAllAvailableSkills: this.options.skills?.mergeAllAvailableSkills,
      builtinDir: this.options.skills?.builtinDir,
    });
    await this.skills.loadRoots(roots);
    registerBuiltinSkills(this.skills);
  }

  private async loadDomainProfiles(): Promise<void> {
    if (this.domainProfiles === null) return;
    const roots = await resolveDomainProfileRoots({
      paths: {
        userHomeDir:
          this.options.domainProfiles?.userHomeDir ??
          this.options.skills?.userHomeDir ??
          homedir(),
        workDir: this.options.kaos.getcwd(),
      },
      explicitDirs: this.options.domainProfiles?.explicitDirs,
      extraDirs: this.options.domainProfiles?.extraDirs,
    });
    await this.domainProfiles.loadRoots(roots);
    registerBuiltinTheoreticalPhysicsDefaults({ domainProfiles: this.domainProfiles });
  }

  private async loadPhysicsMemory(): Promise<void> {
    if (this.physicsMemory === null) return;
    const roots = await resolvePhysicsMemoryRoots({
      paths: {
        userHomeDir:
          this.options.physicsMemory?.userHomeDir ??
          this.options.skills?.userHomeDir ??
          homedir(),
        workDir: this.options.kaos.getcwd(),
      },
      explicitDirs: this.options.physicsMemory?.explicitDirs,
      extraDirs: this.options.physicsMemory?.extraDirs,
    });
    await this.physicsMemory.loadRoots(roots);
    registerBuiltinTheoreticalPhysicsDefaults({ physicsMemory: this.physicsMemory });
  }

  private async loadResearchLedger(): Promise<void> {
    if (this.researchLedger === null) return;
    const roots = await resolveResearchLedgerRoots({
      paths: {
        userHomeDir:
          this.options.researchLedger?.userHomeDir ??
          this.options.skills?.userHomeDir ??
          homedir(),
        workDir: this.options.kaos.getcwd(),
      },
      explicitDirs: this.options.researchLedger?.explicitDirs,
      extraDirs: this.options.researchLedger?.extraDirs,
    });
    await this.researchLedger.loadRoots(roots);
  }

  private async loadResearchHarness(): Promise<void> {
    if (this.researchHarness === null) return;
    const roots = await resolveResearchEvalCaseRoots({
      paths: {
        userHomeDir:
          this.options.researchHarness?.userHomeDir ??
          this.options.skills?.userHomeDir ??
          homedir(),
        workDir: this.options.kaos.getcwd(),
      },
      explicitDirs: this.options.researchHarness?.explicitDirs,
      extraDirs: this.options.researchHarness?.extraDirs,
    });
    await this.researchHarness.loadRoots(roots);
    registerBuiltinTheoreticalPhysicsDefaults({ researchHarness: this.researchHarness });
  }

  private async loadWorkflowRecipes(): Promise<void> {
    if (this.workflowRecipes === null) return;
    const roots = await resolveWorkflowRecipeRoots({
      paths: {
        userHomeDir:
          this.options.workflowRecipes?.userHomeDir ??
          this.options.skills?.userHomeDir ??
          homedir(),
        workDir: this.options.kaos.getcwd(),
      },
      explicitDirs: this.options.workflowRecipes?.explicitDirs,
      extraDirs: this.options.workflowRecipes?.extraDirs,
    });
    await this.workflowRecipes.loadRoots(roots);
    registerBuiltinTheoreticalPhysicsDefaults({ workflowRecipes: this.workflowRecipes });
  }

  private async loadMcpServers(): Promise<void> {
    const servers = this.options.mcpConfig?.servers;
    if (servers === undefined || Object.keys(servers).length === 0) return;
    await this.mcp.connectAll(servers);
    const entries = this.mcp.list().filter((entry) => entry.status !== 'disabled');
    const totalCount = entries.length;
    if (totalCount === 0) return;

    const connectedCount = entries.filter((entry) => entry.status === 'connected').length;
    if (connectedCount > 0) {
      this.telemetry.track('mcp_connected', {
        server_count: connectedCount,
        total_count: totalCount,
      });
    }

    const failedCount = entries.filter((entry) => entry.status === 'failed').length;
    if (failedCount > 0) {
      this.telemetry.track('mcp_failed', {
        failed_count: failedCount,
        total_count: totalCount,
      });
    }
  }

  private emitInitialMcpLoadError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.log.error('mcp initial load failed', error);
    void this.rpc.emitEvent({
      type: 'error',
      agentId: 'main',
      ...makeErrorPayload(ErrorCodes.MCP_STARTUP_FAILED, message),
    });
  }

  private onMcpServerStatusChange(entry: McpServerEntry): void {
    // Always surface server-level status changes to clients so the TUI/SDK
    // can keep its dashboard in sync, even before the main agent exists.
    void this.rpc.emitEvent({
      type: 'mcp.server.status',
      agentId: 'main',
      server: {
        name: entry.name,
        transport: entry.transport,
        status: entry.status,
        toolCount: entry.toolCount,
        error: entry.error,
      },
    });
  }

  private refreshAgentBuiltinTools(): void {
    for (const agent of this.readyAgents()) {
      if (!agent.config.hasProvider) continue;
      agent.tools.initializeBuiltinTools();
    }
  }

  private instantiateAgent(
    id: string,
    homedir: string,
    type: AgentType,
    config: Partial<AgentOptions> = {},
    parentAgentId: string | null = null,
  ): Agent {
    const parentAgent = parentAgentId !== null ? this.getReadyAgent(parentAgentId) : undefined;
    const cwd = parentAgent?.config.cwd ?? this.toolKaos.getcwd();
    let agent: Agent | undefined;
    const basePath = () => agent?.config.cwd ?? cwd;
    const aitpBridges = this.createAitpBridges(basePath);
    agent = new Agent({
      ...config,
      type,
      kaos: this.toolKaos.withCwd(cwd),
      toolServices: this.options.toolServices,
      config: this.options.config,
      homedir,
      skills: this.skills,
      domainProfiles: this.domainProfiles ?? undefined,
      physicsMemory: this.physicsMemory ?? undefined,
      researchLedger: this.researchLedger ?? undefined,
      benchmarkAdapters: this.benchmarkAdapters,
      researchHarness: this.researchHarness ?? undefined,
      workflowRecipes: this.workflowRecipes ?? undefined,
      aitpProcessGraphProvider:
        config.aitpProcessGraphProvider ??
        this.options.aitpProcessGraphProvider ??
        aitpBridges?.processGraphProvider,
      aitpRuntimePayloadProfilesProvider:
        config.aitpRuntimePayloadProfilesProvider ??
        this.options.aitpRuntimePayloadProfilesProvider ??
        aitpBridges?.runtimePayloadProfilesProvider,
      aitpRecordRefLookupProvider:
        config.aitpRecordRefLookupProvider ??
        this.options.aitpRecordRefLookupProvider ??
        aitpBridges?.recordRefLookupProvider,
      aitpCuratedRagProvider:
        config.aitpCuratedRagProvider ??
        this.options.aitpCuratedRagProvider ??
        aitpBridges?.curatedRagProvider,
      aitpLiteratureComparisonDraftProvider:
        config.aitpLiteratureComparisonDraftProvider ??
        this.options.aitpLiteratureComparisonDraftProvider ??
        aitpBridges?.literatureComparisonDraftProvider,
      aitpLiteratureSourceReviewHandoffProvider:
        config.aitpLiteratureSourceReviewHandoffProvider ??
        this.options.aitpLiteratureSourceReviewHandoffProvider ??
        aitpBridges?.literatureSourceReviewHandoffProvider,
      aitpWriteBridge:
        config.aitpWriteBridge ?? this.options.aitpWriteBridge ?? aitpBridges?.writeBridge,
      rpc: proxyWithExtraPayload(this.rpc, { agentId: id }),
      modelProvider: this.options.providerManager,
      hookEngine: config.hookEngine ?? this.hookEngine,
      subagentHost: config.subagentHost ?? new SessionSubagentHost(this, id),
      mcp: this.mcp,
      permission: this.permissionOptions(parentAgentId, config.permission),
      telemetry: this.telemetry,
      log: this.log.createChild({ agentId: id }),
      pluginSessionStarts: type === 'main' ? this.options.pluginSessionStarts : undefined,
      appVersion: this.options.appVersion,
      experimentalFlags: this.experimentalFlags,
    });
    return agent;
  }

  private createAitpBridges(basePath: () => string):
    | {
        readonly processGraphProvider: AitpProcessGraphSliceProvider;
        readonly runtimePayloadProfilesProvider: AitpRuntimePayloadProfilesProvider;
        readonly recordRefLookupProvider: AitpRecordRefLookupProvider;
        readonly curatedRagProvider: AitpCuratedRagProvider;
        readonly literatureComparisonDraftProvider: AitpLiteratureComparisonDraftProvider;
        readonly literatureSourceReviewHandoffProvider: AitpLiteratureSourceReviewHandoffProvider;
        readonly writeBridge: AitpWriteBridgeExecutor;
      }
    | undefined {
    const config = this.options.aitp;
    if (config?.enabled === false) return undefined;
    const bridgeOptions = {
      basePath,
      command: config?.command,
      timeoutMs: config?.timeoutMs,
      runner: config?.runner,
    };
    return {
      processGraphProvider: createDynamicAitpMcpFirstProcessGraphSliceProvider({
        ...bridgeOptions,
        limit: config?.graphSliceLimit,
        mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
        fallbackOnMcpError: config?.fallbackOnMcpError,
      }),
      runtimePayloadProfilesProvider: createDynamicAitpMcpFirstRuntimePayloadProfilesProvider({
        ...bridgeOptions,
        mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
        fallbackOnMcpError: config?.fallbackOnMcpError,
      }),
      recordRefLookupProvider: createDynamicAitpMcpFirstRecordRefLookupProvider({
        ...bridgeOptions,
        mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
        fallbackOnMcpError: config?.fallbackOnMcpError,
      }),
      curatedRagProvider: createDynamicAitpMcpFirstCuratedRagProvider({
        ...bridgeOptions,
        mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
        fallbackOnMcpError: config?.fallbackOnMcpError,
      }),
      literatureComparisonDraftProvider:
        createDynamicAitpMcpFirstLiteratureComparisonDraftProvider({
          ...bridgeOptions,
          mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
          fallbackOnMcpError: config?.fallbackOnMcpError,
        }),
      literatureSourceReviewHandoffProvider:
        createDynamicAitpMcpFirstLiteratureSourceReviewHandoffProvider({
          ...bridgeOptions,
          mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
          fallbackOnMcpError: config?.fallbackOnMcpError,
        }),
      writeBridge: createDynamicAitpMcpFirstWriteBridgeExecutor({
        ...bridgeOptions,
        mcpTransport: this.createAitpMcpTransport(config?.mcpServerName ?? 'aitp'),
        fallbackOnMcpError: config?.fallbackOnMcpError,
      }),
    };
  }

  private createAitpMcpTransport(serverName: string): AitpMcpWriteBridgeTransport {
    return {
      callTool: async ({ toolName, args, signal }) => {
        const resolved = this.mcp.resolved(serverName);
        if (resolved === undefined) {
          throw new Error(`AITP MCP server "${serverName}" is not connected.`);
        }
        if (!resolved.enabledNames.has(toolName)) {
          throw new Error(`AITP MCP server "${serverName}" does not expose tool "${toolName}".`);
        }
        return resolved.client.callTool(toolName, { ...args }, signal);
      },
    };
  }

  private permissionOptions(
    parentAgentId: string | null,
    input?: PermissionManagerOptions | undefined,
  ): PermissionManagerOptions {
    if (parentAgentId === null) {
      return {
        ...input,
        initialRules: input?.initialRules ?? this.options.permissionRules,
      };
    }
    return {
      ...input,
      parent: input?.parent ?? this.getReadyAgent(parentAgentId)?.permission,
    };
  }

  getReadyAgent(id: string): Agent | undefined {
    const entry = this.agents.get(id);
    return entry instanceof Agent ? entry : undefined;
  }

  *readyAgents(): Iterable<Agent> {
    for (const entry of this.agents.values()) {
      if (entry instanceof Agent) yield entry;
    }
  }

  private async resolveAgentEntry(entry: AgentEntry): Promise<ResumedAgent> {
    if (entry instanceof Agent) return { agent: entry };
    return entry;
  }

  private resumeAgent(
    id: string,
    stack: readonly string[] = [],
  ): Promise<ResumedAgent> {
    if (stack.includes(id)) {
      throw new KimiError(
        ErrorCodes.SESSION_STATE_INVALID,
        `Session agent parent chain contains a cycle: ${[...stack, id].join(' -> ')}`,
      );
    }

    const entry = this.agents.get(id);
    if (entry !== undefined) return this.resolveAgentEntry(entry);

    const promise = this.resumePersistedAgent(id, stack);
    this.agents.set(id, promise);
    return promise;
  }

  private async resumePersistedAgent(
    id: string,
    stack: readonly string[] = [],
  ): Promise<ResumedAgent> {
    await this.skillsReady;
    const meta = this.metadata.agents[id];
    if (meta === undefined) {
      throw new KimiError(ErrorCodes.SESSION_STATE_INVALID, `Session agent "${id}" is missing`);
    }

    const parentAgentId = meta.parentAgentId ?? null;
    const parent =
      parentAgentId === null
        ? undefined
        : await this.resumeAgent(parentAgentId, [...stack, id]);

    try {
      const agent = this.instantiateAgent(id, meta.homedir, meta.type, {}, parentAgentId);
      const result = await agent.resume();
      this.agents.set(id, agent);
      return { agent, warning: parent?.warning ?? result.warning };
    } catch (error) {
      const entry = this.agents.get(id);
      if (entry instanceof Promise) {
        this.agents.delete(id);
      }
      throw error;
    }
  }

  private nextGeneratedAgentId(): string {
    while (true) {
      const id = `agent-${this.agentIdCounter++}`;
      if (this.agents.has(id)) continue;
      if (this.metadata.agents[id] !== undefined) continue;
      return id;
    }
  }

  private requireMainAgent(): Agent {
    const agent = this.getReadyAgent('main');
    if (agent === undefined) {
      throw new KimiError(ErrorCodes.AGENT_NOT_FOUND, 'Main agent was not found');
    }
    return agent;
  }

  private async triggerSessionStart(source: 'startup' | 'resume'): Promise<void> {
    await this.hookEngine.trigger('SessionStart', {
      matcherValue: source,
      inputData: { source },
    });
  }

  private async triggerSessionEnd(reason: 'exit'): Promise<void> {
    await this.hookEngine.trigger('SessionEnd', {
      matcherValue: reason,
      inputData: { reason },
    });
  }
}

export * from './subagent-host';

function initCompletionReminder(agentsMd: string): string {
  const latest =
    agentsMd.trim().length === 0
      ? 'No AGENTS.md content was found after `/init` completed.'
      : agentsMd;
  return [
    'The user just ran `/init` slash command.',
    'The system has analyzed the codebase and generated an `AGENTS.md` file.',
    '',
    'Latest AGENTS.md file content:',
    latest,
  ].join('\n');
}
