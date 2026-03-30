class UiLogger {
  constructor(limit = 500) {
    this.limit = limit;
    this.logs = [];
  }

  add(level, message, meta = {}) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      message,
      meta,
      at: new Date().toISOString(),
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.limit) {
      this.logs.length = this.limit;
    }

    return entry;
  }

  info(message, meta) {
    return this.add('info', message, meta);
  }

  warn(message, meta) {
    return this.add('warn', message, meta);
  }

  error(message, meta) {
    return this.add('error', message, meta);
  }

  list() {
    return this.logs;
  }
}

module.exports = { UiLogger };
