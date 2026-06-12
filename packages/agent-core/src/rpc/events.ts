export { MCP_OAUTH_AUTHORIZATION_URL_TOOL_UPDATE } from '@moonshot-ai/protocol';

export type {
  AgentStatusUpdatedEvent,
  AssistantDeltaEvent,
  BackgroundTaskStartedEvent,
  BackgroundTaskTerminatedEvent,
  CompactionBlockedEvent,
  CompactionCancelledEvent,
  CompactionCompletedEvent,
  CompactionResult,
  CompactionStartedEvent,
  CronFiredEvent,
  ErrorEvent,
  GoalUpdatedEvent,
  HookResultEvent,
  McpOAuthAuthorizationUrlUpdateData,
  McpServerStatusEvent,
  McpServerStatusPayload,
  SessionMetaUpdatedEvent,
  SkillActivatedEvent,
  SubagentCompletedEvent,
  SubagentFailedEvent,
  SubagentSpawnedEvent,
  SubagentStartedEvent,
  SubagentSuspendedEvent,
  ThinkingDeltaEvent,
  ToolCallDeltaEvent,
  ToolCallStartedEvent,
  ToolInputDisplay,
  ToolListUpdatedEvent,
  ToolListUpdatedReason,
  ToolProgressEvent,
  ToolResultEvent,
  ToolUpdate,
  TurnEndedEvent,
  TurnEndReason,
  TurnStartedEvent,
  TurnStepCompletedEvent,
  TurnStepInterruptedEvent,
  TurnStepRetryingEvent,
  TurnStepStartedEvent,
  UsageStatus,
  WarningEvent,
} from '@moonshot-ai/protocol';

export type { KimiErrorPayload } from '../errors';
export type { AutoresearchSnapshot } from '../agent/autoresearch';

import type { AgentEvent as ProtocolAgentEvent, Event as ProtocolEvent } from '@moonshot-ai/protocol';
import type { AutoresearchSnapshot } from '../agent/autoresearch';

export interface AutoresearchUpdatedEvent {
  readonly type: 'autoresearch.updated';
  /** Current AITP-backed autoresearch snapshot, or `null` when cleared. */
  readonly snapshot: AutoresearchSnapshot | null;
}

export type AgentEvent = ProtocolAgentEvent | AutoresearchUpdatedEvent;
export type Event = ProtocolEvent | (AutoresearchUpdatedEvent & { agentId: string; sessionId: string });
