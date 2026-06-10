import type { Agent } from '..';
import {
  AGENT_WIRE_PROTOCOL_VERSION,
  isNewerWireVersion,
  migrateWireRecord,
  resolveWireMigrations,
  type WireMigration,
  type WireMigrationRecord,
} from './migration';
import type { AgentRecord, AgentRecordPersistence } from './types';

export * from './types';
export { AGENT_WIRE_PROTOCOL_VERSION } from './migration';
export {
  FileSystemAgentRecordPersistence,
  InMemoryAgentRecordPersistence,
} from './persistence';
export type { FileSystemAgentRecordPersistenceOptions } from './persistence';
export { BlobStore, isBlobRef } from './blobref';
export type { BlobStoreOptions } from './blobref';

// Contract: restore MUST only rebuild in-memory state. It must not emit UI
// events, call the LLM, execute tools, start background work, make network
// requests, or touch the filesystem in a way that triggers external side effects.
//
// Prefer restoring by calling the same method that wrote the record, so live
// execution and resume share one state mutation path. For example,
// permission.set_mode replays through agent.permission.setMode(input.mode),
// not by assigning modeOverride here. records.logRecord, emitEvent, and
// emitStatusUpdated already gate on records.restoring, so those calls are safe
// during resume.
function restoreAgentRecord(agent: Agent, input: AgentRecord): void {
  switch (input.type) {
    case 'metadata':
      return;
    case 'forked':
      agent.goal.restoreForked(input);
      return;
    case 'turn.prompt':
      agent.turn.restorePrompt();
      return;
    case 'turn.steer':
      agent.turn.restoreSteer(input.input, input.origin);
      return;
    case 'turn.cancel':
      agent.turn.cancel(input.turnId);
      return;
    case 'config.update':
      agent.config.update(input);
      return;
    case 'permission.set_mode':
      agent.permission.setMode(input.mode);
      return;
    case 'permission.record_approval_result':
      agent.permission.recordApprovalResult(input);
      return;
    case 'usage.record':
      agent.usage.record(input.model, input.usage, 'session');
      return;
    case 'full_compaction.begin':
      agent.fullCompaction.begin(input);
      return;
    case 'full_compaction.cancel':
      agent.fullCompaction.cancel();
      return;
    case 'full_compaction.complete':
      agent.fullCompaction.markCompleted();
      return;
    case 'micro_compaction.apply':
      agent.microCompaction.apply(input.cutoff);
      return;
    case 'plan_mode.enter':
      agent.planMode.restoreEnter(input);
      return;
    case 'plan_mode.cancel':
      agent.planMode.cancel(input.id);
      return;
    case 'plan_mode.exit':
      agent.planMode.exit(input.id);
      return;
    case 'swarm_mode.enter':
      agent.swarmMode.restoreEnter(input.trigger);
      return;
    case 'swarm_mode.exit':
      agent.swarmMode.exit();
      return;
    case 'context.append_message':
      agent.context.appendMessage(input.message);
      return;
    case 'context.append_loop_event':
      agent.context.appendLoopEvent(input.event);
      return;
    case 'context.clear':
      agent.context.clear();
      return;
    case 'context.apply_compaction':
      agent.context.applyCompaction(input);
      return;
    case 'context.undo':
      agent.context.undo(input.count);
      return;
    case 'tools.register_user_tool':
      agent.tools.registerUserTool(input);
      return;
    case 'tools.unregister_user_tool':
      agent.tools.unregisterUserTool(input.name);
      return;
    case 'tools.set_active_tools':
      agent.tools.setActiveTools(input.names);
      return;
    case 'tools.runtime_exposure':
      agent.tools.restoreRuntimeToolExposure(input.exposure);
      return;
    case 'tools.update_store':
      agent.tools.updateStore(input.key, input.value);
      return;
    case 'tool_lifecycle.started':
    case 'tool_lifecycle.completed':
      return;
    case 'workframe.opened':
      agent.workFrames.restoreOpened(input.frame);
      return;
    case 'workframe.switched':
      agent.workFrames.restoreSwitched(input.frameId);
      return;
    case 'workframe.closed':
      agent.workFrames.restoreClosed(input.frameId, input.nextActiveFrameId);
      return;
    case 'workframe.context_attached':
      agent.workFrames.restoreContextAttached(input.frameId, input.contextPackId);
      return;
    case 'physics_memory.roots_loaded':
    case 'physics_memory.capsule_loaded':
    case 'physics_memory.context_compiled':
    case 'physics_memory.capsules_promoted':
    case 'research_ledger.roots_loaded':
    case 'research_ledger.event_loaded':
    case 'research_ledger.event_written':
    case 'research_ledger.auto_capture_skipped':
    case 'research_ledger.proposals_compiled':
      return;
    case 'research_action.call_started':
      agent.researchAction.restoreActionCallStarted(input);
      return;
    case 'research_action.call_finished':
      agent.researchAction.restoreActionCallFinished(input);
      return;
    case 'research_action.result_recorded':
      agent.researchAction.restoreActionResultRecorded(input);
      return;
    case 'research_action.raw_tool_escape':
      agent.researchAction.restoreRawToolEscape(input);
      return;
    case 'research_context.context_compiled':
      agent.researchContext.restorePack(input.pack);
      return;
    case 'autoresearch.create':
      agent.autoresearch.restoreCreate(input);
      return;
    case 'autoresearch.update':
      agent.autoresearch.restoreUpdate(input);
      return;
    case 'autoresearch.clear':
      agent.autoresearch.restoreClear(input);
      return;
    case 'goal.create':
      agent.goal.restoreCreate(input);
      return;
    case 'goal.update':
      agent.goal.restoreUpdate(input);
      return;
    case 'goal.clear':
      agent.goal.restoreClear(input);
      return;
  }
}

export interface RestoringContext {
  time?: number;
}

export class AgentRecords {
  private _restoring: RestoringContext | null = null;
  private metadataInitialized = false;

  constructor(
    private readonly agent: Agent,
    private readonly persistence?: AgentRecordPersistence,
  ) {}

  get restoring() {
    return this._restoring;
  }

  logRecord(record: AgentRecord): void {
    if (this._restoring !== null) return;
    const stamped: AgentRecord =
      record.time !== undefined ? record : { ...record, time: Date.now() };
    if (
      this.persistence !== undefined &&
      !this.metadataInitialized &&
      stamped.type !== 'metadata'
    ) {
      this.persistence.append({
        type: 'metadata',
        protocol_version: AGENT_WIRE_PROTOCOL_VERSION,
        created_at: Date.now(),
        app_version: this.agent.appVersion,
      });
      this.metadataInitialized = true;
    }
    if (stamped.type === 'metadata') {
      this.metadataInitialized = true;
    }
    this.persistence?.append(stamped);
  }

  restore(record: AgentRecord): void {
    this._restoring = { time: record.time ?? Date.now() };
    try {
      restoreAgentRecord(this.agent, record);
    } finally {
      this._restoring = null;
    }
  }

  async replay(): Promise<{ warning?: string }> {
    if (!this.persistence) throw new Error('No persistence provided for AgentRecords');
    let migrations: readonly WireMigration[] = [];
    let hasMetadata = false;
    let shouldRewrite = false;
    let warning: string | undefined;
    const replayedRecords: AgentRecord[] = [];
    for await (const record of this.persistence.read()) {
      if (!hasMetadata) {
        if (record.type !== 'metadata') {
          throw new Error('AgentRecords replay expected metadata as the first record');
        }
        hasMetadata = true;
        this.metadataInitialized = true;
        const readVersion = record.protocol_version;
        if (isNewerWireVersion(readVersion)) {
          warning = `Session wire protocol version ${readVersion} is newer than the current version ${AGENT_WIRE_PROTOCOL_VERSION}. Records will be replayed without migration.`;
          shouldRewrite = false;
        } else {
          migrations = resolveWireMigrations(readVersion);
          shouldRewrite = readVersion !== AGENT_WIRE_PROTOCOL_VERSION;
        }
      }
      let migratedRecord = migrateWireRecord(
        record as WireMigrationRecord,
        migrations,
      ) as AgentRecord;
      if (migratedRecord.type === 'metadata') {
        migratedRecord = {
          ...migratedRecord,
          protocol_version: AGENT_WIRE_PROTOCOL_VERSION,
        };
      }
      replayedRecords.push(migratedRecord);
      this.restore(migratedRecord);
    }
    if (shouldRewrite) {
      this.persistence.rewrite(replayedRecords);
      await this.persistence.flush();
    }
    if (this.agent.blobStore !== undefined) {
      for (const msg of this.agent.context.history) {
        await this.agent.blobStore.rehydrateParts(msg.content);
      }
    }
    const firstRecord = replayedRecords[0];
    if (
      firstRecord?.type === 'metadata' &&
      firstRecord.app_version !== this.agent.appVersion
    ) {
      this.persistence.append({
        type: 'metadata',
        protocol_version: AGENT_WIRE_PROTOCOL_VERSION,
        created_at: Date.now(),
        app_version: this.agent.appVersion,
        resumed: true,
      });
      await this.persistence.flush();
    }
    return { warning };
  }

  async flush(): Promise<void> {
    await this.persistence?.flush();
  }
}
