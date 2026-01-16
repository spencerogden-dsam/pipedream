import wealthbox from "../../wealthbox.app.mjs";
import { DEFAULT_POLLING_SOURCE_TIMER_INTERVAL } from "@pipedream/platform";

export default {
  key: "wealthbox-contact-updated",
  name: "Contact Updated",
  description: "Emit new event when a contact is updated. [See the documentation](http://dev.wealthbox.com/#contacts-retrieve-all-contacts-get)",
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
      const { contacts } = await this.wealthbox.listContacts({
        params: {
          per_page: 25,
          order: "recent",
        },
      });
      if (!(contacts?.length > 0)) {
        return;
      }
      this._setLastUpdated(this.getUpdatedAtTs(contacts[0]));
      contacts.forEach((contact) => this.emitEvent(contact));
    },
  },
  methods: {
    _getLastUpdated() {
      return this.db.get("lastUpdated");
    },
    _setLastUpdated(lastUpdated) {
      this.db.set("lastUpdated", lastUpdated);
    },
    getUpdatedAtTs(contact) {
      return (Date.parse(contact.updated_at)) / 1000;
    },
    emitEvent(contact) {
      const meta = this.generateMeta(contact);
      this.$emit(contact, meta);
    },
    generateMeta(contact) {
      const ts = this.getUpdatedAtTs(contact);
      return {
        id: `${contact.id}-${ts}`,
        summary: `Contact Updated - ${contact.name}`,
        ts,
      };
    },
  },
  async run() {
    const lastUpdated = this._getLastUpdated() || 0;
    let maxLastUpdated = lastUpdated;
    let total;
    const params = {
      per_page: 25,
      page: 1,
      order: "recent",
    };

    do {
      const { contacts } = await this.wealthbox.listContacts({
        params,
      });
      if (!(contacts?.length > 0)) {
        break;
      }
      total = contacts.length;
      for (const contact of contacts) {
        const ts = this.getUpdatedAtTs(contact);
        if (ts > lastUpdated) {
          this.emitEvent(contact);
          if (ts > maxLastUpdated) {
            maxLastUpdated = ts;
          }
        } else {
          break;
        }
      }
      params.page += 1;
    } while (total === params.per_page);

    this._setLastUpdated(maxLastUpdated);
  },
};
