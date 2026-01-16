import common from "../common/common.mjs";

export default {
  ...common,
  key: "wealthbox-new-comment",
  name: "New Comment",
  description: "Emit new event for each comment created. [See the documentation](http://dev.wealthbox.com/#comments-retrieve-all-comments-get)",
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
      const { comments } = await this.wealthbox.listComments({
        params,
      });
      return comments;
    },
    generateMeta(comment) {
      return {
        id: comment.id,
        summary: `New Comment by ${comment.creator?.name || "Unknown"}`,
        ts: this.getCreatedAtTs(comment),
      };
    },
  },
};
