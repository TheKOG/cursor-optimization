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

const MENU_RE =
  /(\w+)\(\{id:(\w+),label:"Share Transcript",enabled:!0,run:\(\)=>(\w+)\(\2\)\}\)\]:\[\],\1\(\{id:(\w+),label:"Copy Request ID"/g;

const EDITOR_RE =
  /\{command:\{id:(\w+),title:"Share Transcript",icon:(\w+)\.link\},group:"1_chatTools",order:2,when:([^}]+)\},\{command:\{id:(\w+),title:"Copy Request ID"\},group:"1_chatTools",order:3,when:([^}]+)\}/g;

const SHARE_HEAD_RE = /async shareConversation\((\w+),(\w+),(\w+)\)\{if\(!(\w+)\(\)\)/g;

const SHARE_SEND_RE =
  /(\w+)=await (\w+)\.shareConversation\(new (\w+)\(\{conversationId:([^,]+),title:(\w+),visibility:(\w+),messages:(\w+),latestPlan:(\w+)\}\)\)/g;

const FORK_RE = /async forkSharedConversation\((\w+),(\w+)\)\{if\(!(\w+)\(\)\)/g;

const ERROR_RE =
  /function (\w+)\((\w+)\)\{return \2 instanceof Error&&\2\.message==="No content to share"\?"Failed to share transcript\. Agent conversation is empty\.":(\w+)\(\2\)\?"This chat is too large to share\. Try sharing a shorter chat\.":"Failed to share transcript\. Try again later\."\}/g;

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
  const id = forkBody.match(/=(\w+)\(\);const \w+=this\.modelConfigService\.getModelConfig\("composer"\)/);
  const header = forkBody.match(/\{\.\.\.(\w+)\(\w+,\w+\),name:/);
  const workspace = forkBody.match(/workspaceIdentifier:(\w+)\(this\.workspaceContextService/);
  const bubble = forkBody.match(/\{\.\.\.(\w+)\(\),type:/);
  const uri = source.match(/folderUri:(\w+)\.file\(/);
  const buffer = source.match(/bufferOrReadableOrStream:(\w+)\.fromString\(/);
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

export function findShareCommand(source: string): ShareCommandSite | undefined {
  const classes = matchAll(
    source,
    /var (\w+)=class extends (\w+)\{constructor\(\)\{super\(\{id:(\w+),title:\{value:"Share Transcript",original:"Share Transcript"\}/g
  );
  if (classes.length !== 1) {
    return undefined;
  }
  const className = classes[0][1];
  const base = classes[0][2];
  const shareId = classes[0][3];
  const classAt = classes[0].index ?? 0;
  const decorateRe = new RegExp(
    `__decorate\\(\\[(\\w+)\\(${shareId}\\)\\],${className}\\.prototype,"run",null\\)`
  );
  const decorate = source.match(decorateRe);
  if (!decorate || decorate.index == null || decorate.index < classAt) {
    return undefined;
  }
  const runAt = source.indexOf("async run(", classAt);
  if (runAt < 0 || runAt > decorate.index) {
    return undefined;
  }
  const run = source.slice(runAt, runAt + 40).match(/^async run\((\w+),(\w+)\)\{/);
  if (!run) {
    return undefined;
  }
  const accessor = run[1];
  const arg = run[2];
  const body = source.slice(runAt, decorate.index);
  const resolver = body.match(
    new RegExp(`(\\w+)\\(${accessor},typeof ${arg}=="string"\\?${arg}:void 0\\)`)
  );
  if (!resolver) {
    return undefined;
  }
  let service: string | undefined;
  for (const got of body.matchAll(new RegExp(`const (\\w+)=${accessor}\\.get\\((\\w+)\\)`, "g"))) {
    if (body.includes(`${got[1]}.shareConversation`)) {
      service = got[2];
      break;
    }
  }
  if (!service) {
    return undefined;
  }
  const calls = matchAll(source, new RegExp(`(?:^|[^\\w$])(\\$?\\w+)\\(${className}\\)`, "g"));
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
    decorator: decorate[1],
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
  return `var __ShareTrimCacheCommand=class extends ${site.base}{constructor(){super({id:"composer.cacheTranscript",title:{value:"Cache Transcript",original:"Cache Transcript"},f1:!1})}async run(${site.accessor},${site.arg}){const __m=${site.resolver}(${site.accessor},typeof ${site.arg}=="string"?${site.arg}:void 0);const __id=__m&&__m.success&&typeof __m.composerId=="string"?__m.composerId:typeof ${site.arg}=="string"?${site.arg}:void 0;if(!__id)return;await ${site.accessor}.get(${site.service}).cacheTranscript(__id)}};__decorate([${site.decorator}("composer.cacheTranscript")],__ShareTrimCacheCommand.prototype,"run",null);var __ShareTrimForkCommand=class extends ${site.base}{constructor(){super({id:"shareImageMirror.forkCache",title:{value:"Fork Cached Transcript",original:"Fork Cached Transcript"},f1:!1})}async run(${site.accessor},${site.arg}){if(typeof ${site.arg}!="string"||!${site.arg})return;await ${site.accessor}.get(${site.service}).forkCachedTranscript(${site.arg})}};__decorate([${site.decorator}("shareImageMirror.forkCache")],__ShareTrimForkCommand.prototype,"run",null);`;
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
