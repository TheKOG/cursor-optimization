export type CacheSymbols = {
  uri: string;
  buffer: string;
  id: string;
  bubble: string;
  header: string;
  workspace: string;
};

export type MenuSite = {
  from: string;
  helper: string;
  shareId: string;
  run: string;
  copyId: string;
};

export type EditorMenuSite = {
  from: string;
  shareId: string;
  icon: string;
  shareWhen: string;
  copyId: string;
  copyWhen: string;
};

export type ShareSendSite = {
  result: string;
  client: string;
  ctor: string;
  conversationId: string;
  title: string;
  visibility: string;
  messages: string;
  plan: string;
};

export type ShareCommandSite = {
  className: string;
  base: string;
  shareId: string;
  decorator: string;
  decorateFn: string;
  register: string;
  accessor: string;
  arg: string;
  service: string;
  resolver: string;
  decorateFrom: string;
  registerFrom: string;
};

export type ForkSite = {
  from: string;
  index: number;
};

const ID = "[\\w$]+";

const MENU_RE = new RegExp(
  `(${ID})\\(\\{id:(${ID}),label:"Share Transcript",enabled:!0,run:\\(\\)=>(${ID})\\(\\2\\)\\}\\)\\]:\\[\\],\\1\\(\\{id:(${ID}),label:"Copy Request ID"`,
  "g"
);

const EDITOR_RE = new RegExp(
  `\\{command:\\{id:(${ID}),title:"Share Transcript",icon:(${ID})\\.link\\},group:"1_chatTools",order:2,when:([\\s\\S]*?)\\},\\{command:\\{id:(${ID}),title:"Copy Request ID"\\},group:"1_chatTools",order:3,when:([\\s\\S]*?)\\}`,
  "g"
);

const SHARE_HEAD_RE = new RegExp(
  `async shareConversation\\((${ID}),(${ID}),(${ID})\\)\\{if\\(!(${ID})\\(\\)\\)`,
  "g"
);

const SHARE_SEND_RE = new RegExp(
  `(${ID})=await (${ID})\\.shareConversation\\(new (${ID})\\(\\{conversationId:([^,]+),title:(${ID}),visibility:(${ID}),messages:(${ID}),latestPlan:(${ID})\\}\\)\\)`,
  "g"
);

const FORK_RE = new RegExp(`async forkSharedConversation\\((${ID}),(${ID})\\)\\{if\\(!(${ID})\\(\\)\\)`, "g");

const ERROR_RE = new RegExp(
  `function (${ID})\\((${ID})\\)\\{return \\2 instanceof Error&&\\2\\.message==="No content to share"\\?"Failed to share transcript\\. Agent conversation is empty\\.":(${ID})\\(\\2\\)\\?"This chat is too large to share\\. Try sharing a shorter chat\\.":"Failed to share transcript\\. Try again later\\."\\}`,
  "g"
);

export function matchAll(source: string, pattern: RegExp): RegExpMatchArray[] {
  return [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))];
}

export function findMenuSites(source: string): MenuSite[] {
  return matchAll(source, MENU_RE).map((match) => ({
    from: match[0],
    helper: match[1],
    shareId: match[2],
    run: match[3],
    copyId: match[4],
  }));
}

export function cacheMenuInsertion(site: MenuSite): string {
  const item =
    `(()=>{let __n="Cursor Optimization";try{let __fs;try{__fs=require("fs")}catch(e){__fs=process.mainModule.require("fs")}const __p=(process.env.USERPROFILE||process.env.HOME||"")+"/.cursor/share-image-mirror.json";const __j=JSON.parse(__fs.readFileSync(__p,"utf8"));if(__j.language==="en")__n="Cursor Optimization"}catch{if(globalThis.__cursorShareTrimLang==="en")__n="Cursor Optimization"}return ${site.helper}({id:"composer.cacheTranscript",label:"Cache Transcript ("+__n+")",enabled:!0,run:()=>${site.run}("composer.cacheTranscript")})})()`;
  return `${site.helper}({id:${site.shareId},label:"Share Transcript",enabled:!0,run:()=>${site.run}(${site.shareId})})]:[],${item},${site.helper}({id:${site.copyId},label:"Copy Request ID"`;
}

export function findEditorMenus(source: string): EditorMenuSite[] {
  return matchAll(source, EDITOR_RE).map((match) => ({
    from: match[0],
    shareId: match[1],
    icon: match[2],
    shareWhen: match[3],
    copyId: match[4],
    copyWhen: match[5],
  }));
}

export function findShareHeads(source: string): Array<{ guard: string; from: string }> {
  return matchAll(source, SHARE_HEAD_RE).map((match) => ({
    guard: match[4],
    from: match[0],
  }));
}

export function findShareSends(source: string): ShareSendSite[] {
  return matchAll(source, SHARE_SEND_RE).map((match) => ({
    result: match[1],
    client: match[2],
    ctor: match[3],
    conversationId: match[4],
    title: match[5],
    visibility: match[6],
    messages: match[7],
    plan: match[8],
  }));
}

export function findForkSites(source: string): ForkSite[] {
  return matchAll(source, FORK_RE).map((match) => ({
    from: match[0],
    index: match.index ?? 0,
  }));
}

export function findShareErrors(source: string): Array<{ name: string; param: string; tooBig: string; from: string }> {
  return matchAll(source, ERROR_RE).map((match) => ({
    name: match[1],
    param: match[2],
    tooBig: match[3],
    from: match[0],
  }));
}

export function discoverSymbols(source: string, forkIndex: number): CacheSymbols | undefined {
  const forkBody = source.slice(forkIndex, forkIndex + 4000);
  const id = forkBody.match(new RegExp(`=(${ID})\\(\\);const ${ID}=this\\.modelConfigService\\.getModelConfig\\("composer"\\)`));
  const header = forkBody.match(new RegExp(`\\{\\.\\.\\.(${ID})\\(${ID},${ID}\\),name:`));
  const workspace = forkBody.match(new RegExp(`workspaceIdentifier:(${ID})\\(this\\.workspaceContextService`));
  const bubble = forkBody.match(new RegExp(`\\{\\.\\.\\.(${ID})\\(\\),type:`));
  const uri = source.match(new RegExp(`folderUri:(${ID})\\.file\\(`));
  const buffer = source.match(new RegExp(`bufferOrReadableOrStream:(${ID})\\.fromString\\(`));
  if (!id || !header || !workspace || !bubble || !uri || !buffer) {
    return undefined;
  }
  return {
    uri: uri[1],
    buffer: buffer[1],
    id: id[1],
    bubble: bubble[1],
    header: header[1],
    workspace: workspace[1],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findShareCommand(source: string): ShareCommandSite | undefined {
  const classes = matchAll(
    source,
    new RegExp(
      `var (${ID})=class extends (${ID})\\{constructor\\(\\)\\{super\\(\\{id:(${ID}),title:\\{value:"Share Transcript",original:"Share Transcript"\\}`,
      "g"
    )
  );
  if (classes.length !== 1) {
    return undefined;
  }
  const className = classes[0][1];
  const base = classes[0][2];
  const shareId = classes[0][3];
  const classAt = classes[0].index ?? 0;
  const decorateRe = new RegExp(
    `(${ID})\\(\\[(${ID})\\(${escapeRegExp(shareId)}\\)\\],${escapeRegExp(className)}\\.prototype,"run",null\\)`
  );
  const decorate = source.match(decorateRe);
  if (!decorate || decorate.index == null || decorate.index < classAt) {
    return undefined;
  }
  const runAt = source.indexOf("async run(", classAt);
  if (runAt < 0 || runAt > decorate.index) {
    return undefined;
  }
  const run = source.slice(runAt, runAt + 80).match(new RegExp(`^async run\\((${ID}),(${ID})\\)\\{`));
  if (!run) {
    return undefined;
  }
  const accessor = run[1];
  const arg = run[2];
  const body = source.slice(runAt, decorate.index);
  const resolver = body.match(
    new RegExp(
      `(${ID})\\(${escapeRegExp(accessor)},typeof ${escapeRegExp(arg)}=="string"\\?${escapeRegExp(arg)}:void 0\\)`
    )
  );
  if (!resolver) {
    return undefined;
  }
  let service: string | undefined;
  for (const got of body.matchAll(
    new RegExp(`const (${ID})=${escapeRegExp(accessor)}\\.get\\((${ID})\\)`, "g")
  )) {
    if (body.includes(`${got[1]}.shareConversation`)) {
      service = got[2];
      break;
    }
  }
  if (!service) {
    return undefined;
  }
  const calls = matchAll(
    source,
    new RegExp(`(?:^|[^\\w$])(${ID})\\(${escapeRegExp(className)}\\)`, "g")
  );
  const registers = [...new Set(calls.map((match) => match[1]))];
  if (registers.length !== 1) {
    return undefined;
  }
  const registerFrom = `${registers[0]}(${className})`;
  if (countOf(source, registerFrom) !== 1 || countOf(source, decorate[0]) !== 1) {
    return undefined;
  }
  return {
    className,
    base,
    shareId,
    decorator: decorate[2],
    decorateFn: decorate[1],
    register: registers[0],
    accessor,
    arg,
    service,
    resolver: resolver[1],
    decorateFrom: decorate[0],
    registerFrom,
  };
}

export function shareCommandBlock(site: ShareCommandSite): string {
  const decorate = (id: string) =>
    `${site.decorateFn}([${site.decorator}("${id}")],`;
  return `var __ShareTrimCacheCommand=class extends ${site.base}{constructor(){super({id:"composer.cacheTranscript",title:{value:"Cache Transcript",original:"Cache Transcript"},f1:!1})}async run(${site.accessor},${site.arg}){const __m=${site.resolver}(${site.accessor},typeof ${site.arg}=="string"?${site.arg}:void 0);const __id=__m&&__m.success&&typeof __m.composerId=="string"?__m.composerId:typeof ${site.arg}=="string"?${site.arg}:void 0;if(!__id)return;await ${site.accessor}.get(${site.service}).cacheTranscript(__id)}};${decorate("composer.cacheTranscript")}__ShareTrimCacheCommand.prototype,"run",null);var __ShareTrimForkCommand=class extends ${site.base}{constructor(){super({id:"shareImageMirror.forkCache",title:{value:"Fork Cached Transcript",original:"Fork Cached Transcript"},f1:!1})}async run(${site.accessor},${site.arg}){if(typeof ${site.arg}!="string"||!${site.arg})return;await ${site.accessor}.get(${site.service}).forkCachedTranscript(${site.arg})}};${decorate("shareImageMirror.forkCache")}__ShareTrimForkCommand.prototype,"run",null);`;
}

function countOf(source: string, needle: string): number {
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}
