const axios = require('axios');

class HehoClient {
  constructor({ apiKey, chatbotId, baseUrl = 'https://heho.vercel.app/api/aichat' }) {
    this.apiKey = apiKey;
    this.chatbotId = chatbotId;
    this.baseUrl = baseUrl;
  }

  async ask({ message, history = [] }) {
    if (!this.apiKey || !this.chatbotId) {
      throw new Error('HEHO_API_KEY or HEHO_CHATBOT_ID is not configured.');
    }

    const payload = {
      chatbotId: this.chatbotId,
      messages: [{ role: 'user', content: message }],
      history,
    };

    const response = await axios.post(this.baseUrl, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const data = response.data || {};
    const reply =
      data.reply ||
      data.message ||
      data.content ||
      data?.choices?.[0]?.message?.content ||
      'Sorry, no reply was returned by Heho.';

    return { reply, raw: data };
  }
}

module.exports = { HehoClient };
