import wealthbox from "../../wealthbox.app.mjs";

export default {
  key: "wealthbox-contact-updated-instant",
  name: "Contact Updated (Instant)",
  description: "Emit new event immediately when a contact is updated via webhook. [See the documentation](http://dev.wealthbox.com/)",
  version: "0.0.1",
  type: "source",
  dedupe: "unique",
  props: {
    wealthbox,
    db: "$.service.db",
    http: "$.interface.http",
  },
  methods: {
    _getWebhookId() {
      return this.db.get("webhookId");
    },
    _setWebhookId(webhookId) {
      this.db.set("webhookId", webhookId);
    },
    generateMeta(contact) {
      const ts = Date.now();
      return {
        id: `${contact.id}-${ts}`,
        summary: `Contact Updated - ${contact.name || contact.first_name || "Unknown"}`,
        ts,
      };
    },
  },
  hooks: {
    async activate() {
      // Register webhook with Wealthbox
      const response = await this.wealthbox.createWebhook({
        data: {
          url: this.http.endpoint,
          events: [
            "contact.updated",
          ],
        },
      });
      this._setWebhookId(response.id);
      console.log(`Registered webhook ${response.id} for contact.updated events`);
    },
    async deactivate() {
      const webhookId = this._getWebhookId();
      if (webhookId) {
        await this.wealthbox.deleteWebhook({
          webhookId,
        });
        console.log(`Deleted webhook ${webhookId}`);
      }
    },
  },
  async run(event) {
    const { body } = event;

    // Handle webhook verification if Wealthbox sends a challenge
    if (body?.challenge) {
      return body.challenge;
    }

    // Extract contact data from webhook payload
    const contact = body?.contact || body?.data || body;

    if (!contact?.id) {
      console.log("No contact data in webhook payload:", JSON.stringify(body));
      return;
    }

    const meta = this.generateMeta(contact);
    this.$emit(contact, meta);
  },
};
