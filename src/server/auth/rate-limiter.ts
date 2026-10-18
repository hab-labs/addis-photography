interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();

  public isLocked(key: string): { locked: boolean; retryAfterSeconds: number } {
    const entry = this.store.get(key);
    if (!entry || !entry.lockedUntil) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    const now = Date.now();
    if (now < entry.lockedUntil) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { locked: true, retryAfterSeconds: remainingSeconds };
    }

    // Lockout expired
    this.store.delete(key);
    return { locked: false, retryAfterSeconds: 0 };
  }

  public recordFailure(key: string, maxAttempts = 5, lockoutSeconds = 900): {
    locked: boolean;
    remainingAttempts: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key) || {
      attempts: 0,
      firstAttemptAt: now,
      lockedUntil: null,
    };

    // If already locked
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { locked: true, remainingAttempts: 0, retryAfterSeconds: remainingSeconds };
    }

    entry.attempts += 1;

    if (entry.attempts >= maxAttempts) {
      entry.lockedUntil = now + lockoutSeconds * 1000;
      this.store.set(key, entry);
      return { locked: true, remainingAttempts: 0, retryAfterSeconds: lockoutSeconds };
    }

    this.store.set(key, entry);
    return {
      locked: false,
      remainingAttempts: maxAttempts - entry.attempts,
      retryAfterSeconds: 0,
    };
  }

  public isBlocked(key: string): { blocked: boolean; retryAfterSeconds: number } {
    const res = this.isLocked(key);
    return { blocked: res.locked, retryAfterSeconds: res.retryAfterSeconds };
  }

  public recordSuccess(key: string): void {
    this.store.delete(key);
  }

  public reset(key: string): void {
    this.recordSuccess(key);
  }

  public clear(): void {
    this.store.clear();
  }
}

const globalForRateLimiter = globalThis as unknown as {
  __addis_rate_limiter__?: RateLimiter;
};

export const rateLimiter = globalForRateLimiter.__addis_rate_limiter__ || new RateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimiter.__addis_rate_limiter__ = rateLimiter;
}
