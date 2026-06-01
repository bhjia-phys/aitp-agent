import type { ContentPart, TokenUsage } from '@moonshot-ai/kosong';

import type { LoopRecordedEvent } from '../../loop';
import type { ToolStoreUpdate } from '../../tools/store';
import type { CompactionBeginData, CompactionResult } from '../compaction';
import type { AgentConfigUpdateData } from '../config';
import type { ContextMessage, PromptOrigin } from '../context';
import type { PermissionApprovalResultRecord, PermissionMode } from '../permission';
import type { UserToolRegistration } from '../tool';
import type { UsageRecordScope } from '../usage';
import type {
  PhysicsCapsuleKind,
  PhysicsDomainId,
  PhysicsMemoryRoot,
} from '../../physics-memory';
import type { PhysicsMemoryRecordSource } from '../physics-memory';

export interface AgentRecordEvents {
  metadata: {
    protocol_version: string;
    created_at: number;
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

  'background.stop': {
    taskId: string;
  };

  'usage.record': {
    model: string;
    usage: TokenUsage;
    usageScope?: UsageRecordScope | undefined;
  };

  'full_compaction.cancel': {};
  'full_compaction.complete': {};

  'context.append_message': { message: ContextMessage };
  'context.append_loop_event': { event: LoopRecordedEvent };
  'context.clear': {};
  'context.apply_compaction': CompactionResult;

  'tools.update_store': ToolStoreUpdate;

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
