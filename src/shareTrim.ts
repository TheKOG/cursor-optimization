export type ShareResult = {
  shareId?: string;
  shareUrl?: string;
  redactions?: number;
};

export type ShareSend = (
  messages: unknown[],
  title: string,
  includePlan: boolean
) => Promise<ShareResult>;

export function shareTooBig(err: unknown): boolean {
  const chunks: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value) {
      chunks.push(value);
    }
  };
  const error = err as {
    message?: unknown;
    rawMessage?: unknown;
    details?: unknown;
  } | null;
  push(error?.message);
  push(error?.rawMessage);
  const details = error?.details;
  if (Array.isArray(details)) {
    for (const detail of details) {
      const item = detail as {
        debug?: unknown;
        details?: { detail?: unknown; title?: unknown };
      };
      push(item?.details?.detail);
      push(item?.details?.title);
      if (item?.debug && typeof item.debug === "object") {
        push(safeJson(item.debug));
      } else {
        push(item?.debug);
      }
      push(safeJson(detail));
    }
  }
  return chunks.join("\n").includes("exceeds content limits");

  function safeJson(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
}

export function shrinkMessages(messages: unknown[], stringCap: number): unknown[] {
  return messages.map((message) => shrinkValue(message, stringCap, 0, new WeakSet()));

  function shrinkValue(
    value: unknown,
    stringCap: number,
    depth: number,
    seen: WeakSet<object>
  ): unknown {
    if (value == null || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value.length <= stringCap) {
        return value;
      }
      return `${value.slice(0, stringCap)}\n...[truncated]`;
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      return new Uint8Array(0);
    }
    if (depth > 10) {
      return undefined;
    }
    if (seen.has(value)) {
      return undefined;
    }
    seen.add(value);
    const jsonable = value as { toJson?: () => unknown };
    if (typeof jsonable.toJson === "function") {
      try {
        return shrinkValue(jsonable.toJson(), stringCap, depth + 1, seen);
      } catch {
        // Fall through and copy enumerable fields.
      }
    }
    if (Array.isArray(value)) {
      return value.map((item) => shrinkValue(item, stringCap, depth + 1, seen));
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (key === "images") {
        out[key] = [];
        continue;
      }
      const child = shrinkValue((value as Record<string, unknown>)[key], stringCap, depth + 1, seen);
      if (child !== undefined) {
        out[key] = child;
      }
    }
    return out;
  }
}

export async function shareWithinLimit(opts: {
  messages: unknown[];
  title: string;
  send: ShareSend;
  deleteShare?: (shareId: string) => Promise<unknown>;
  trim?: boolean;
}): Promise<ShareResult> {
  const messages = opts.messages || [];
  const title = opts.title || "";
  const send = opts.send;
  const deleteShare = opts.deleteShare;
  const total = messages.length;
  if (total === 0) {
    throw new Error("No content to share");
  }

  let best: ShareResult | null = null;
  async function remember(result: ShareResult): Promise<ShareResult> {
    if (
      best?.shareId &&
      result?.shareId &&
      best.shareId !== result.shareId &&
      deleteShare
    ) {
      try {
        await deleteShare(best.shareId);
      } catch {
        // The longer share is the one to keep.
      }
    }
    best = result;
    return result;
  }

  console.warn(`[share-trim] start messages=${total} trim=${opts.trim !== false}`);

  if (opts.trim === false) {
    console.warn(`[share-trim] trim off, sending ${total}`);
    return attempt(total, true);
  }

  async function attempt(count: number, includePlan: boolean, shrunk?: unknown[]): Promise<ShareResult> {
    const slice = shrunk || messages.slice(total - count);
    const usedTitle = count === total ? title : `${title} (最近 ${count}/${total} 条)`;
    console.warn(`[share-trim] try ${count}/${total} plan=${includePlan} shrunk=${shrunk ? 1 : 0}`);
    try {
      const result = await send(slice, usedTitle, includePlan);
      console.warn(`[share-trim] accepted ${count}/${total} shareId=${result?.shareId ?? ""}`);
      return result;
    } catch (err) {
      const error = err as { message?: unknown; rawMessage?: unknown };
      console.warn(
        `[share-trim] rejected ${count}/${total} tooBig=${shareTooBig(err)} message=${String(error?.message ?? "")} raw=${String(error?.rawMessage ?? "")}`
      );
      throw err;
    }
  }

  try {
    return await remember(await attempt(total, true));
  } catch (err) {
    if (!shareTooBig(err)) {
      throw err;
    }
  }

  try {
    return await remember(await attempt(total, false));
  } catch (err) {
    if (!shareTooBig(err)) {
      throw err;
    }
  }

  let lo = 0;
  let hi = total;
  let lastErr: unknown = null;
  while (lo === 0 && hi > 1) {
    const count = Math.floor(hi / 2);
    try {
      await remember(await attempt(count, false));
      lo = count;
    } catch (err) {
      lastErr = err;
      if (!shareTooBig(err)) {
        throw err;
      }
      hi = count;
    }
  }

  let expansions = 0;
  while (best && hi - lo > 1 && expansions < 8) {
    const mid = Math.floor((lo + hi) / 2);
    expansions += 1;
    try {
      await remember(await attempt(mid, false));
      lo = mid;
    } catch (err) {
      lastErr = err;
      if (!shareTooBig(err)) {
        throw err;
      }
      hi = mid;
    }
  }

  if (best) {
    console.warn(`[share-trim] shared ${lo}/${total}`);
    return best;
  }

  let cap = 16000;
  const only = messages.slice(total - 1);
  while (cap >= 1000) {
    try {
      const shrunk = shrinkMessages(only, cap);
      const result = await send(shrunk, `${title} (最近 1/${total} 条，已截断)`, false);
      console.warn(`[share-trim] shared 1/${total} truncated to ${cap}`);
      return await remember(result);
    } catch (err) {
      lastErr = err;
      if (!shareTooBig(err)) {
        throw err;
      }
      cap = Math.floor(cap / 2);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Share exceeds content limits");
}
