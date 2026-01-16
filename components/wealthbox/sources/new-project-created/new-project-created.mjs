import common from "../common/common.mjs";

export default {
  ...common,
  key: "wealthbox-new-project-created",
  name: "New Project Created",
  description: "Emit new event for each project created. [See the documentation](http://dev.wealthbox.com/#projects-retrieve-all-projects-get)",
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
      const { projects } = await this.wealthbox.listProjects({
        params,
      });
      return projects;
    },
    generateMeta(project) {
      return {
        id: project.id,
        summary: `New Project: ${project.name || "Unnamed"}`,
        ts: this.getCreatedAtTs(project),
      };
    },
  },
};
