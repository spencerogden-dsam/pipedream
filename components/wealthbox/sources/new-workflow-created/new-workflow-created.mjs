import common from "../common/common.mjs";

export default {
  ...common,
  key: "wealthbox-new-workflow-created",
  name: "New Workflow Created",
  description: "Emit new event for each workflow created. [See the documentation](http://dev.wealthbox.com/#workflows-retrieve-all-workflows-get)",
  version: "0.0.1",
  type: "source",
  dedupe: "unique",
  methods: {
    ...common.methods,
    async getEvents({ params }) {
      params = {
        ...params,
        order: "created",
      };
      const { workflows } = await this.wealthbox.listWorkflows({
        params,
      });
      return workflows;
    },
    generateMeta(workflow) {
      return {
        id: workflow.id,
        summary: `New Workflow: ${workflow.name || "Unnamed"}`,
        ts: this.getCreatedAtTs(workflow),
      };
    },
  },
};
