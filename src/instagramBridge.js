const { IgApiClient, IgCheckpointError, IgLoginBadPasswordError } = require('instagram-private-api');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class InstagramBridge {
  constructor({ logger, hehoClient }) {
    this.logger = logger;
    this.hehoClient = hehoClient;
    this.ig = null;
    this.connected = false;
    this.username = null;
    this.pollTimer = null;
    this.lastSeen = new Set();
    this.myUserId = null;
    this.threadHistory = new Map();
  }

  async connect({ username, password }) {
    if (this.connected) {
      this.logger.warn('Connect requested while already connected.', { username: this.username });
      return { connected: true, username: this.username };
    }

    const normalized = String(username || '').trim();
    if (!normalized) {
      throw new Error('Instagram username/email/phone is required.');
    }

    const ig = new IgApiClient();
    ig.state.generateDevice(normalized);

    this.logger.info('Instagram login started.', { username: normalized });

    try {
      await ig.simulate.preLoginFlow();
      await delay(1000 + Math.floor(Math.random() * 1000));

      const account = await ig.account.login(normalized, password);
      process.nextTick(async () => {
        try {
          await ig.simulate.postLoginFlow();
        } catch (postLoginError) {
          this.logger.warn('Post-login simulation warning.', { error: postLoginError.message });
        }
      });

      this.ig = ig;
      this.myUserId = account?.pk ? String(account.pk) : null;
      this.connected = true;
      this.username = account?.username || normalized;

      this.logger.info('Instagram login successful. Bridge connected.', { username: this.username });
      this.startPolling();

      return { connected: true, username: this.username };
    } catch (error) {
      if (error instanceof IgLoginBadPasswordError) {
        throw new Error('Instagram rejected login credentials. Verify username/email/phone and password.');
      }

      if (error instanceof IgCheckpointError) {
        throw new Error('Instagram checkpoint/challenge required. Open Instagram app/web and complete security challenge first.');
      }

      if (String(error.message || '').includes("We can't find an account")) {
        throw new Error(
          "Instagram says account was not found. Try the account's exact @username (not display name), or login email/phone."
        );
      }

      throw error;
    }
  }

  disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.connected = false;
    this.username = null;
    this.ig = null;
    this.lastSeen.clear();
    this.threadHistory.clear();
    this.myUserId = null;

    this.logger.warn('Bridge disconnected.');
    return { connected: false };
  }

  status() {
    return {
      connected: this.connected,
      username: this.username,
    };
  }

  startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = setInterval(async () => {
      try {
        await this.pollInbox();
      } catch (error) {
        this.logger.error('Inbox polling failed.', { error: error.message });
      }
    }, 5000);

    this.logger.info('Inbox polling loop started (5s interval).');
  }

  async pollInbox() {
    if (!this.connected || !this.ig) {
      return;
    }

    const inboxFeed = this.ig.feed.directInbox();
    const inbox = await inboxFeed.items();

    for (const thread of inbox) {
      const threadId = thread.thread_id;
      const items = thread.items || [];

      for (const item of items) {
        const itemKey = `${threadId}:${item.item_id}`;
        if (this.lastSeen.has(itemKey)) {
          continue;
        }

        this.lastSeen.add(itemKey);

        const isText = item.item_type === 'text' && item.text;
        const isIncoming = !this.myUserId || String(item.user_id) !== this.myUserId;

        if (!isText || !isIncoming) {
          continue;
        }

        await this.handleIncomingMessage({
          threadId,
          text: item.text,
          senderId: item.user_id,
          itemId: item.item_id,
        });
      }
    }

    if (this.lastSeen.size > 3000) {
      const snapshot = Array.from(this.lastSeen).slice(-1000);
      this.lastSeen = new Set(snapshot);
    }
  }

  async handleIncomingMessage({ threadId, text, senderId, itemId }) {
    this.logger.info('Incoming IG message received.', { threadId, senderId, text, itemId });

    const history = this.threadHistory.get(threadId) || [];

    let reply = 'Sorry, I could not generate a response right now.';

    try {
      const hehoResult = await this.hehoClient.ask({ message: text, history });
      reply = hehoResult.reply;
      this.logger.info('Heho response generated.', { threadId, reply });
    } catch (error) {
      this.logger.error('Heho API call failed.', { threadId, error: error.message });
    }

    const randomDelay = 3000 + Math.floor(Math.random() * 2001);
    await delay(randomDelay);

    try {
      const directThread = this.ig.entity.directThread(threadId);
      await directThread.broadcastText(reply);
      this.logger.info('IG auto-reply sent.', { threadId, randomDelayMs: randomDelay, reply });

      const nextHistory = [
        ...history,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ].slice(-20);
      this.threadHistory.set(threadId, nextHistory);
    } catch (error) {
      this.logger.error('Failed to send IG auto-reply.', { threadId, error: error.message });
    }
  }

  async chatWithHeho(message) {
    const result = await this.hehoClient.ask({ message });
    this.logger.info('UI-to-Heho chat executed.', { message, reply: result.reply });
    return result.reply;
  }
}

module.exports = { InstagramBridge };
