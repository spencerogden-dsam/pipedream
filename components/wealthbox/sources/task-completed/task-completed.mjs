import wealthbox from "../../wealthbox.app.mjs";
import { DEFAULT_POLLING_SOURCE_TIMER_INTERVAL } from "@pipedream/platform";

export default {
  key: "wealthbox-task-completed",
  name: "Task Completed",
  description: "Emit new event when a task is marked as completed. [See the documentation](http://dev.wealthbox.com/#tasks-retrieve-all-tasks-get)",
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
      // On first deploy, get current completed tasks to establish baseline
      const completedTaskIds = new Set();
      let page = 1;
      let total;

      do {
        const { tasks } = await this.wealthbox.listTasks({
          params: {
            per_page: 100,
            page,
            completed: true,
          },
        });
        if (!(tasks?.length > 0)) {
          break;
        }
        total = tasks.length;
        tasks.forEach((task) => completedTaskIds.add(task.id));
        page += 1;
      } while (total === 100);

      this._setCompletedTaskIds(Array.from(completedTaskIds));

      // Emit the most recent 25 completed tasks as historical events
      const { tasks } = await this.wealthbox.listTasks({
        params: {
          per_page: 25,
          completed: true,
        },
      });
      if (tasks?.length > 0) {
        tasks.forEach((task) => this.emitEvent(task));
      }
    },
  },
  methods: {
    _getCompletedTaskIds() {
      return this.db.get("completedTaskIds") || [];
    },
    _setCompletedTaskIds(ids) {
      this.db.set("completedTaskIds", ids);
    },
    emitEvent(task) {
      const meta = this.generateMeta(task);
      this.$emit(task, meta);
    },
    generateMeta(task) {
      return {
        id: `${task.id}-completed`,
        summary: `Task Completed: ${task.name || "Unnamed"}`,
        ts: Date.now(),
      };
    },
  },
  async run() {
    const seenIds = new Set(this._getCompletedTaskIds());
    const newCompletedIds = [];
    let page = 1;
    let total;

    do {
      const { tasks } = await this.wealthbox.listTasks({
        params: {
          per_page: 100,
          page,
          completed: true,
        },
      });
      if (!(tasks?.length > 0)) {
        break;
      }
      total = tasks.length;

      for (const task of tasks) {
        if (!seenIds.has(task.id)) {
          this.emitEvent(task);
          newCompletedIds.push(task.id);
        }
      }
      page += 1;
    } while (total === 100);

    if (newCompletedIds.length > 0) {
      // Add new IDs to the set and save
      const allIds = [...seenIds, ...newCompletedIds];
      // Keep only last 10000 IDs to prevent unbounded growth
      this._setCompletedTaskIds(allIds.slice(-10000));
    }
  },
};
