import type { ContentPart, TokenUsage } from '@moonshot-ai/kosong';

import type { LoopRecordedEvent } from '../../loop';
import type { ToolStoreUpdate } from '../../tools/store';
import type { CompactionBeginData, CompactionResult } from '../compaction';
import type { AgentConfigUpdateData } from '../config';
import type { ContextMessage, PromptOrigin } from '../context';
import type { PermissionApprovalResultRecord, PermissionMode } from '../permission';
import type { RuntimeToolExposure, UserToolRegistration } from '../tool';
import type { UsageRecordScope } from '../usage';
import type {
  GraphRef,
  PhysicsCapsuleKind,
  PhysicsCapsuleId,
  PhysicsDomainId,
  PhysicsMemoryRoot,
} from '../../physics-memory';
import type { PhysicsMemoryRecordSource } from '../physics-memory';
import type { ResearchActionOutcome, ResearchActionSource, WorkFrame } from '../../research-action';
import type { ResearchContextPack, ResearchContextRecordSource } from '../../research-context';
import type {
  ResearchLedgerEventStatus,
  ResearchLedgerEventType,
  ResearchLedgerRoot,
  ResearchTopicId,
} from '../../research-ledger';
import type { ResearchLedgerRecordSource } from '../research-ledger';
import type {
  PrimitiveToolLifecycleRecordSource,
  PrimitiveToolLifecycleStatus,
  PrimitiveToolOutputKind,
} from '../tool-lifecycle';
import type { WorkFrameRecordSource } from '../workframe';

export interface AgentRecordEvents {
  metadata: {
    protocol_version: string;
    created_at: number;
    app_version?: string;
    resumed?: boolean;
  };

  'turn.prompt': {
    input: readonly ContentPart[];
    origin: PromptOrigin;
  };
  'turn.steer': {
    input: readonly ContentPart[];
    origin: PromptOrigin;
  };
  'turn.cancel': { turnId?: number };

  'config.update': AgentConfigUpdateData;

  'permission.set_mode': {
    mode: PermissionMode;
  };
  'permission.record_approval_result': PermissionApprovalResultRecord;

  'full_compaction.begin': CompactionBeginData;

  'plan_mode.enter': {
    id: string;
  };
  'plan_mode.cancel': {
    id?: string;
  };
  'plan_mode.exit': {
    id?: string;
  };

  'tools.register_user_tool': UserToolRegistration;
  'tools.unregister_user_tool': {
    name: string;
  };
  'tools.set_active_tools': {
    names: readonly string[];
  };
  'tools.runtime_exposure': {
    source: 'controller' | 'replay';
    exposure: RuntimeToolExposure | null;
  };

  'usage.record': {
    model: string;
    usage: TokenUsage;
    usageScope?: UsageRecordScope | undefined;
  };

  'full_compaction.cancel': {};
  'full_compaction.complete': {};
  'micro_compaction.apply': { cutoff: number };

  'context.append_message': { message: ContextMessage };
  'context.append_loop_event': { event: LoopRecordedEvent };
  'context.clear': {};
  'context.apply_compaction': CompactionResult;
  'context.undo': { count: number };

  'tools.update_store': ToolStoreUpdate;

  'tool_lifecycle.started': {
    source: PrimitiveToolLifecycleRecordSource;
    turnId: number;
    step: number;
    stepUuid: string;
    toolCallId: string;
    toolName: string;
    cwd: string;
    argsSummary: string;
    description?: string | undefined;
    workFrameId?: string | undefined;
    actionCallId?: string | undefined;
    startedAt: number;
  };
  'tool_lifecycle.completed': {
    source: PrimitiveToolLifecycleRecordSource;
    turnId: number;
    step?: number | undefined;
    stepUuid?: string | undefined;
    toolCallId: string;
    toolName: string;
    cwd?: string | undefined;
    status: PrimitiveToolLifecycleStatus;
    isError: boolean;
    outputKind: PrimitiveToolOutputKind;
    outputSummary: string;
    durationMs?: number | undefined;
    completedAt: number;
    workFrameId?: string | undefined;
    actionCallId?: string | undefined;
    artifactRefs: readonly string[];
  };

  'workframe.opened': {
    source: WorkFrameRecordSource;
    frame: WorkFrame;
    toolCallId?: string | undefined;
  };
  'workframe.switched': {
    source: WorkFrameRecordSource;
    frameId: string;
    toolCallId?: string | undefined;
  };
  'workframe.closed': {
    source: WorkFrameRecordSource;
    frameId: string;
    nextActiveFrameId?: string | undefined;
    toolCallId?: string | undefined;
  };
  'workframe.context_attached': {
    source: WorkFrameRecordSource;
    frameId: string;
    contextPackId: string;
    toolCallId?: string | undefined;
  };

  'physics_memory.roots_loaded': {
    roots: readonly PhysicsMemoryRoot[];
    source: PhysicsMemoryRecordSource;
    capsuleCount: number;
    domains: readonly PhysicsDomainId[];
    diagnostics: readonly {
      severity: 'info' | 'warning' | 'error';
      code: string;
      capsuleId?: string | undefined;
      path?: string | undefined;
      rootPath?: string | undefined;
    }[];
  };
  'physics_memory.capsule_loaded': {
    source: PhysicsMemoryRecordSource;
    capsuleId: string;
    domain: PhysicsDomainId;
    kind: PhysicsCapsuleKind;
    toolCallId?: string | undefined;
  };
  'physics_memory.context_compiled': {
    source: PhysicsMemoryRecordSource;
    domain: PhysicsDomainId;
    focus: readonly string[];
    capsuleIds: readonly string[];
    diagnostics: readonly {
      severity: 'info' | 'warning' | 'error';
      code: string;
      capsuleId?: string | undefined;
    }[];
    toolCallId?: string | undefined;
  };
  'physics_memory.capsules_promoted': {
    source: PhysicsMemoryRecordSource;
    packetId: string;
    candidateIds: readonly string[];
    capsuleIds: readonly string[];
    targetReliability: 'checked' | 'validated' | 'formalized';
    requiredHumanCheckpoint: boolean;
    toolCallId?: string | undefined;
  };

  'research_ledger.roots_loaded': {
    roots: readonly ResearchLedgerRoot[];
    source: ResearchLedgerRecordSource;
    eventCount: number;
    topics: readonly ResearchTopicId[];
    domains: readonly PhysicsDomainId[];
    diagnostics: readonly {
      severity: 'info' | 'warning' | 'error';
      code: string;
      eventId?: string | undefined;
      path?: string | undefined;
      rootPath?: string | undefined;
    }[];
  };
  'research_ledger.event_loaded': {
    source: ResearchLedgerRecordSource;
    eventId: string;
    topic: ResearchTopicId;
    domain: PhysicsDomainId;
    eventType: ResearchLedgerEventType;
    toolCallId?: string | undefined;
  };
  'research_ledger.event_written': {
    source: ResearchLedgerRecordSource;
    eventId: string;
    topic: ResearchTopicId;
    domain: PhysicsDomainId;
    eventType: ResearchLedgerEventType;
    status: ResearchLedgerEventStatus;
    path?: string | undefined;
    toolCallId?: string | undefined;
  };
  'research_ledger.auto_capture_skipped': {
    source: ResearchLedgerRecordSource;
    toolName: string;
    toolCallId: string;
    workFrameId?: string | undefined;
    actionCallId?: string | undefined;
    reason: string;
    diagnostics: readonly {
      severity: 'info' | 'warning' | 'error';
      code: string;
      message: string;
    }[];
  };
  'research_ledger.proposals_compiled': {
    source: ResearchLedgerRecordSource;
    topic?: ResearchTopicId | undefined;
    domain?: PhysicsDomainId | undefined;
    proposalIds: readonly string[];
    eventIds: readonly string[];
    diagnostics: readonly {
      severity: 'info' | 'warning' | 'error';
      code: string;
      eventId?: string | undefined;
      proposalId?: string | undefined;
    }[];
    toolCallId?: string | undefined;
  };

  'research_action.result_recorded': {
    source: ResearchActionSource;
    actionId: string;
    callId: string;
    outcome: ResearchActionOutcome;
    workFrameId?: string | undefined;
    graphRefs: readonly GraphRef[];
    capsuleRefs: readonly PhysicsCapsuleId[];
    ledgerEventIds: readonly string[];
    evidenceRefs: readonly string[];
    generatedObligationIds: readonly string[];
    primitiveToolCallIds: readonly string[];
    nextSuggestedActions: readonly string[];
    toolCallId?: string | undefined;
  };
  'research_action.call_started': {
    source: ResearchActionSource;
    actionId: string;
    callId: string;
    workFrameId?: string | undefined;
    input?: unknown;
    startedAt: number;
    toolCallId?: string | undefined;
  };
  'research_action.call_finished': {
    source: ResearchActionSource;
    actionId: string;
    callId: string;
    outcome: ResearchActionOutcome;
    workFrameId?: string | undefined;
    output?: unknown;
    ledgerEventIds: readonly string[];
    evidenceRefs: readonly string[];
    generatedObligationIds: readonly string[];
    primitiveToolCallIds: readonly string[];
    nextSuggestedActions: readonly string[];
    finishedAt: number;
    toolCallId?: string | undefined;
  };
  'research_action.raw_tool_escape': {
    reason: string;
    primitiveToolName: string;
    primitiveToolCallId?: string | undefined;
    followupActionId?: string | undefined;
    evidenceRefs: readonly string[];
  };

  'research_context.context_compiled': {
    source: ResearchContextRecordSource;
    pack: ResearchContextPack;
    workFrameId: string;
    contextPackId: string;
    domain: PhysicsDomainId;
    topic: ResearchTopicId;
    profileIds: readonly string[];
    workflowIds: readonly string[];
    capsuleIds: readonly string[];
    ledgerProposalIds: readonly string[];
    actionBindingIds: readonly string[];
    diagnostics: readonly {
      severity: 'info' | 'warning' | 'error';
      code: string;
      source: string;
      refId?: string | undefined;
    }[];
    toolCallId?: string | undefined;
  };
}

export type AgentRecord = {
  [K in keyof AgentRecordEvents]: Readonly<AgentRecordEvents[K]> & {
    readonly type: K;
    readonly time?: number;
  };
}[keyof AgentRecordEvents];

export type AgentRecordOf<K extends keyof AgentRecordEvents> = Extract<
  AgentRecord,
  { readonly type: K }
>;

export interface AgentRecordPersistence {
  read(): AsyncIterable<AgentRecord>;
  append(input: AgentRecord): void;
  rewrite(records: readonly AgentRecord[]): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}
