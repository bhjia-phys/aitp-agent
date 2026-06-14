import type { Agent } from '..';
import { AutoresearchInjector } from './autoresearch';
import { GoalInjector } from './goal';
import type { DynamicInjector } from './injector';
import { PermissionModeInjector } from './permission-mode';
import { PluginSessionStartInjector } from './plugin-session-start';
import { PlanModeInjector } from './plan-mode';
import { ResearchContextInjector } from './research-context';
import { TodoListReminderInjector } from './todo-list';

export class InjectionManager {
  private readonly injectors: DynamicInjector[];
  private readonly researchContextInjector: ResearchContextInjector;
  // Goal context is injected at continuation boundaries (turn start, each
  // continuation, after compaction) via `injectGoal()`, NOT in the per-step
  // `inject()` loop. Boundary-cadence append-only injection keeps one fresh copy
  // near the tail without mutating the prefix, so prompt caching is preserved and
  // the context does not grow O(n^2) the way per-step injection did.
  private readonly goalInjector: GoalInjector | null;
  private readonly autoresearchInjector: AutoresearchInjector | null;

  constructor(protected readonly agent: Agent) {
    this.researchContextInjector = new ResearchContextInjector(agent);
    this.injectors = [
      new PluginSessionStartInjector(agent),
      new TodoListReminderInjector(agent),
      new PlanModeInjector(agent),
      new PermissionModeInjector(agent),
      this.researchContextInjector,
    ];
    this.goalInjector = agent.type === 'main' ? new GoalInjector(agent) : null;
    this.autoresearchInjector = agent.type === 'main' ? new AutoresearchInjector(agent) : null;
  }

  async inject(): Promise<void> {
    for (const injector of this.injectors) {
      await injector.inject();
    }
  }

  async injectResearchContextForPrompt(
    prompt: Parameters<ResearchContextInjector['injectForPrompt']>[0],
  ): Promise<void> {
    await this.researchContextInjector.injectForPrompt(prompt);
  }

  /**
   * Appends a fresh goal-context reminder at a continuation boundary. Append-only
   * (never mutates the prefix) so prompt caching is preserved; no-ops when goal
   * mode is off, the agent is not the main agent, or there is nothing to inject.
   */
  async injectGoal(): Promise<void> {
    await this.activeGoalInjector()?.inject();
    await this.autoresearchInjector?.inject();
  }

  onContextClear(): void {
    for (const injector of this.lifecycleInjectors()) {
      injector.onContextClear();
    }
  }

  onContextCompacted(compactedCount: number): void {
    for (const injector of this.lifecycleInjectors()) {
      try {
        injector.onContextCompacted(compactedCount);
      } catch {
        continue;
      }
    }
  }

  onContextMessageRemoved(index: number): void {
    for (const injector of this.lifecycleInjectors()) {
      injector.onContextMessageRemoved(index);
    }
  }

  /** Per-step injectors plus the boundary goal injector, for lifecycle events. */
  private lifecycleInjectors(): DynamicInjector[] {
    const boundaryInjectors: DynamicInjector[] = [];
    const goalInjector = this.activeGoalInjector();
    if (goalInjector !== null) boundaryInjectors.push(goalInjector);
    if (this.autoresearchInjector !== null) boundaryInjectors.push(this.autoresearchInjector);
    return boundaryInjectors.length === 0
      ? this.injectors
      : [...boundaryInjectors, ...this.injectors];
  }

  private activeGoalInjector(): GoalInjector | null {
    return this.goalInjector;
  }
}
