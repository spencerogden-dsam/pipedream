import wealthbox from "../../wealthbox.app.mjs";
import { DEFAULT_POLLING_SOURCE_TIMER_INTERVAL } from "@pipedream/platform";

export default {
  key: "wealthbox-workflow-step-completed",
  name: "Workflow Step Completed",
  description: "Emit new event when a workflow step is marked as completed. [See the documentation](http://dev.wealthbox.com/#workflows-retrieve-all-workflows-get)",
  version: "0.0.1",
  type: "source",
  dedupe: "unique",
  props: {
    wealthbox,
    db: "$.service.db",
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: DEFAULT_POLLING_SOURCE_TIMER_INTERVAL,
      },
    },
  },
  hooks: {
    async deploy() {
      // On first deploy, get current completed steps to establish baseline
      const completedStepIds = await this.getAllCompletedStepIds();
      this._setCompletedStepIds(completedStepIds);
    },
  },
  methods: {
    _getCompletedStepIds() {
      return this.db.get("completedStepIds") || [];
    },
    _setCompletedStepIds(ids) {
      this.db.set("completedStepIds", ids);
    },
    async getAllCompletedStepIds() {
      const completedStepIds = [];
      let page = 1;
      let total;

      do {
        const { workflows } = await this.wealthbox.listWorkflows({
          params: {
            per_page: 100,
            page,
          },
        });
        if (!(workflows?.length > 0)) {
          break;
        }
        total = workflows.length;

        for (const workflow of workflows) {
          const steps = workflow.workflow_steps || [];
          for (const step of steps) {
            // Check for completed status (field may be 'completed', 'complete', or 'done')
            if (step.completed || step.complete || step.done) {
              completedStepIds.push(step.id);
            }
          }
        }
        page += 1;
      } while (total === 100);

      return completedStepIds;
    },
    emitEvent(step, workflow) {
      const meta = this.generateMeta(step, workflow);
      this.$emit({
        step,
        workflow: {
          id: workflow.id,
          name: workflow.name || workflow.label,
          linked_to: workflow.linked_to,
        },
      }, meta);
    },
    generateMeta(step, workflow) {
      const workflowName = workflow.name || workflow.label || "Unknown Workflow";
      return {
        id: `${step.id}-completed`,
        summary: `Step Completed: ${step.name || "Unnamed"} (${workflowName})`,
        ts: Date.now(),
      };
    },
  },
  async run() {
    const seenIds = new Set(this._getCompletedStepIds());
    const newCompletedIds = [];
    let page = 1;
    let total;

    do {
      const { workflows } = await this.wealthbox.listWorkflows({
        params: {
          per_page: 100,
          page,
        },
      });
      if (!(workflows?.length > 0)) {
        break;
      }
      total = workflows.length;

      for (const workflow of workflows) {
        const steps = workflow.workflow_steps || [];
        for (const step of steps) {
          // Check for completed status
          if ((step.completed || step.complete || step.done) && !seenIds.has(step.id)) {
            this.emitEvent(step, workflow);
            newCompletedIds.push(step.id);
          }
        }
      }
      page += 1;
    } while (total === 100);

    if (newCompletedIds.length > 0) {
      const allIds = [...seenIds, ...newCompletedIds];
      // Keep only last 10000 IDs to prevent unbounded growth
      this._setCompletedStepIds(allIds.slice(-10000));
    }
  },
};
