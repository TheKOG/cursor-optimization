export type ShareAttempt = {
  attempt: number;
  messageCount: number;
  messageTotal: number;
};

export type ShareResult = {
  shareId?: string;
  shareUrl?: string;
  redactions?: number;
  attempt?: number;
  messageCount?: number;
  messageTotal?: number;
  imageCount?: number;
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
      const raw = (value as Record<string, unknown>)[key];
      if (key === "images" && Array.isArray(raw)) {
        out[key] = raw;
        continue;
      }
      const child = shrinkValue(raw, stringCap, depth + 1, seen);
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
  includePlan?: boolean;
  minAttempts?: number;
  maxAttempts?: number;
  onAttempt?: (info: ShareAttempt) => void;
}): Promise<ShareResult> {
  const messages = opts.messages || [];
  const title = opts.title || "";
  const send = opts.send;
  const deleteShare = opts.deleteShare;
  const total = messages.length;
  if (total === 0) {
    throw new Error("No content to share");
  }
  const withPlan = opts.includePlan === true;
  const minAttempts = clampAttempt(opts.minAttempts, 3);
  const maxAttempts = opts.maxAttempts == null ? null : Math.max(minAttempts, clampAttempt(opts.maxAttempts, 16));

  let best: ShareResult | null = null;
  let round = 0;
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

  function canAttempt(): boolean {
    return maxAttempts == null || round < maxAttempts;
  }

  function succeededEnough(): boolean {
    return best != null && round >= minAttempts;
  }

  console.warn(
    `[share-trim] start messages=${total} trim=${opts.trim !== false} plan=${withPlan} min=${minAttempts} max=${maxAttempts ?? "open"}`
  );

  if (opts.trim === false) {
    console.warn(`[share-trim] trim off, sending ${total}`);
    return attempt(total, withPlan);
  }

  function note(count: number): ShareAttempt {
    round += 1;
    const info = { attempt: round, messageCount: count, messageTotal: total };
    opts.onAttempt?.(info);
    console.warn(`[share-trim] round ${info.attempt} messages=${info.messageCount}/${info.messageTotal}`);
    return info;
  }

  function countImages(list: unknown[]): number {
    let images = 0;
    for (const message of list) {
      const value = (message as { images?: unknown })?.images;
      if (Array.isArray(value)) {
        images += value.length;
      }
    }
    return images;
  }

  function tagged(result: ShareResult, info: ShareAttempt, sent: unknown[]): ShareResult {
    return { ...result, ...info, imageCount: countImages(sent) };
  }

  async function attempt(count: number, includePlan: boolean, shrunk?: unknown[]): Promise<ShareResult> {
    const slice = shrunk || messages.slice(total - count);
    const usedTitle = count === total ? title : `${title} (最近 ${count}/${total} 条)`;
    const info = note(slice.length);
    console.warn(`[share-trim] try ${count}/${total} plan=${includePlan} shrunk=${shrunk ? 1 : 0}`);
    try {
      const result = await send(slice, usedTitle, includePlan);
      console.warn(`[share-trim] accepted ${count}/${total} shareId=${result?.shareId ?? ""} images=${countImages(slice)}`);
      return tagged(result, info, slice);
    } catch (err) {
      const error = err as { message?: unknown; rawMessage?: unknown };
      console.warn(
        `[share-trim] rejected ${count}/${total} tooBig=${shareTooBig(err)} message=${String(error?.message ?? "")} raw=${String(error?.rawMessage ?? "")}`
      );
      throw err;
    }
  }

  try {
    return await remember(await attempt(total, withPlan));
  } catch (err) {
    if (!shareTooBig(err)) {
      throw err;
    }
  }

  let lo = 0;
  let hi = total;
  let lastErr: unknown = null;
  while (lo === 0 && hi > 1 && canAttempt() && !succeededEnough()) {
    const count = Math.floor(hi / 2);
    try {
      await remember(await attempt(count, withPlan));
      lo = count;
    } catch (err) {
      lastErr = err;
      if (!shareTooBig(err)) {
        throw err;
      }
      hi = count;
    }
  }

  while (best && hi - lo > 1 && canAttempt() && !succeededEnough()) {
    const mid = Math.floor((lo + hi) / 2);
    try {
      await remember(await attempt(mid, withPlan));
      lo = mid;
    } catch (err) {
      lastErr = err;
      if (!shareTooBig(err)) {
        throw err;
      }
      hi = mid;
    }
  }

  async function appendDroppedImages(count: number): Promise<ShareResult | null> {
    const dropped = messages.slice(0, total - count);
    const extras: unknown[] = [];
    for (const message of dropped) {
      const images = (message as { images?: unknown[] })?.images;
      if (Array.isArray(images)) {
        extras.push(...images);
      }
    }
    if (extras.length === 0) {
      return null;
    }
    const slice = messages.slice(total - count).map((message) => {
      const copy = { ...(message as object) } as { images?: unknown[]; type?: number };
      if (Array.isArray(copy.images)) {
        copy.images = copy.images.slice();
      }
      return copy;
    });
    let index = slice.length - 1;
    for (let i = slice.length - 1; i >= 0; i -= 1) {
      if (slice[i]?.type === 1) {
        index = i;
        break;
      }
    }
    let keep = extras.slice();
    while (keep.length > 0 && canAttempt()) {
      const next = slice.map((message, i) =>
        i === index ? { ...message, images: [...(message.images || []), ...keep] } : message
      );
      const info = note(count);
      try {
        const result = await send(
          next,
          count === total ? title : `${title} (最近 ${count}/${total} 条)`,
          withPlan
        );
        console.warn(`[share-trim] kept ${keep.length} images from trimmed messages`);
        return await remember(tagged(result, info, next));
      } catch (err) {
        if (!shareTooBig(err)) {
          throw err;
        }
        keep = keep.slice(Math.ceil(keep.length / 2));
      }
    }
    return null;
  }

  if (best) {
    const withImages = succeededEnough() || !canAttempt() ? null : await appendDroppedImages(lo);
    const chosen = withImages || best;
    console.warn(
      `[share-trim] shared ${lo}/${total} images=${chosen.imageCount ?? 0} rounds=${round} min=${minAttempts} max=${maxAttempts ?? "open"}`
    );
    return chosen;
  }
  if (!canAttempt()) {
    console.warn(`[share-trim] stop at max ${maxAttempts} with no success`);
    throw lastErr instanceof Error ? lastErr : new Error("Share exceeds content limits");
  }

  let cap = 16000;
  const only = messages.slice(total - 1);
  while (cap >= 1000 && canAttempt()) {
    try {
      const shrunk = shrinkMessages(only, cap);
      const info = note(1);
      const result = await send(shrunk, `${title} (最近 1/${total} 条，已截断)`, withPlan);
      console.warn(`[share-trim] shared 1/${total} truncated to ${cap} images=${countImages(shrunk)}`);
      return await remember(tagged(result, info, shrunk));
    } catch (err) {
      lastErr = err;
      if (!shareTooBig(err)) {
        throw err;
      }
      cap = Math.floor(cap / 2);
    }
  }

  const stripped = shrinkMessages(only, 1000).map((message) => ({
    ...(message as object),
    images: [],
  }));
  if (canAttempt()) {
    try {
      const info = note(1);
      const result = await send(stripped, `${title} (最近 1/${total} 条，已截断)`, withPlan);
      console.warn(`[share-trim] shared 1/${total} without images`);
      return await remember(tagged(result, info, stripped));
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Share exceeds content limits");
}

export function clampAttempt(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(50, Math.max(1, n));
}
