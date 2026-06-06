import type { ToolCall } from '@moonshot-ai/kosong';
import { describe, expect, it } from 'vitest';

import { createCommandKaos, testAgent } from './harness/agent';

describe('primitive tool lifecycle records', () => {
  it(
    'records started and failed audit events when the requested tool is unavailable',
    async () => {
    const bashCall: ToolCall = {
      type: 'function',
      id: 'call_bash',
      name: 'Bash',
      arguments: '{"command":"printf lifecycle-result","timeout":60}',
    };
    const ctx = testAgent({ kaos: createCommandKaos('lifecycle-result') });
    ctx.configure({ tools: ['Bash'] });
    await ctx.rpc.setPermission({ mode: 'auto' });
    ctx.agent.workFrames.open(
      {
        id: 'frame.librpa',
        domain: 'librpa',
        topic: 'head-wing',
        goal: 'Trace primitive tool attribution.',
      },
      { source: 'controller' },
    );
    ctx.mockNextResponse({ type: 'text', text: 'I will run Bash.' }, bashCall);
    ctx.mockNextResponse({ type: 'text', text: 'Done.' });
    await ctx.rpc.prompt({
      input: [{ type: 'text', text: 'Run the lifecycle smoke command' }],
    });
    await ctx.untilTurnEnd();

    const started = findWireEvent(ctx.allEvents, 'tool_lifecycle.started');
    const completed = findWireEvent(ctx.allEvents, 'tool_lifecycle.completed');

    expect(started).toMatchObject({
      source: 'loop',
      turnId: 0,
      step: 1,
      toolCallId: 'call_bash',
      toolName: 'Bash',
      cwd: process.cwd(),
      argsSummary: '{"command":"printf lifecycle-result","timeout":60}',
      workFrameId: 'frame.librpa',
      startedAt: expect.any(Number),
      time: expect.any(Number),
    });
    expect(completed).toMatchObject({
      source: 'loop',
      turnId: 0,
      step: 1,
      toolCallId: 'call_bash',
      toolName: 'Bash',
      cwd: process.cwd(),
      status: 'failed',
      isError: true,
      outputKind: 'text',
      outputSummary: 'Tool "Bash" not found',
      durationMs: expect.any(Number),
      workFrameId: 'frame.librpa',
      completedAt: expect.any(Number),
      artifactRefs: [],
      time: expect.any(Number),
    });
    expect(ctx.agent.toolLifecycle.listRecent()).toHaveLength(1);
      expect(ctx.agent.toolLifecycle.listRecent()[0]?.completed.toolCallId).toBe('call_bash');
    },
    15_000,
  );
});

function findWireEvent(
  events: readonly { readonly type: string; readonly event: string; readonly args: unknown }[],
  name: string,
): unknown {
  return events.find((event) => event.type === '[wire]' && event.event === name)?.args;
}
