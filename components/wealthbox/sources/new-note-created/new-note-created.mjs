import common from "../common/common.mjs";

export default {
  ...common,
  key: "wealthbox-new-note-created",
  name: "New Note Created",
  description: "Emit new event for each note created. [See the documentation](http://dev.wealthbox.com/#notes-retrieve-all-notes-get)",
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
      const { notes } = await this.wealthbox.listNotes({
        params,
      });
      return notes;
    },
    generateMeta(note) {
      const linkedTo = note.linked_to?.[0];
      const linkedName = linkedTo?.name || "Unknown";
      return {
        id: note.id,
        summary: `New Note on ${linkedName}`,
        ts: this.getCreatedAtTs(note),
      };
    },
  },
};
