var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// _shared/liveops.js
var ACTIVITY_KINDS = ["combat", "gathering", "processing", "crafting", "fishing", "hunting", "alchemy", "delivery"];
var CHALLENGES = ["routine", "demanding", "elite", "boss"];
var CATEGORIES = ["combat", "skilling"];
var REWARD_TIERS = ["participation", "milestone", "prestige"];
var REWARD_BANDS = ["qualified", "top25Percent", "top10Percent", "top100", "top10"];
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonicalize(v)]));
  }
  return value;
}
__name(canonicalize, "canonicalize");
async function hashDefinition(definition) {
  const encoded = new TextEncoder().encode(JSON.stringify(canonicalize(definition)));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashDefinition, "hashDefinition");
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
__name(isFiniteNumber, "isFiniteNumber");
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
__name(asArray, "asArray");
function trimArray(values) {
  return asArray(values).filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean);
}
__name(trimArray, "trimArray");
function normalizeDefinition(input) {
  const definition = structuredClone(input ?? {});
  definition.id = String(definition.id ?? "").trim();
  definition.version = Number(definition.version ?? 1);
  definition.scope = "party";
  definition.name = String(definition.name ?? "").trim();
  definition.shortDescription = String(definition.shortDescription ?? "").trim();
  definition.durationHours = Number(definition.durationHours ?? 48);
  definition.eventTags = trimArray(definition.eventTags);
  definition.contributionRules ??= {};
  definition.contributionRules.allowedCategories = [...new Set(trimArray(definition.contributionRules.allowedCategories))];
  definition.contributionRules.allowedActivityKinds = [...new Set(trimArray(definition.contributionRules.allowedActivityKinds))];
  definition.contributionRules.allowedRegionIds = [...new Set(trimArray(definition.contributionRules.allowedRegionIds))];
  definition.contributionRules.requiredAnyTags = [...new Set(trimArray(definition.contributionRules.requiredAnyTags))];
  definition.contributionRules.dailyAccountCreditCap = Number(definition.contributionRules.dailyAccountCreditCap ?? 2400);
  definition.contributionRules.activityMultipliers ??= {};
  definition.contributionRules.challengeMultipliers ??= {};
  definition.contributionRules.minimumCategoryFraction ??= {};
  definition.personalMilestones = asArray(definition.personalMilestones).map((m) => ({
    points: Number(m?.points ?? 0),
    reward: { bundleId: String(m?.reward?.bundleId ?? "").trim(), tier: String(m?.reward?.tier ?? "milestone") }
  }));
  definition.partyMilestones = asArray(definition.partyMilestones).map((m) => ({
    points: Number(m?.points ?? 0),
    reward: { bundleId: String(m?.reward?.bundleId ?? "").trim(), tier: String(m?.reward?.tier ?? "milestone") }
  }));
  definition.personalPartyRewardEligibilityPoints = Number(definition.personalPartyRewardEligibilityPoints ?? 250);
  definition.rankedMinimumPartyPoints = Number(definition.rankedMinimumPartyPoints ?? 4e3);
  definition.rankedMinimumMeaningfulContributors = Number(definition.rankedMinimumMeaningfulContributors ?? 2);
  definition.meaningfulContributorPoints = Number(definition.meaningfulContributorPoints ?? 250);
  definition.partyBindingLockPoints = Number(definition.partyBindingLockPoints ?? 250);
  definition.rankingRewards ??= {};
  for (const band of REWARD_BANDS) {
    const reward = definition.rankingRewards[band];
    if (reward) definition.rankingRewards[band] = { bundleId: String(reward.bundleId ?? "").trim(), tier: String(reward.tier ?? (band === "qualified" ? "participation" : "prestige")) };
  }
  return definition;
}
__name(normalizeDefinition, "normalizeDefinition");
function validateDefinition(input) {
  const d = normalizeDefinition(input);
  const errors = [];
  const warnings = [];
  if (!/^[a-z0-9][a-z0-9_]{2,79}$/.test(d.id)) errors.push("Event ID must be 3\u201380 lowercase letters, numbers or underscores.");
  if (!Number.isInteger(d.version) || d.version < 1 || d.version > 9999) errors.push("Version must be a positive integer.");
  if (d.name.length < 3 || d.name.length > 80) errors.push("Name must be 3\u201380 characters.");
  if (d.shortDescription.length < 10 || d.shortDescription.length > 240) errors.push("Short description must be 10\u2013240 characters.");
  if (!isFiniteNumber(d.durationHours) || d.durationHours < 24 || d.durationHours > 72) errors.push("Duration must be between 24 and 72 hours.");
  if (d.contributionRules.allowedCategories.length === 0) errors.push("At least one contribution category is required.");
  for (const category of d.contributionRules.allowedCategories) if (!CATEGORIES.includes(category)) errors.push(`Unknown category: ${category}`);
  for (const kind of d.contributionRules.allowedActivityKinds) if (!ACTIVITY_KINDS.includes(kind)) errors.push(`Unknown activity kind: ${kind}`);
  if (!Number.isInteger(d.contributionRules.dailyAccountCreditCap) || d.contributionRules.dailyAccountCreditCap < 100 || d.contributionRules.dailyAccountCreditCap > 1e4) errors.push("Daily account credit cap must be an integer between 100 and 10,000.");
  for (const [kind, multiplier] of Object.entries(d.contributionRules.activityMultipliers ?? {})) {
    if (!ACTIVITY_KINDS.includes(kind)) errors.push(`Unknown activity multiplier kind: ${kind}`);
    if (!isFiniteNumber(multiplier) || multiplier < 0.5 || multiplier > 1.5) errors.push(`Activity multiplier for ${kind} must be 0.50\u20131.50.`);
  }
  for (const [challenge, multiplier] of Object.entries(d.contributionRules.challengeMultipliers ?? {})) {
    if (!CHALLENGES.includes(challenge)) errors.push(`Unknown challenge multiplier: ${challenge}`);
    if (!isFiniteNumber(multiplier) || multiplier < 0.75 || multiplier > 1.5) errors.push(`Challenge multiplier for ${challenge} must be 0.75\u20131.50.`);
  }
  let requiredFraction = 0;
  for (const [category, fraction] of Object.entries(d.contributionRules.minimumCategoryFraction ?? {})) {
    if (!CATEGORIES.includes(category)) errors.push(`Unknown minimum category fraction: ${category}`);
    if (!isFiniteNumber(fraction) || fraction < 0 || fraction > 0.8) errors.push(`Minimum fraction for ${category} must be 0.00\u20130.80.`);
    else requiredFraction += fraction;
  }
  if (requiredFraction > 1) errors.push("Minimum category fractions cannot total more than 100%.");
  const validateMilestones = /* @__PURE__ */ __name((label, milestones) => {
    if (!milestones.length) warnings.push(`${label} milestones are empty.`);
    if (milestones.length > 12) errors.push(`${label} milestones are limited to 12.`);
    let previous = 0;
    for (const m of milestones) {
      if (!Number.isInteger(m.points) || m.points <= previous) errors.push(`${label} milestone points must be positive and strictly increasing.`);
      if (!m.reward.bundleId) errors.push(`${label} milestone ${m.points || "?"} needs a reward bundle.`);
      if (!REWARD_TIERS.includes(m.reward.tier)) errors.push(`${label} milestone ${m.points || "?"} has an invalid reward tier.`);
      previous = m.points;
    }
  }, "validateMilestones");
  validateMilestones("Personal", d.personalMilestones);
  validateMilestones("Party", d.partyMilestones);
  const integerFields = [
    ["Personal party reward eligibility", d.personalPartyRewardEligibilityPoints, 1, 1e4],
    ["Ranked minimum party points", d.rankedMinimumPartyPoints, 1, 1e6],
    ["Ranked minimum meaningful contributors", d.rankedMinimumMeaningfulContributors, 2, 4],
    ["Meaningful contributor points", d.meaningfulContributorPoints, 1, 1e4],
    ["Party binding lock points", d.partyBindingLockPoints, 1, 1e4]
  ];
  for (const [label, value, min, max] of integerFields) if (!Number.isInteger(value) || value < min || value > max) errors.push(`${label} must be an integer between ${min} and ${max}.`);
  if (d.partyBindingLockPoints < d.meaningfulContributorPoints) errors.push("Party binding lock points cannot be below meaningful contributor points.");
  if (d.personalPartyRewardEligibilityPoints > d.partyBindingLockPoints * 4) warnings.push("Personal party eligibility is unusually high relative to binding lock points.");
  if (!d.rankingRewards.qualified?.bundleId) errors.push("Qualified ranking reward is required.");
  for (const [band, reward] of Object.entries(d.rankingRewards ?? {})) {
    if (!REWARD_BANDS.includes(band)) errors.push(`Unknown ranking reward band: ${band}`);
    if (!reward?.bundleId) errors.push(`Ranking reward ${band} needs a bundle ID.`);
    if (reward && !REWARD_TIERS.includes(reward.tier)) errors.push(`Ranking reward ${band} has an invalid tier.`);
  }
  if (d.rankedMinimumPartyPoints < d.partyMilestones[0]?.points) warnings.push("Rank qualification is below the first Party milestone.");
  if (d.durationHours === 24 && d.partyMilestones.at(-1)?.points > d.contributionRules.dailyAccountCreditCap * 4) warnings.push("Final Party milestone may require near-cap contribution from all four members in a 24-hour event.");
  if (!d.eventTags.length) warnings.push("No event tags are configured; LFG soft matching will be weaker.");
  return { definition: d, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
__name(validateDefinition, "validateDefinition");
function collectRewardBundleIds(definition) {
  const d = normalizeDefinition(definition);
  const ids = /* @__PURE__ */ new Set();
  for (const m of [...d.personalMilestones, ...d.partyMilestones]) if (m.reward?.bundleId) ids.add(m.reward.bundleId);
  for (const reward of Object.values(d.rankingRewards ?? {})) if (reward?.bundleId) ids.add(reward.bundleId);
  return [...ids];
}
__name(collectRewardBundleIds, "collectRewardBundleIds");
function scheduleValidation(definition, startsAt, endsAt, graceMinutes) {
  const errors = [];
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push("Start and end timestamps are required.");
  const hours = (end - start) / 36e5;
  if (Number.isFinite(hours) && (hours < 24 || hours > 72)) errors.push("Scheduled duration must be 24\u201372 hours.");
  if (!Number.isInteger(graceMinutes) || graceMinutes < 5 || graceMinutes > 30) errors.push("Settlement grace must be 5\u201330 minutes.");
  const defHours = Number(definition?.durationHours ?? 0);
  if (Number.isFinite(hours) && Math.abs(hours - defHours) > 0.01) {
  }
  return errors;
}
__name(scheduleValidation, "scheduleValidation");

// _shared/operations.js
var REMOTE_VALUE_TYPES = ["boolean", "integer", "number", "string", "json"];
var REMOTE_RISK_TIERS = ["low", "medium", "critical"];
function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
__name(finiteNumber, "finiteNumber");
function validateRemoteConfig(input) {
  const row = { ...input };
  const errors = [];
  const key = String(row.config_key ?? row.configKey ?? "").trim();
  const valueType = String(row.value_type ?? row.valueType ?? "json");
  const riskTier = String(row.risk_tier ?? row.riskTier ?? "medium");
  const rolloutPercent = finiteNumber(row.rollout_percent ?? row.rolloutPercent ?? 100);
  if (!/^[a-z][a-z0-9_.:-]{2,119}$/.test(key)) errors.push("Config key must be 3\u2013120 lowercase identifier characters.");
  if (!REMOTE_VALUE_TYPES.includes(valueType)) errors.push("Unsupported remote-config value type.");
  if (!REMOTE_RISK_TIERS.includes(riskTier)) errors.push("Unsupported remote-config risk tier.");
  if (rolloutPercent === null || rolloutPercent < 0 || rolloutPercent > 100) errors.push("Rollout percent must be between 0 and 100.");
  const value = row.current_value ?? row.currentValue;
  if (valueType === "boolean" && typeof value !== "boolean") errors.push("Boolean config requires true/false.");
  if (valueType === "integer" && (!Number.isInteger(Number(value)) || !Number.isFinite(Number(value)))) errors.push("Integer config requires a whole number.");
  if (valueType === "number" && finiteNumber(value) === null) errors.push("Number config requires a finite number.");
  if (valueType === "string" && typeof value !== "string") errors.push("String config requires text.");
  const constraints = row.constraints_json ?? row.constraintsJson ?? {};
  const numeric = finiteNumber(value);
  if (numeric !== null) {
    if (constraints.min !== void 0 && numeric < Number(constraints.min)) errors.push(`Value is below minimum ${constraints.min}.`);
    if (constraints.max !== void 0 && numeric > Number(constraints.max)) errors.push(`Value is above maximum ${constraints.max}.`);
  }
  if (valueType === "string" && constraints.maxLength && String(value).length > Number(constraints.maxLength)) errors.push(`Text exceeds maximum length ${constraints.maxLength}.`);
  if (constraints.enum && !constraints.enum.includes(value)) errors.push("Value is not in the allowed set.");
  const from = row.active_from ?? row.activeFrom;
  const until = row.active_until ?? row.activeUntil;
  if (from && Number.isNaN(Date.parse(from))) errors.push("Active-from timestamp is invalid.");
  if (until && Number.isNaN(Date.parse(until))) errors.push("Active-until timestamp is invalid.");
  if (from && until && Date.parse(from) >= Date.parse(until)) errors.push("Active-until must be after active-from.");
  return { errors, normalized: { ...row, config_key: key, value_type: valueType, risk_tier: riskTier, rollout_percent: rolloutPercent ?? 100 } };
}
__name(validateRemoteConfig, "validateRemoteConfig");

// _shared/admin-control.js
var ADMIN_RISK_TIERS = ["low", "medium", "high", "critical"];
var ADMIN_FIELD_TYPES = ["text", "textarea", "integer", "number", "boolean", "datetime", "uuid", "select", "catalog", "catalog_multi", "json"];
function roleRank(role) {
  return { viewer: 1, editor: 2, owner: 3 }[role] || 0;
}
__name(roleRank, "roleRank");
function confirmationPhrase(commandKey) {
  return `EXECUTE ${String(commandKey || "").trim()}`;
}
__name(confirmationPhrase, "confirmationPhrase");
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
__name(isUuid, "isUuid");
function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
__name(finite, "finite");
function cleanString(value, max = 4e3) {
  return String(value ?? "").trim().slice(0, max);
}
__name(cleanString, "cleanString");
function validateField(field, raw) {
  const errors = [];
  const type = String(field?.type || "text");
  const name = String(field?.name || "field");
  if (!ADMIN_FIELD_TYPES.includes(type)) return { errors: [`${name}: unsupported field type`], value: null };
  const empty = raw === void 0 || raw === null || raw === "";
  if (empty) {
    if (field.required) errors.push(`${name}: required`);
    return { errors, value: field.default ?? null };
  }
  let value = raw;
  if (type === "integer") {
    const n = Number(raw);
    if (!Number.isInteger(n)) errors.push(`${name}: whole number required`);
    else value = n;
  } else if (type === "number") {
    const n = finite(raw);
    if (n === null) errors.push(`${name}: finite number required`);
    else value = n;
  } else if (type === "boolean") {
    if (typeof raw === "boolean") value = raw;
    else if (["true", "false"].includes(String(raw).toLowerCase())) value = String(raw).toLowerCase() === "true";
    else errors.push(`${name}: true/false required`);
  } else if (type === "uuid") {
    value = cleanString(raw, 80);
    if (!isUuid(value)) errors.push(`${name}: UUID required`);
  } else if (type === "datetime") {
    value = cleanString(raw, 80);
    if (Number.isNaN(Date.parse(value))) errors.push(`${name}: valid date/time required`);
    else value = new Date(value).toISOString();
  } else if (type === "select") {
    value = cleanString(raw, 200);
    const allowed = (field.options || []).map((x) => typeof x === "string" ? x : x.value);
    if (!allowed.includes(value)) errors.push(`${name}: unsupported option`);
  } else if (type === "catalog") {
    value = cleanString(raw, 160);
    if (!/^[A-Za-z0-9_.:\-]{1,160}$/.test(value)) errors.push(`${name}: invalid catalog key`);
  } else if (type === "catalog_multi") {
    const source = Array.isArray(raw) ? raw : String(raw).split(",");
    value = [...new Set(source.map((v) => cleanString(v, 160)).filter(Boolean))].slice(0, 100);
    if (field.required && !value.length) errors.push(`${name}: at least one catalog value required`);
    for (const item of value) if (!/^[A-Za-z0-9_.:\-]{1,160}$/.test(item)) errors.push(`${name}: invalid catalog key ${item}`);
  } else if (type === "json") {
    if (typeof raw === "object" && raw !== null) value = raw;
    else {
      const text = cleanString(raw, Number(field.maxLength || 12e3));
      try {
        value = JSON.parse(text);
      } catch {
        errors.push(`${name}: valid JSON required`);
        value = null;
      }
    }
    if (value !== null && field.objectOnly && (Array.isArray(value) || typeof value !== "object")) errors.push(`${name}: JSON object required`);
  } else {
    value = cleanString(raw, Number(field.maxLength || (type === "textarea" ? 4e3 : 500)));
    if (field.minLength && value.length < Number(field.minLength)) errors.push(`${name}: minimum length ${field.minLength}`);
  }
  if (["integer", "number"].includes(type) && typeof value === "number") {
    if (field.min !== void 0 && value < Number(field.min)) errors.push(`${name}: minimum ${field.min}`);
    if (field.max !== void 0 && value > Number(field.max)) errors.push(`${name}: maximum ${field.max}`);
  }
  return { errors, value };
}
__name(validateField, "validateField");
function validateCommandParameters(schema, input) {
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const normalized = {};
  const errors = [];
  const allowed = new Set(fields.map((f) => String(f.name)));
  for (const field of fields) {
    const name = String(field.name || "");
    if (!name) {
      errors.push("schema field missing name");
      continue;
    }
    const result = validateField(field, input?.[name]);
    errors.push(...result.errors);
    normalized[name] = result.value;
  }
  for (const key of Object.keys(input || {})) if (!allowed.has(key)) errors.push(`${key}: unknown parameter`);
  return { errors, parameters: normalized };
}
__name(validateCommandParameters, "validateCommandParameters");
function validateCommandRequest(registry, actorRole, payload, { dualApprovalCritical = false } = {}) {
  const errors = [];
  if (!registry || registry.enabled === false) errors.push("command unavailable");
  if (roleRank(actorRole) < roleRank(registry?.min_role || "owner")) errors.push("insufficient admin role");
  const risk = String(registry?.risk_tier || "high");
  if (!ADMIN_RISK_TIERS.includes(risk)) errors.push("invalid command risk tier");
  const targetAccountId = payload?.targetAccountId ? String(payload.targetAccountId) : null;
  const targetCharacterId = payload?.targetCharacterId ? String(payload.targetCharacterId) : null;
  if (registry?.target_scope === "account" && !isUuid(targetAccountId)) errors.push("target account UUID required");
  if (registry?.target_scope === "character" && !isUuid(targetCharacterId)) errors.push("target character UUID required");
  if (registry?.target_scope === "account_or_character" && !isUuid(targetAccountId) && !isUuid(targetCharacterId)) errors.push("account or character target required");
  const p = validateCommandParameters(registry?.params_schema || {}, payload?.parameters || {});
  errors.push(...p.errors);
  const reason = cleanString(payload?.reason, 1e3);
  const minReason = risk === "critical" ? 20 : risk === "high" ? 15 : 10;
  if (reason.length < minReason) errors.push(`reason must be at least ${minReason} characters`);
  if (["high", "critical"].includes(risk)) {
    const expected = confirmationPhrase(registry.command_key);
    if (String(payload?.confirmation || "").trim() !== expected) errors.push(`confirmation must exactly match: ${expected}`);
  }
  const requiresApproval = Boolean(registry?.requires_approval) || risk === "critical" && dualApprovalCritical;
  return { errors, normalized: { targetAccountId, targetCharacterId, targetRef: cleanString(payload?.targetRef, 200) || null, parameters: p.parameters, reason, confirmation: cleanString(payload?.confirmation, 200), requiresApproval, riskTier: risk } };
}
__name(validateCommandRequest, "validateCommandRequest");
function commandStatusAfterQueue(registry, { dualApprovalCritical = false } = {}) {
  const risk = String(registry?.risk_tier || "high");
  return Boolean(registry?.requires_approval) || risk === "critical" && dualApprovalCritical ? "pending_approval" : "approved";
}
__name(commandStatusAfterQueue, "commandStatusAfterQueue");
function canReverse(command) {
  return Boolean(command?.reversible && command?.status === "succeeded" && command?.result_json?.reversal?.commandKey && command?.result_json?.reversal?.parameters);
}
__name(canReverse, "canReverse");

// _shared/redeem-codes.js
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function normalizeRedeemCode(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 48);
}
__name(normalizeRedeemCode, "normalizeRedeemCode");
function validateRedeemCode(value) {
  const code = normalizeRedeemCode(value);
  const errors = [];
  if (code.length < 12) errors.push("Redeem code must contain at least 12 letters/numbers.");
  if (code.length > 40) errors.push("Redeem code must contain at most 40 letters/numbers.");
  return { code, errors };
}
__name(validateRedeemCode, "validateRedeemCode");
function generateRedeemCode(prefix = "VELD") {
  const cleanPrefix = normalizeRedeemCode(prefix).slice(0, 8) || "VELD";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const b of bytes) body += ALPHABET[b % ALPHABET.length];
  const raw = `${cleanPrefix}${body}`;
  const groups = raw.match(/.{1,4}/g) || [raw];
  return groups.join("-");
}
__name(generateRedeemCode, "generateRedeemCode");
async function hashRedeemCode(value) {
  const { code, errors } = validateRedeemCode(value);
  if (errors.length) throw new Error(errors.join(" "));
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashRedeemCode, "hashRedeemCode");
function redeemCodeHint(value) {
  const code = normalizeRedeemCode(value);
  if (code.length < 8) return "\u2022\u2022\u2022\u2022";
  return `${code.slice(0, 4)}\u2026${code.slice(-4)}`;
}
__name(redeemCodeHint, "redeemCodeHint");

// api/admin.js
var ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };
var MUTATING_ACTIONS = /* @__PURE__ */ new Set([
  "saveDraft",
  "deleteDraft",
  "saveTemplate",
  "disableTemplate",
  "cloneTemplateToDraft",
  "cloneDefinitionToDraft",
  "publishDraft",
  "scheduleDefinition",
  "rescheduleInstance",
  "cancelInstance",
  "archiveInstance",
  "saveReward",
  "retryDeadLetter",
  "saveRemoteConfig",
  "updateAlert",
  "saveResetDefinition",
  "retryResetRun",
  "createSupportCase",
  "updateSupportCase",
  "addSupportNote",
  "queueAdminCommand",
  "approveAdminCommand",
  "cancelAdminCommand",
  "retryAdminCommand",
  "reverseAdminCommand",
  "saveAnnouncement",
  "cancelAnnouncement",
  "saveAdminUser",
  "createRedeemCode",
  "setRedeemCodeEnabled"
]);
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer"
    }
  });
}
__name(json, "json");
function envConfig(env2) {
  const config2 = {
    url: String(env2.SUPABASE_URL ?? "").replace(/\/$/, ""),
    anon: String(env2.SUPABASE_ANON_KEY ?? ""),
    service: String(env2.SUPABASE_SERVICE_ROLE_KEY ?? "")
  };
  if (!config2.url || !config2.anon || !config2.service) throw new Error("server_not_configured");
  return config2;
}
__name(envConfig, "envConfig");
function assertOrigin(request, env2) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  const configured = String(env2.CONTROL_ALLOWED_ORIGIN ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (origin === requestOrigin || configured.includes(origin)) return;
  throw new Error("origin_not_allowed");
}
__name(assertOrigin, "assertOrigin");
async function supabaseFetch(env2, path, { method = "GET", body, query = "", headers = {}, prefer = "" } = {}) {
  const cfg = envConfig(env2);
  const url = `${cfg.url}${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: cfg.service,
      authorization: `Bearer ${cfg.service}`,
      "content-type": "application/json",
      ...prefer ? { prefer } : {},
      ...headers
    },
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  if (!response.ok) {
    const text2 = await response.text();
    const error3 = new Error(`supabase_${response.status}:${text2.slice(0, 800)}`);
    error3.status = response.status;
    throw error3;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
__name(supabaseFetch, "supabaseFetch");
async function verifyUser(request, env2) {
  const cfg = envConfig(env2);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("authentication_required");
  const response = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: { apikey: cfg.anon, authorization }
  });
  if (!response.ok) throw new Error("invalid_session");
  const user = await response.json();
  if (!user?.id) throw new Error("invalid_session");
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_admin_users", {
    query: `select=account_id,role,display_name,enabled&account_id=eq.${encodeURIComponent(user.id)}&enabled=eq.true&limit=1`
  });
  const admin = rows?.[0];
  if (!admin) throw new Error("admin_access_required");
  return { user, admin };
}
__name(verifyUser, "verifyUser");
function requireRole(actor, role) {
  if ((ROLE_RANK[actor.admin.role] ?? 0) < ROLE_RANK[role]) throw new Error("insufficient_admin_role");
}
__name(requireRole, "requireRole");
async function audit(env2, actor, action, targetType, targetId, detail = {}) {
  await supabaseFetch(env2, "/rest/v1/liveops_admin_audit_log", {
    method: "POST",
    body: {
      actor_account_id: actor.user.id,
      actor_email: actor.user.email ?? null,
      actor_role: actor.admin.role,
      action,
      target_type: targetType,
      target_id: String(targetId ?? ""),
      detail_json: detail
    },
    prefer: "return=minimal"
  });
}
__name(audit, "audit");
function encodeEq(value) {
  return encodeURIComponent(String(value));
}
__name(encodeEq, "encodeEq");
async function single(env2, table3, filters, select = "*") {
  const rows = await supabaseFetch(env2, `/rest/v1/${table3}`, { query: `select=${encodeURIComponent(select)}&${filters}&limit=1` });
  return rows?.[0] ?? null;
}
__name(single, "single");
async function list(env2, table3, query) {
  return await supabaseFetch(env2, `/rest/v1/${table3}`, { query });
}
__name(list, "list");
async function optionalList(env2, table3, query, warnings, label = table3) {
  try {
    return await list(env2, table3, query) ?? [];
  } catch (error3) {
    warnings?.push(`${label}: ${error3 instanceof Error ? error3.message : String(error3)}`);
    return [];
  }
}
__name(optionalList, "optionalList");
async function countRows(env2, table3, filters = "") {
  const cfg = envConfig(env2);
  const query = `select=*${filters ? `&${filters}` : ""}&limit=1`;
  const response = await fetch(`${cfg.url}/rest/v1/${table3}?${query}`, {
    headers: { apikey: cfg.service, authorization: `Bearer ${cfg.service}`, prefer: "count=exact" }
  });
  if (!response.ok) throw new Error(`count_failed:${table3}`);
  const range = response.headers.get("content-range") ?? "0/0";
  return Number(range.split("/")[1] ?? 0) || 0;
}
__name(countRows, "countRows");
async function loadRewardValidation(env2, definition) {
  const ids = collectRewardBundleIds(definition);
  if (!ids.length) return { missing: [], unvalidated: [], disabled: [] };
  const query = `select=bundle_id,enabled,validated,label,tier&bundle_id=in.(${ids.map((id) => `"${id.replaceAll('"', "")}"`).join(",")})`;
  const rows = await list(env2, "liveops_admin_reward_catalog", query);
  const byId = new Map((rows ?? []).map((row) => [row.bundle_id, row]));
  return {
    missing: ids.filter((id) => !byId.has(id)),
    unvalidated: ids.filter((id) => byId.has(id) && !byId.get(id).validated),
    disabled: ids.filter((id) => byId.has(id) && !byId.get(id).enabled)
  };
}
__name(loadRewardValidation, "loadRewardValidation");
async function dashboard(env2) {
  const [instances, drafts, audits, draftCount, healthRows, deadLetterCount] = await Promise.all([
    list(env2, "liveops_event_instances", "select=id,event_id,definition_version,starts_at,ends_at,status,definition_snapshot&status=in.(scheduled,active,settling)&order=starts_at.asc&limit=40"),
    list(env2, "liveops_event_drafts", "select=id,name,status,updated_at,definition_json&status=eq.draft&order=updated_at.desc&limit=10"),
    list(env2, "liveops_admin_audit_log", "select=id,actor_email,action,target_type,target_id,created_at&order=created_at.desc&limit=10"),
    countRows(env2, "liveops_event_drafts", "status=eq.draft"),
    list(env2, "liveops_runtime_health", "select=*&component=eq.party_liveops_worker&limit=1"),
    countRows(env2, "social_contribution_outbox", "status=eq.dead_letter")
  ]);
  const nowMs = Date.now();
  const active = (instances ?? []).filter((row) => row.status === "active" || row.status === "scheduled" && Date.parse(row.starts_at) <= nowMs && Date.parse(row.ends_at) > nowMs);
  const scheduled = (instances ?? []).filter((row) => row.status === "scheduled" && Date.parse(row.starts_at) > nowMs);
  const settling = (instances ?? []).filter((row) => row.status === "settling");
  return {
    counts: { active: active.length, scheduled: scheduled.length, settling: settling.length, drafts: draftCount, deadLetters: deadLetterCount },
    active: active[0] ?? null,
    next: scheduled[0] ?? null,
    workerHealth: healthRows?.[0] ?? null,
    drafts: drafts ?? [],
    audits: audits ?? []
  };
}
__name(dashboard, "dashboard");
async function saveDraft(env2, actor, payload) {
  requireRole(actor, "editor");
  const definition = normalizeDefinition(payload.definition);
  const schedule = payload.schedule && typeof payload.schedule === "object" ? payload.schedule : {};
  const name = String(payload.name || definition.name || "Untitled event").trim().slice(0, 120);
  const existing = payload.id ? await single(env2, "liveops_event_drafts", `id=eq.${encodeEq(payload.id)}`) : null;
  let row;
  if (existing) {
    const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_drafts", {
      method: "PATCH",
      query: `id=eq.${encodeEq(payload.id)}`,
      body: { name, definition_json: definition, schedule_json: schedule, status: "draft", updated_by: actor.user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
      prefer: "return=representation"
    });
    row = rows?.[0];
  } else {
    const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_drafts", {
      method: "POST",
      body: { name, definition_json: definition, schedule_json: schedule, status: "draft", created_by: actor.user.id, updated_by: actor.user.id },
      prefer: "return=representation"
    });
    row = rows?.[0];
  }
  await audit(env2, actor, existing ? "draft.update" : "draft.create", "event_draft", row?.id, { name, eventId: definition.id, version: definition.version });
  return row;
}
__name(saveDraft, "saveDraft");
async function deleteDraft(env2, actor, payload) {
  requireRole(actor, "editor");
  const draft = await single(env2, "liveops_event_drafts", `id=eq.${encodeEq(payload.id)}`);
  if (!draft) throw new Error("draft_not_found");
  await supabaseFetch(env2, "/rest/v1/liveops_event_drafts", { method: "DELETE", query: `id=eq.${encodeEq(payload.id)}`, prefer: "return=minimal" });
  await audit(env2, actor, "draft.delete", "event_draft", payload.id, { name: draft.name });
  return { deleted: true };
}
__name(deleteDraft, "deleteDraft");
async function saveTemplate(env2, actor, payload) {
  requireRole(actor, "editor");
  const result = validateDefinition(payload.definition);
  if (result.errors.length) return { saved: false, validation: result };
  const templateId = String(payload.templateId || result.definition.id).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 80);
  const body = {
    template_id: templateId,
    name: String(payload.name || result.definition.name).slice(0, 120),
    description: String(payload.description || result.definition.shortDescription).slice(0, 300),
    definition_json: result.definition,
    enabled: payload.enabled !== false,
    source: "admin",
    updated_by: actor.user.id,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_admin_templates", { method: "POST", body, query: "on_conflict=template_id", prefer: "resolution=merge-duplicates,return=representation" });
  await audit(env2, actor, "template.save", "event_template", templateId, { name: body.name });
  return { saved: true, template: rows?.[0], validation: result };
}
__name(saveTemplate, "saveTemplate");
async function cloneToDraft(env2, actor, definition, name, source) {
  requireRole(actor, "editor");
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_drafts", {
    method: "POST",
    body: { name, definition_json: normalizeDefinition(definition), schedule_json: {}, status: "draft", created_by: actor.user.id, updated_by: actor.user.id },
    prefer: "return=representation"
  });
  const row = rows?.[0];
  await audit(env2, actor, "draft.clone", "event_draft", row?.id, { source });
  return row;
}
__name(cloneToDraft, "cloneToDraft");
async function publishDraft(env2, actor, payload) {
  requireRole(actor, "editor");
  const draft = await single(env2, "liveops_event_drafts", `id=eq.${encodeEq(payload.id)}`);
  if (!draft) throw new Error("draft_not_found");
  const validation = validateDefinition(draft.definition_json);
  if (validation.errors.length) return { published: false, validation };
  const rewardValidation = await loadRewardValidation(env2, validation.definition);
  if (rewardValidation.missing.length || rewardValidation.unvalidated.length || rewardValidation.disabled.length) {
    return { published: false, validation, rewardValidation, error: "reward_catalog_not_ready" };
  }
  const hash = await hashDefinition(validation.definition);
  const existing = await single(env2, "liveops_event_definitions", `event_id=eq.${encodeEq(validation.definition.id)}&version=eq.${validation.definition.version}`);
  let inserted = false;
  if (existing) {
    if (existing.config_hash !== hash) throw new Error("event_definition_version_conflict");
  } else {
    await supabaseFetch(env2, "/rest/v1/liveops_event_definitions", {
      method: "POST",
      body: { event_id: validation.definition.id, version: validation.definition.version, scope: "party", definition_json: validation.definition, config_hash: hash, created_by: actor.user.id },
      prefer: "return=minimal"
    });
    inserted = true;
  }
  await supabaseFetch(env2, "/rest/v1/liveops_event_drafts", {
    method: "PATCH",
    query: `id=eq.${encodeEq(payload.id)}`,
    body: { status: "published", published_event_id: validation.definition.id, published_version: validation.definition.version, updated_by: actor.user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
    prefer: "return=minimal"
  });
  await audit(env2, actor, "definition.publish", "event_definition", `${validation.definition.id}@${validation.definition.version}`, { draftId: payload.id, hash, inserted });
  return { published: true, inserted, configHash: hash, validation, rewardValidation };
}
__name(publishDraft, "publishDraft");
async function scheduleDefinition(env2, actor, payload) {
  requireRole(actor, "editor");
  const eventId = String(payload.eventId ?? "");
  const version2 = Number(payload.version);
  const definitionRow = await single(env2, "liveops_event_definitions", `event_id=eq.${encodeEq(eventId)}&version=eq.${version2}`);
  if (!definitionRow) throw new Error("definition_not_found");
  const definition = normalizeDefinition(definitionRow.definition_json);
  const startsAt = new Date(payload.startsAt).toISOString();
  const endsAt = new Date(payload.endsAt ?? Date.parse(startsAt) + definition.durationHours * 36e5).toISOString();
  const grace = Number(payload.settlementGraceMinutes ?? 10);
  const scheduleErrors = scheduleValidation(definition, startsAt, endsAt, grace);
  if (scheduleErrors.length) return { scheduled: false, errors: scheduleErrors };
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_instances", {
    method: "POST",
    body: {
      event_id: eventId,
      definition_version: version2,
      definition_snapshot: definition,
      config_hash: definitionRow.config_hash,
      starts_at: startsAt,
      ends_at: endsAt,
      settlement_grace_minutes: grace,
      status: "scheduled"
    },
    prefer: "return=representation"
  });
  const row = rows?.[0];
  await audit(env2, actor, "event.schedule", "event_instance", row?.id, { eventId, version: version2, startsAt, endsAt, grace });
  return { scheduled: true, instance: row };
}
__name(scheduleDefinition, "scheduleDefinition");
async function rescheduleInstance(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "liveops_event_instances", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("event_instance_not_found");
  if (row.status !== "scheduled") throw new Error("only_scheduled_events_can_be_rescheduled");
  const startsAt = new Date(payload.startsAt).toISOString();
  const endsAt = new Date(payload.endsAt).toISOString();
  const grace = Number(payload.settlementGraceMinutes ?? row.settlement_grace_minutes);
  const errors = scheduleValidation(row.definition_snapshot, startsAt, endsAt, grace);
  if (errors.length) return { rescheduled: false, errors };
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_instances", {
    method: "PATCH",
    query: `id=eq.${encodeEq(payload.id)}`,
    body: { starts_at: startsAt, ends_at: endsAt, settlement_grace_minutes: grace },
    prefer: "return=representation"
  });
  await audit(env2, actor, "event.reschedule", "event_instance", payload.id, { before: { startsAt: row.starts_at, endsAt: row.ends_at }, after: { startsAt, endsAt }, grace });
  return { rescheduled: true, instance: rows?.[0] };
}
__name(rescheduleInstance, "rescheduleInstance");
async function cancelInstance(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "liveops_event_instances", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("event_instance_not_found");
  if (!["scheduled", "active", "settling"].includes(row.status)) throw new Error("event_cannot_be_cancelled");
  const reason = String(payload.reason ?? "").trim();
  if (row.status !== "scheduled") {
    requireRole(actor, "owner");
    if (reason.length < 10) throw new Error("active_event_cancellation_requires_reason");
  }
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_instances", {
    method: "PATCH",
    query: `id=eq.${encodeEq(payload.id)}`,
    body: { status: "cancelled" },
    prefer: "return=representation"
  });
  await audit(env2, actor, "event.cancel", "event_instance", payload.id, { priorStatus: row.status, reason });
  return { cancelled: true, instance: rows?.[0] };
}
__name(cancelInstance, "cancelInstance");
async function archiveInstance(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "liveops_event_instances", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("event_instance_not_found");
  if (!["finalized", "cancelled"].includes(row.status)) throw new Error("only_finalized_or_cancelled_events_can_be_archived");
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_event_instances", {
    method: "PATCH",
    query: `id=eq.${encodeEq(payload.id)}`,
    body: { status: "archived" },
    prefer: "return=representation"
  });
  await audit(env2, actor, "event.archive", "event_instance", payload.id, { priorStatus: row.status });
  return { archived: true, instance: rows?.[0] };
}
__name(archiveInstance, "archiveInstance");
async function saveReward(env2, actor, payload) {
  requireRole(actor, "owner");
  const bundleId = String(payload.bundleId ?? "").trim();
  if (!/^[a-zA-Z0-9_.:-]{3,120}$/.test(bundleId)) throw new Error("reward_bundle_id_invalid");
  const tier = String(payload.tier ?? "milestone");
  if (!["participation", "milestone", "prestige"].includes(tier)) throw new Error("reward_tier_invalid");
  const body = {
    bundle_id: bundleId,
    label: String(payload.label ?? bundleId).trim().slice(0, 120),
    tier,
    enabled: payload.enabled !== false,
    validated: payload.validated === true,
    notes: String(payload.notes ?? "").trim().slice(0, 1e3),
    updated_by: actor.user.id,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const rows = await supabaseFetch(env2, "/rest/v1/liveops_admin_reward_catalog", {
    method: "POST",
    body,
    query: "on_conflict=bundle_id",
    prefer: "resolution=merge-duplicates,return=representation"
  });
  await audit(env2, actor, "reward_catalog.save", "reward_bundle", bundleId, { validated: body.validated, enabled: body.enabled, tier });
  return rows?.[0];
}
__name(saveReward, "saveReward");
async function leaderboard(env2, payload) {
  const instance = await single(env2, "liveops_event_instances", `id=eq.${encodeEq(payload.instanceId)}`);
  if (!instance) throw new Error("event_instance_not_found");
  const finalized = instance.status === "finalized" || instance.status === "archived";
  if (finalized) {
    const rows2 = await list(env2, "liveops_event_rank_snapshots", `select=party_id,party_name_snapshot,rank,eligible_party_count,score,percentile,reward_band,meaningful_contributors,snapshotted_at&event_instance_id=eq.${encodeEq(payload.instanceId)}&order=rank.asc&limit=200`);
    return { instance, finalized: true, rows: rows2 ?? [] };
  }
  const rows = await list(env2, "liveops_event_party_progress", `select=party_id,party_name_snapshot,score,combat_points,skilling_points,meaningful_contributors,ranked_eligible,last_score_at&event_instance_id=eq.${encodeEq(payload.instanceId)}&order=ranked_eligible.desc,score.desc,last_score_at.asc&limit=200`);
  return { instance, finalized: false, rows: (rows ?? []).map((row, index) => ({ ...row, rank: row.ranked_eligible ? index + 1 : null })) };
}
__name(leaderboard, "leaderboard");
async function eventStats(env2, payload) {
  const id = encodeEq(payload.instanceId);
  const [instance, parties, partyCount, qualifiedPartyCount, claims, outboxDead] = await Promise.all([
    single(env2, "liveops_event_instances", `id=eq.${id}`),
    list(env2, "liveops_event_party_progress", `select=party_id,score&event_instance_id=eq.${id}&order=score.desc&limit=1000`),
    countRows(env2, "liveops_event_party_progress", `event_instance_id=eq.${id}`),
    countRows(env2, "liveops_event_party_progress", `event_instance_id=eq.${id}&ranked_eligible=eq.true`),
    countRows(env2, "liveops_event_reward_claims", `event_instance_id=eq.${id}`),
    countRows(env2, "social_contribution_outbox", "status=eq.dead_letter")
  ]);
  if (!instance) throw new Error("event_instance_not_found");
  const rows = parties ?? [];
  return {
    instance,
    partyCount,
    qualifiedPartyCount,
    totalPartyPoints: rows.reduce((sum, p) => sum + Number(p.score ?? 0), 0),
    totalPartyPointsIsPartial: partyCount > rows.length,
    rewardClaimCount: claims,
    deadLetterOutboxCount: outboxDead
  };
}
__name(eventStats, "eventStats");
async function operations(env2) {
  const [healthRows, deadLetters, deadLetterCount, pendingCount] = await Promise.all([
    list(env2, "liveops_runtime_health", "select=*&component=eq.party_liveops_worker&limit=1"),
    list(env2, "social_contribution_outbox", "select=id,source_event_id,account_id,party_id_at_settlement,party_name_at_settlement,event_json,targets_json,attempts,last_error,available_at,created_at&status=eq.dead_letter&order=created_at.desc&limit=100"),
    countRows(env2, "social_contribution_outbox", "status=eq.dead_letter"),
    countRows(env2, "social_contribution_outbox", "status=in.(pending,processing)")
  ]);
  return { workerHealth: healthRows?.[0] ?? null, deadLetters: deadLetters ?? [], deadLetterCount, pendingCount };
}
__name(operations, "operations");
async function retryDeadLetter(env2, actor, payload) {
  requireRole(actor, "owner");
  const row = await single(env2, "social_contribution_outbox", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("outbox_row_not_found");
  if (row.status !== "dead_letter") throw new Error("outbox_row_not_dead_letter");
  const rows = await supabaseFetch(env2, "/rest/v1/social_contribution_outbox", {
    method: "PATCH",
    query: `id=eq.${encodeEq(payload.id)}`,
    body: { status: "pending", attempts: 0, last_error: null, available_at: (/* @__PURE__ */ new Date()).toISOString(), locked_at: null, processed_at: null },
    prefer: "return=representation"
  });
  await audit(env2, actor, "outbox.retry_dead_letter", "social_contribution_outbox", payload.id, { sourceEventId: row.source_event_id, priorAttempts: row.attempts, priorError: row.last_error });
  return rows?.[0];
}
__name(retryDeadLetter, "retryDeadLetter");
function metricSummaries(rows, cutoffMs) {
  const byKey = /* @__PURE__ */ new Map();
  for (const row of rows ?? []) {
    if (Date.parse(row.bucket_start) < cutoffMs) continue;
    const key = row.metric_key;
    const current = byKey.get(key) ?? { metricKey: key, total: 0, samples: 0, min: null, max: null, last: null, lastAt: null, dimensions: /* @__PURE__ */ new Map() };
    const value = Number(row.sum_value ?? 0);
    current.total += value;
    current.samples += Number(row.sample_count ?? 0);
    if (row.min_value !== null && row.min_value !== void 0) current.min = current.min === null ? Number(row.min_value) : Math.min(current.min, Number(row.min_value));
    if (row.max_value !== null && row.max_value !== void 0) current.max = current.max === null ? Number(row.max_value) : Math.max(current.max, Number(row.max_value));
    if (!current.lastAt || Date.parse(row.bucket_start) > Date.parse(current.lastAt)) {
      current.last = Number(row.last_value ?? value);
      current.lastAt = row.bucket_start;
    }
    const dimensionKey = row.dimension_key || "all";
    current.dimensions.set(dimensionKey, (current.dimensions.get(dimensionKey) ?? 0) + value);
    byKey.set(key, current);
  }
  return [...byKey.values()].map((row) => ({ ...row, dimensions: [...row.dimensions.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 12).map(([key, value]) => ({ key, value })) }));
}
__name(metricSummaries, "metricSummaries");
async function remoteConfig(env2) {
  const [rows, revisions] = await Promise.all([
    list(env2, "ops_remote_config", "select=*&order=category.asc,risk_tier.desc,label.asc&limit=300"),
    list(env2, "ops_remote_config_revisions", "select=id,config_key,actor_account_id,actor_role,reason,prior_json,next_json,created_at&order=created_at.desc&limit=100")
  ]);
  return { rows: rows ?? [], revisions: revisions ?? [] };
}
__name(remoteConfig, "remoteConfig");
function coerceRemoteValue(valueType, value) {
  if (valueType === "boolean") return value === true || value === "true";
  if (valueType === "integer") return Number.parseInt(String(value), 10);
  if (valueType === "number") return Number(value);
  if (valueType === "string") return String(value ?? "");
  return value;
}
__name(coerceRemoteValue, "coerceRemoteValue");
async function saveRemoteConfig(env2, actor, payload) {
  const key = String(payload.configKey ?? "").trim();
  const prior = await single(env2, "ops_remote_config", `config_key=eq.${encodeEq(key)}`);
  if (!prior) throw new Error("remote_config_not_found");
  requireRole(actor, prior.risk_tier === "critical" ? "owner" : "editor");
  if (!prior.live_change_safe) throw new Error("remote_config_not_live_change_safe");
  const reason = String(payload.reason ?? "").trim();
  if (reason.length < (prior.risk_tier === "critical" ? 10 : 5)) throw new Error("config_change_reason_too_short");
  const next = {
    ...prior,
    current_value: coerceRemoteValue(prior.value_type, payload.currentValue),
    enabled: payload.enabled !== false,
    rollout_percent: Number(payload.rolloutPercent ?? prior.rollout_percent),
    active_from: payload.activeFrom ? new Date(payload.activeFrom).toISOString() : null,
    active_until: payload.activeUntil ? new Date(payload.activeUntil).toISOString() : null,
    notes: payload.notes === void 0 ? prior.notes : String(payload.notes ?? "").trim().slice(0, 1200),
    updated_by: actor.user.id,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const validation = validateRemoteConfig(next);
  if (validation.errors.length) return { saved: false, errors: validation.errors };
  const body = { current_value: next.current_value, enabled: next.enabled, rollout_percent: next.rollout_percent, active_from: next.active_from, active_until: next.active_until, notes: next.notes, updated_by: actor.user.id, updated_at: next.updated_at };
  const rows = await supabaseFetch(env2, "/rest/v1/ops_remote_config", { method: "PATCH", query: `config_key=eq.${encodeEq(key)}`, body, prefer: "return=representation" });
  const saved = rows?.[0];
  await supabaseFetch(env2, "/rest/v1/ops_remote_config_revisions", { method: "POST", body: { config_key: key, actor_account_id: actor.user.id, actor_role: actor.admin.role, reason, prior_json: prior, next_json: saved }, prefer: "return=minimal" });
  await audit(env2, actor, "remote_config.update", "remote_config", key, { reason, riskTier: prior.risk_tier, priorValue: prior.current_value, nextValue: saved?.current_value, rolloutPercent: saved?.rollout_percent, enabled: saved?.enabled });
  return { saved: true, row: saved };
}
__name(saveRemoteConfig, "saveRemoteConfig");
async function healthEconomy(env2) {
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [metrics, alerts, health, deadResets, deadSocial] = await Promise.all([
    list(env2, "ops_metric_buckets", `select=metric_key,bucket_start,bucket_minutes,dimension_key,dimensions_json,metric_type,sum_value,sample_count,min_value,max_value,last_value&bucket_start=gte.${encodeEq(since7)}&order=bucket_start.desc&limit=5000`),
    list(env2, "ops_alerts", "select=*&status=neq.resolved&order=severity.desc,last_seen_at.desc&limit=200"),
    list(env2, "liveops_runtime_health", "select=*&order=component.asc&limit=100"),
    countRows(env2, "ops_reset_runs", "status=eq.dead_letter"),
    countRows(env2, "social_contribution_outbox", "status=eq.dead_letter")
  ]);
  const now = Date.now();
  const m24 = metricSummaries(metrics, now - 24 * 36e5), m7 = metricSummaries(metrics, now - 7 * 864e5);
  const by24 = new Map(m24.map((x) => [x.metricKey, x]));
  const goldCreated = by24.get("economy.gold.created")?.total ?? 0;
  const goldDestroyed = by24.get("economy.gold.destroyed")?.total ?? 0;
  return { metrics24: m24, metrics7: m7, gold: { created24: goldCreated, destroyed24: goldDestroyed, net24: goldCreated - goldDestroyed }, alerts: alerts ?? [], health: health ?? [], deadLetters: { resets: deadResets, social: deadSocial } };
}
__name(healthEconomy, "healthEconomy");
async function updateAlert(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "ops_alerts", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("alert_not_found");
  const status = String(payload.status ?? "");
  if (!["acknowledged", "resolved"].includes(status)) throw new Error("alert_status_invalid");
  if (status === "resolved" && row.severity === "critical") requireRole(actor, "owner");
  const reason = String(payload.reason ?? "").trim();
  if (reason.length < 5) throw new Error("alert_reason_too_short");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const body = status === "acknowledged" ? { status, acknowledged_by: actor.user.id, acknowledged_at: now } : { status, resolved_by: actor.user.id, resolved_at: now };
  const rows = await supabaseFetch(env2, "/rest/v1/ops_alerts", { method: "PATCH", query: `id=eq.${encodeEq(payload.id)}`, body, prefer: "return=representation" });
  await audit(env2, actor, `alert.${status}`, "ops_alert", payload.id, { reason, title: row.title, severity: row.severity });
  return rows?.[0];
}
__name(updateAlert, "updateAlert");
async function resets(env2) {
  const [definitions, runs, health] = await Promise.all([
    list(env2, "ops_reset_definitions", "select=*&order=reset_key.asc&limit=100"),
    list(env2, "ops_reset_runs", "select=*&order=due_at.desc&limit=250"),
    list(env2, "liveops_runtime_health", "select=*&component=eq.central_reset_worker&limit=1")
  ]);
  return { definitions: definitions ?? [], runs: runs ?? [], workerHealth: health?.[0] ?? null };
}
__name(resets, "resets");
async function saveResetDefinition(env2, actor, payload) {
  requireRole(actor, "owner");
  const key = String(payload.resetKey ?? "");
  const row = await single(env2, "ops_reset_definitions", `reset_key=eq.${encodeEq(key)}`);
  if (!row) throw new Error("reset_definition_not_found");
  const reason = String(payload.reason ?? "").trim();
  if (reason.length < 10) throw new Error("reset_change_reason_too_short");
  const cadence = String(payload.cadence ?? row.cadence);
  if (!["daily", "weekly", "monthly"].includes(cadence)) throw new Error("reset_cadence_invalid");
  const hour = Number(payload.utcHour ?? row.utc_hour), minute = Number(payload.utcMinute ?? row.utc_minute), dow = payload.dayOfWeek === null ? null : Number(payload.dayOfWeek ?? row.day_of_week), dom = payload.dayOfMonth === null ? null : Number(payload.dayOfMonth ?? row.day_of_month);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error("reset_time_invalid");
  if (cadence === "weekly" && (!Number.isInteger(dow) || dow < 0 || dow > 6)) throw new Error("reset_weekday_invalid");
  if (cadence === "monthly" && (!Number.isInteger(dom) || dom < 1 || dom > 28)) throw new Error("reset_monthday_invalid");
  const body = { cadence, utc_hour: hour, utc_minute: minute, day_of_week: cadence === "weekly" ? dow : null, day_of_month: cadence === "monthly" ? dom : null, catch_up_policy: String(payload.catchUpPolicy ?? row.catch_up_policy), max_catchup_runs: Number(payload.maxCatchupRuns ?? row.max_catchup_runs), enabled: payload.enabled !== false, updated_by: actor.user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  if (!["latest_only", "all_missed", "skip_missed"].includes(body.catch_up_policy)) throw new Error("reset_catchup_invalid");
  if (!Number.isInteger(body.max_catchup_runs) || body.max_catchup_runs < 1 || body.max_catchup_runs > 31) throw new Error("reset_catchup_count_invalid");
  const rows = await supabaseFetch(env2, "/rest/v1/ops_reset_definitions", { method: "PATCH", query: `reset_key=eq.${encodeEq(key)}`, body, prefer: "return=representation" });
  await audit(env2, actor, "reset_definition.update", "reset_definition", key, { reason, before: row, after: rows?.[0] });
  return rows?.[0];
}
__name(saveResetDefinition, "saveResetDefinition");
async function retryResetRun(env2, actor, payload) {
  requireRole(actor, "owner");
  const row = await single(env2, "ops_reset_runs", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("reset_run_not_found");
  if (!["failed", "dead_letter"].includes(row.status)) throw new Error("reset_run_not_retryable");
  const reason = String(payload.reason ?? "").trim();
  if (reason.length < 10) throw new Error("reset_retry_reason_too_short");
  const rows = await supabaseFetch(env2, "/rest/v1/ops_reset_runs", { method: "PATCH", query: `id=eq.${encodeEq(payload.id)}`, body: { status: "pending", attempts: 0, last_error: null, available_at: (/* @__PURE__ */ new Date()).toISOString(), locked_at: null, completed_at: null }, prefer: "return=representation" });
  await audit(env2, actor, "reset_run.retry", "reset_run", payload.id, { reason, resetKey: row.reset_key, periodKey: row.period_key, priorStatus: row.status, priorError: row.last_error });
  return rows?.[0];
}
__name(retryResetRun, "retryResetRun");
function isUuid2(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}
__name(isUuid2, "isUuid");
function supportTerm(value) {
  return String(value ?? "").trim().slice(0, 80).replace(/[^a-zA-Z0-9 _.-]/g, "");
}
__name(supportTerm, "supportTerm");
async function supportSearch(env2, payload) {
  const q = supportTerm(payload.query);
  if (q.length < 2) return [];
  if (isUuid2(q)) return await list(env2, "ops_support_accounts", `select=account_id,public_player_id,display_name,primary_character_id,last_seen_at,tags,updated_at&account_id=eq.${encodeEq(q)}&limit=25`) ?? [];
  const or = encodeURIComponent(`(public_player_id.ilike.*${q}*,display_name.ilike.*${q}*)`);
  return await list(env2, "ops_support_accounts", `select=account_id,public_player_id,display_name,primary_character_id,last_seen_at,tags,updated_at&or=${or}&order=last_seen_at.desc.nullslast&limit=25`) ?? [];
}
__name(supportSearch, "supportSearch");
async function authUserById(env2, accountId) {
  try {
    const cfg = envConfig(env2);
    const response = await fetch(`${cfg.url}/auth/v1/admin/users/${encodeURIComponent(accountId)}`, { headers: { apikey: cfg.service, authorization: `Bearer ${cfg.service}` } });
    if (!response.ok) return null;
    const user = await response.json();
    return { id: user.id, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, email: user.email ? String(user.email).replace(/^(.{2}).*(@.*)$/, "$1***$2") : null };
  } catch {
    return null;
  }
}
__name(authUserById, "authUserById");
async function supportAccount(env2, payload) {
  const accountId = String(payload.accountId ?? "");
  if (!isUuid2(accountId)) throw new Error("account_id_invalid");
  const warnings = [];
  const [index, authUser, characters, partyMembers, guildMembers, eventProgress, claims, redeemClaims, bindings, cases, notes, alerts, adminCommands] = await Promise.all([
    single(env2, "ops_support_accounts", `account_id=eq.${encodeEq(accountId)}`),
    authUserById(env2, accountId),
    optionalList(env2, "characters", `select=*&account_id=eq.${encodeEq(accountId)}&limit=10`, warnings, "characters"),
    optionalList(env2, "party_members", `select=party_id,character_id,role,joined_at&account_id=eq.${encodeEq(accountId)}&limit=10`, warnings, "party_members"),
    optionalList(env2, "guild_members", `select=guild_id,role,contribution_xp,joined_at&account_id=eq.${encodeEq(accountId)}&limit=10`, warnings, "guild_members"),
    optionalList(env2, "liveops_event_account_progress", `select=event_instance_id,personal_points,combat_points,skilling_points,last_contribution_at&account_id=eq.${encodeEq(accountId)}&order=last_contribution_at.desc.nullslast&limit=30`, warnings, "event_progress"),
    optionalList(env2, "liveops_event_reward_claims", `select=event_instance_id,party_id,reward_kind,milestone_points,reward_bundle_id,claimed_at&account_id=eq.${encodeEq(accountId)}&order=claimed_at.desc&limit=30`, warnings, "reward_claims"),
    optionalList(env2, "ops_redeem_code_claims", `select=code_id,reward_bundle_id,status,error_text,created_at,granted_at&account_id=eq.${encodeEq(accountId)}&order=created_at.desc&limit=30`, warnings, "redeem_claims"),
    optionalList(env2, "liveops_event_party_bindings", `select=event_instance_id,party_id,locked_at,points_at_lock&account_id=eq.${encodeEq(accountId)}&order=locked_at.desc&limit=20`, warnings, "party_bindings"),
    list(env2, "ops_support_cases", `select=*&account_id=eq.${encodeEq(accountId)}&order=updated_at.desc&limit=50`),
    list(env2, "ops_support_notes", `select=*&account_id=eq.${encodeEq(accountId)}&order=created_at.desc&limit=100`),
    list(env2, "ops_alerts", `select=*&account_id=eq.${encodeEq(accountId)}&order=last_seen_at.desc&limit=50`),
    list(env2, "ops_admin_commands", `select=*&target_account_id=eq.${encodeEq(accountId)}&order=created_at.desc&limit=100`)
  ]);
  const partyIds = [...new Set((partyMembers ?? []).map((x) => x.party_id).filter(Boolean))], guildIds = [...new Set((guildMembers ?? []).map((x) => x.guild_id).filter(Boolean))];
  const parties = partyIds.length ? await optionalList(env2, "parties", `select=id,name,status,activity_preference,play_style,created_at&id=in.(${partyIds.map(encodeEq).join(",")})`, warnings, "parties") : [];
  const guilds = guildIds.length ? await optionalList(env2, "guilds", `select=id,name,level,xp,member_cap,created_at&id=in.(${guildIds.map(encodeEq).join(",")})`, warnings, "guilds") : [];
  return { account: index ?? { account_id: accountId }, authUser, characters, partyMembers, parties, guildMembers, guilds, eventProgress, claims, redeemClaims, bindings, cases: cases ?? [], notes: notes ?? [], alerts: alerts ?? [], adminCommands: adminCommands ?? [], warnings };
}
__name(supportAccount, "supportAccount");
async function createSupportCase(env2, actor, payload) {
  requireRole(actor, "editor");
  const accountId = String(payload.accountId ?? "");
  if (!isUuid2(accountId)) throw new Error("account_id_invalid");
  const title2 = String(payload.title ?? "").trim().slice(0, 160);
  if (title2.length < 3) throw new Error("support_case_title_too_short");
  const priority = String(payload.priority ?? "normal");
  if (!["low", "normal", "high", "urgent"].includes(priority)) throw new Error("support_priority_invalid");
  const rows = await supabaseFetch(env2, "/rest/v1/ops_support_cases", { method: "POST", body: { account_id: accountId, title: title2, summary: String(payload.summary ?? "").trim().slice(0, 4e3), priority, status: "open", created_by: actor.user.id }, prefer: "return=representation" });
  const row = rows?.[0];
  await audit(env2, actor, "support_case.create", "support_case", row?.id, { accountId, title: title2, priority });
  return row;
}
__name(createSupportCase, "createSupportCase");
async function updateSupportCase(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "ops_support_cases", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("support_case_not_found");
  const status = String(payload.status ?? row.status);
  if (!["open", "waiting", "resolved"].includes(status)) throw new Error("support_case_status_invalid");
  const priority = String(payload.priority ?? row.priority);
  if (!["low", "normal", "high", "urgent"].includes(priority)) throw new Error("support_priority_invalid");
  const body = { status, priority, summary: payload.summary === void 0 ? row.summary : String(payload.summary ?? "").trim().slice(0, 4e3), updated_at: (/* @__PURE__ */ new Date()).toISOString(), resolved_at: status === "resolved" ? (/* @__PURE__ */ new Date()).toISOString() : null };
  const rows = await supabaseFetch(env2, "/rest/v1/ops_support_cases", { method: "PATCH", query: `id=eq.${encodeEq(payload.id)}`, body, prefer: "return=representation" });
  await audit(env2, actor, "support_case.update", "support_case", payload.id, { accountId: row.account_id, before: { status: row.status, priority: row.priority }, after: { status, priority } });
  return rows?.[0];
}
__name(updateSupportCase, "updateSupportCase");
async function addSupportNote(env2, actor, payload) {
  requireRole(actor, "editor");
  const accountId = String(payload.accountId ?? "");
  if (!isUuid2(accountId)) throw new Error("account_id_invalid");
  const note = String(payload.note ?? "").trim();
  if (note.length < 3 || note.length > 4e3) throw new Error("support_note_length_invalid");
  const category = String(payload.category ?? "general");
  if (!["general", "bug", "economy", "social", "event", "moderation", "recovery"].includes(category)) throw new Error("support_note_category_invalid");
  const rows = await supabaseFetch(env2, "/rest/v1/ops_support_notes", { method: "POST", body: { account_id: accountId, case_id: payload.caseId || null, category, note, created_by: actor.user.id }, prefer: "return=representation" });
  const row = rows?.[0];
  await audit(env2, actor, "support_note.add", "support_account", accountId, { noteId: row?.id, caseId: payload.caseId || null, category });
  return row;
}
__name(addSupportNote, "addSupportNote");
async function appendCommandEvent(env2, commandId, eventType, actor = null, detail = {}) {
  await supabaseFetch(env2, "/rest/v1/ops_admin_command_events", { method: "POST", body: { command_id: commandId, event_type: eventType, actor_account_id: actor?.user?.id || null, actor_email: actor?.user?.email || null, detail_json: detail }, prefer: "return=minimal" });
}
__name(appendCommandEvent, "appendCommandEvent");
async function catalogRows(env2) {
  const [rows, rewards] = await Promise.all([
    list(env2, "ops_admin_content_catalog", "select=*&enabled=eq.true&order=entity_type.asc,label.asc&limit=5000"),
    list(env2, "liveops_admin_reward_catalog", "select=bundle_id,label,tier,enabled,validated&enabled=eq.true&order=label.asc&limit=500")
  ]);
  const merged = [...rows ?? []];
  const seen = new Set(merged.map((x) => `${x.entity_type}:${x.entity_key}`));
  for (const reward of rewards ?? []) {
    const key = `reward_bundle:${reward.bundle_id}`;
    if (seen.has(key)) continue;
    merged.push({ entity_type: "reward_bundle", entity_key: reward.bundle_id, label: reward.label, description: `Reward bundle \xB7 ${reward.tier}`, metadata_json: { tier: reward.tier, validated: reward.validated }, enabled: reward.enabled, synced_at: null });
  }
  return merged;
}
__name(catalogRows, "catalogRows");
async function validateCatalogReferences(env2, registry, parameters) {
  const errors = [];
  for (const field of registry?.params_schema?.fields || []) {
    if (!["catalog", "catalog_multi"].includes(field.type)) continue;
    const raw = parameters?.[field.name];
    const values = field.type === "catalog_multi" ? Array.isArray(raw) ? raw : [] : [raw];
    for (const value of values) {
      if (!value) continue;
      if (field.catalogType === "reward_bundle") {
        const reward = await single(env2, "liveops_admin_reward_catalog", `bundle_id=eq.${encodeEq(value)}&enabled=eq.true`);
        if (!reward || !reward.validated) errors.push(`${field.name}: reward bundle ${value} is missing, disabled, or not validated`);
        continue;
      }
      const row = await single(env2, "ops_admin_content_catalog", `entity_type=eq.${encodeEq(field.catalogType)}&entity_key=eq.${encodeEq(value)}&enabled=eq.true`);
      if (!row) errors.push(`${field.name}: ${field.catalogType} ${value} is not in the synced content catalog`);
    }
  }
  return errors;
}
__name(validateCatalogReferences, "validateCatalogReferences");
async function controlCenter(env2) {
  const [registry, commands, content, health, announcements] = await Promise.all([
    list(env2, "ops_admin_command_registry", "select=*&enabled=eq.true&order=category.asc,risk_tier.asc,label.asc&limit=300"),
    list(env2, "ops_admin_commands", "select=*&order=created_at.desc&limit=250"),
    catalogRows(env2),
    list(env2, "liveops_runtime_health", "select=*&component=eq.admin_command_worker&limit=1"),
    list(env2, "ops_admin_announcements", "select=*&order=starts_at.desc&limit=100")
  ]);
  return { registry: registry ?? [], commands: commands ?? [], content: content ?? [], workerHealth: health?.[0] ?? null, announcements: announcements ?? [], dualApprovalCritical: String(env2.CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL || "false").toLowerCase() === "true" };
}
__name(controlCenter, "controlCenter");
async function commandTimeline(env2, payload) {
  const id = String(payload.id || "");
  if (!isUuid2(id)) throw new Error("command_id_invalid");
  const [command, events] = await Promise.all([single(env2, "ops_admin_commands", `id=eq.${encodeEq(id)}`), list(env2, "ops_admin_command_events", `select=*&command_id=eq.${encodeEq(id)}&order=created_at.asc&limit=200`)]);
  if (!command) throw new Error("admin_command_not_found");
  return { command, events: events ?? [] };
}
__name(commandTimeline, "commandTimeline");
async function queueAdminCommand(env2, actor, payload) {
  const commandKey = String(payload.commandKey || "");
  const registry = await single(env2, "ops_admin_command_registry", `command_key=eq.${encodeEq(commandKey)}&enabled=eq.true`);
  if (!registry) throw new Error("admin_command_not_found");
  const dualApprovalCritical = String(env2.CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL || "false").toLowerCase() === "true";
  const validation = validateCommandRequest(registry, actor.admin.role, payload, { dualApprovalCritical });
  validation.errors.push(...await validateCatalogReferences(env2, registry, validation.normalized.parameters));
  if (validation.errors.length) return { queued: false, errors: validation.errors };
  const status = commandStatusAfterQueue(registry, { dualApprovalCritical });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const body = { command_key: registry.command_key, target_account_id: validation.normalized.targetAccountId, target_character_id: validation.normalized.targetCharacterId, target_ref: validation.normalized.targetRef, parameters_json: validation.normalized.parameters, reason: validation.normalized.reason, risk_tier: registry.risk_tier, status, requested_by: actor.user.id, requested_by_email: actor.user.email || null, requested_by_role: actor.admin.role, approved_by: status === "approved" ? actor.user.id : null, approved_at: status === "approved" ? now : null, confirmation_text: validation.normalized.confirmation || null, idempotency_key: payload.idempotencyKey && isUuid2(payload.idempotencyKey) ? payload.idempotencyKey : crypto.randomUUID(), execute_after: payload.executeAfter ? new Date(payload.executeAfter).toISOString() : now, reversible: Boolean(registry.reversible) };
  const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_commands", { method: "POST", body, prefer: "return=representation" });
  const row = rows?.[0];
  await appendCommandEvent(env2, row.id, "requested", actor, { commandKey: registry.command_key, status, targetAccountId: body.target_account_id, targetCharacterId: body.target_character_id, reason: body.reason, parameters: body.parameters_json });
  if (status === "approved") await appendCommandEvent(env2, row.id, "approved", actor, { automatic: true });
  await audit(env2, actor, "admin_command.queue", "admin_command", row.id, { commandKey: registry.command_key, riskTier: registry.risk_tier, status, targetAccountId: body.target_account_id, targetCharacterId: body.target_character_id, reason: body.reason });
  return { queued: true, command: row, confirmationPhrase: confirmationPhrase(registry.command_key) };
}
__name(queueAdminCommand, "queueAdminCommand");
async function approveAdminCommand(env2, actor, payload) {
  requireRole(actor, "owner");
  const row = await single(env2, "ops_admin_commands", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("admin_command_not_found");
  if (row.status !== "pending_approval") throw new Error("admin_command_not_pending_approval");
  const dual = String(env2.CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL || "false").toLowerCase() === "true";
  if (dual && row.requested_by === actor.user.id) throw new Error("second_owner_approval_required");
  if (String(payload.confirmation || "").trim() !== `APPROVE ${row.command_key}`) throw new Error(`confirmation_must_match:APPROVE ${row.command_key}`);
  const reason = String(payload.reason || "").trim();
  if (reason.length < 10) throw new Error("approval_reason_too_short");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_commands", { method: "PATCH", query: `id=eq.${encodeEq(row.id)}&status=eq.pending_approval`, body: { status: "approved", approved_by: actor.user.id, approved_at: now, available_at: now, updated_at: now }, prefer: "return=representation" });
  if (!rows?.[0]) throw new Error("admin_command_approval_conflict");
  await appendCommandEvent(env2, row.id, "approved", actor, { reason, dualApproval: dual });
  await audit(env2, actor, "admin_command.approve", "admin_command", row.id, { commandKey: row.command_key, reason });
  return rows[0];
}
__name(approveAdminCommand, "approveAdminCommand");
async function cancelAdminCommand(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "ops_admin_commands", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("admin_command_not_found");
  if (!["pending_approval", "approved", "failed"].includes(row.status)) throw new Error("admin_command_not_cancellable");
  if (row.risk_tier === "critical") requireRole(actor, "owner");
  const reason = String(payload.reason || "").trim();
  if (reason.length < 8) throw new Error("cancel_reason_too_short");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_commands", { method: "PATCH", query: `id=eq.${encodeEq(row.id)}`, body: { status: "cancelled", cancelled_by: actor.user.id, cancelled_at: now, updated_at: now }, prefer: "return=representation" });
  await appendCommandEvent(env2, row.id, "cancelled", actor, { reason, priorStatus: row.status });
  await audit(env2, actor, "admin_command.cancel", "admin_command", row.id, { commandKey: row.command_key, reason });
  return rows?.[0];
}
__name(cancelAdminCommand, "cancelAdminCommand");
async function retryAdminCommand(env2, actor, payload) {
  requireRole(actor, "owner");
  const row = await single(env2, "ops_admin_commands", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("admin_command_not_found");
  if (row.status !== "failed" || Number(row.attempts) >= 5) throw new Error("admin_command_not_retryable");
  const reason = String(payload.reason || "").trim();
  if (reason.length < 10) throw new Error("retry_reason_too_short");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_commands", { method: "PATCH", query: `id=eq.${encodeEq(row.id)}`, body: { status: "approved", available_at: now, locked_at: null, error_text: null, updated_at: now }, prefer: "return=representation" });
  await appendCommandEvent(env2, row.id, "retried", actor, { reason, priorError: row.error_text });
  await audit(env2, actor, "admin_command.retry", "admin_command", row.id, { commandKey: row.command_key, reason });
  return rows?.[0];
}
__name(retryAdminCommand, "retryAdminCommand");
async function reverseAdminCommand(env2, actor, payload) {
  requireRole(actor, "owner");
  const original = await single(env2, "ops_admin_commands", `id=eq.${encodeEq(payload.id)}`);
  if (!original) throw new Error("admin_command_not_found");
  if (!canReverse(original)) throw new Error("admin_command_not_reversible");
  const reversal = original.result_json.reversal;
  const queued = await queueAdminCommand(env2, actor, { commandKey: reversal.commandKey, targetAccountId: original.target_account_id, targetCharacterId: original.target_character_id, targetRef: original.target_ref, parameters: reversal.parameters, reason: String(payload.reason || `Reversal of command ${original.id}`), confirmation: payload.confirmation });
  if (!queued.queued) return queued;
  await supabaseFetch(env2, "/rest/v1/ops_admin_commands", { method: "PATCH", query: `id=eq.${encodeEq(queued.command.id)}`, body: { reversal_of: original.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, prefer: "return=minimal" });
  await appendCommandEvent(env2, original.id, "reversal_requested", actor, { reversalCommandId: queued.command.id });
  return queued;
}
__name(reverseAdminCommand, "reverseAdminCommand");
async function contentCatalog(env2) {
  const rows = await catalogRows(env2);
  const counts = {};
  for (const row of rows) counts[row.entity_type] = (counts[row.entity_type] || 0) + 1;
  return { rows, counts, total: rows.length };
}
__name(contentCatalog, "contentCatalog");
async function listRedeemCodes(env2) {
  const [codes, claims] = await Promise.all([
    list(env2, "ops_redeem_codes", "select=id,code_hint,label,reward_bundle_id,max_total_claims,max_claims_per_account,claims_count,starts_at,ends_at,enabled,created_by,updated_by,created_at,updated_at&order=created_at.desc&limit=500"),
    list(env2, "ops_redeem_code_claims", "select=id,code_id,account_id,claim_sequence,reward_bundle_id,status,error_text,created_at,granted_at&order=created_at.desc&limit=250")
  ]);
  return { codes: codes ?? [], claims: claims ?? [] };
}
__name(listRedeemCodes, "listRedeemCodes");
async function createRedeemCode(env2, actor, payload) {
  requireRole(actor, "owner");
  const label = String(payload.label || "").trim().slice(0, 120);
  if (label.length < 3) throw new Error("redeem_code_label_too_short");
  const bundleId = String(payload.rewardBundleId || "").trim();
  const reward = await single(env2, "liveops_admin_reward_catalog", `bundle_id=eq.${encodeEq(bundleId)}&enabled=eq.true&validated=eq.true`);
  if (!reward) throw new Error("redeem_reward_bundle_not_validated");
  const custom = String(payload.customCode || "").trim();
  const plaintext = custom || generateRedeemCode(String(payload.prefix || "VELD"));
  const validation = validateRedeemCode(plaintext);
  if (validation.errors.length) throw new Error(`redeem_code_invalid:${validation.errors.join(" ")}`);
  const codeHash = await hashRedeemCode(plaintext), hint = redeemCodeHint(plaintext);
  const maxTotalRaw = payload.maxTotalClaims === null || payload.maxTotalClaims === "" || payload.maxTotalClaims === void 0 ? null : Number(payload.maxTotalClaims);
  const maxPer = Number(payload.maxClaimsPerAccount ?? 1);
  if (maxTotalRaw !== null && (!Number.isInteger(maxTotalRaw) || maxTotalRaw < 1 || maxTotalRaw > 1e6)) throw new Error("redeem_max_total_invalid");
  if (!Number.isInteger(maxPer) || maxPer < 1 || maxPer > 20) throw new Error("redeem_max_per_account_invalid");
  const startsAt = payload.startsAt ? new Date(payload.startsAt).toISOString() : null, endsAt = payload.endsAt ? new Date(payload.endsAt).toISOString() : null;
  if (endsAt && startsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error("redeem_end_before_start");
  const rows = await supabaseFetch(env2, "/rest/v1/ops_redeem_codes", { method: "POST", body: { code_hash: codeHash, code_hint: hint, label, reward_bundle_id: bundleId, max_total_claims: maxTotalRaw, max_claims_per_account: maxPer, starts_at: startsAt, ends_at: endsAt, enabled: true, created_by: actor.user.id, updated_by: actor.user.id }, prefer: "return=representation" });
  const row = rows?.[0];
  await audit(env2, actor, "redeem_code.create", "redeem_code", row?.id, { label, rewardBundleId: bundleId, codeHint: hint, maxTotalClaims: maxTotalRaw, maxClaimsPerAccount: maxPer, startsAt, endsAt });
  return { row: { ...row, code_hash: void 0 }, plaintextCode: plaintext };
}
__name(createRedeemCode, "createRedeemCode");
async function setRedeemCodeEnabled(env2, actor, payload) {
  requireRole(actor, "owner");
  const id = String(payload.id || "");
  if (!isUuid2(id)) throw new Error("redeem_code_id_invalid");
  const row = await single(env2, "ops_redeem_codes", `id=eq.${encodeEq(id)}`);
  if (!row) throw new Error("redeem_code_not_found");
  const reason = String(payload.reason || "").trim();
  if (reason.length < 10) throw new Error("redeem_code_change_reason_too_short");
  const enabled = payload.enabled === true;
  const rows = await supabaseFetch(env2, "/rest/v1/ops_redeem_codes", { method: "PATCH", query: `id=eq.${encodeEq(id)}`, body: { enabled, updated_by: actor.user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, prefer: "return=representation" });
  await audit(env2, actor, enabled ? "redeem_code.enable" : "redeem_code.disable", "redeem_code", id, { reason, label: row.label, codeHint: row.code_hint, rewardBundleId: row.reward_bundle_id, claimsCount: row.claims_count });
  return rows?.[0];
}
__name(setRedeemCodeEnabled, "setRedeemCodeEnabled");
async function listAdmins(env2) {
  return await list(env2, "liveops_admin_users", "select=account_id,role,display_name,enabled,created_at,updated_at&order=enabled.desc,role.desc,display_name.asc&limit=100") ?? [];
}
__name(listAdmins, "listAdmins");
async function saveAdminUser(env2, actor, payload) {
  requireRole(actor, "owner");
  const accountId = String(payload.accountId || "");
  if (!isUuid2(accountId)) throw new Error("admin_account_id_invalid");
  const authUser = await authUserById(env2, accountId);
  if (!authUser) throw new Error("admin_auth_user_not_found");
  const role = String(payload.role || "viewer");
  if (!["viewer", "editor", "owner"].includes(role)) throw new Error("admin_role_invalid");
  const displayName = String(payload.displayName || "").trim().slice(0, 80) || "VELDRYN Admin";
  const enabled = payload.enabled !== false;
  const existing = await single(env2, "liveops_admin_users", `account_id=eq.${encodeEq(accountId)}`);
  const owners = await list(env2, "liveops_admin_users", "select=account_id&role=eq.owner&enabled=eq.true&limit=100");
  const removesOwner = existing?.role === "owner" && existing?.enabled === true && (!enabled || role !== "owner");
  if (removesOwner && (owners ?? []).length <= 1) throw new Error("cannot_remove_last_enabled_owner");
  if (accountId === actor.user.id && removesOwner && (owners ?? []).length <= 1) throw new Error("cannot_self_remove_last_owner");
  let row;
  if (existing) {
    const rows = await supabaseFetch(env2, "/rest/v1/liveops_admin_users", { method: "PATCH", query: `account_id=eq.${encodeEq(accountId)}`, body: { role, display_name: displayName, enabled, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, prefer: "return=representation" });
    row = rows?.[0];
  } else {
    const rows = await supabaseFetch(env2, "/rest/v1/liveops_admin_users", { method: "POST", body: { account_id: accountId, role, display_name: displayName, enabled }, prefer: "return=representation" });
    row = rows?.[0];
  }
  await audit(env2, actor, existing ? "admin_user.update" : "admin_user.create", "admin_user", accountId, { before: existing ? { role: existing.role, enabled: existing.enabled, displayName: existing.display_name } : null, after: { role, enabled, displayName } });
  return row;
}
__name(saveAdminUser, "saveAdminUser");
async function listAnnouncements(env2) {
  return await list(env2, "ops_admin_announcements", "select=*&order=starts_at.desc&limit=250") ?? [];
}
__name(listAnnouncements, "listAnnouncements");
async function saveAnnouncement(env2, actor, payload) {
  requireRole(actor, "editor");
  const title2 = String(payload.title || "").trim().slice(0, 120), bodyText = String(payload.body || "").trim().slice(0, 2e3), severity = String(payload.severity || "info");
  if (!title2 || !bodyText) throw new Error("announcement_title_body_required");
  if (!["info", "success", "warning", "critical"].includes(severity)) throw new Error("announcement_severity_invalid");
  if (severity === "critical" || payload.pushEnabled) requireRole(actor, "owner");
  const audience = payload.audience && typeof payload.audience === "object" ? payload.audience : { kind: "all" };
  if (!["all", "account", "guild", "event_participants"].includes(audience.kind)) throw new Error("announcement_audience_invalid");
  if (audience.kind === "account" && !isUuid2(audience.accountId)) throw new Error("announcement_account_invalid");
  if (audience.kind === "guild" && !isUuid2(audience.guildId)) throw new Error("announcement_guild_invalid");
  if (audience.kind === "event_participants" && !isUuid2(audience.eventInstanceId)) throw new Error("announcement_event_invalid");
  const startsAt = payload.startsAt ? new Date(payload.startsAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString(), endsAt = payload.endsAt ? new Date(payload.endsAt).toISOString() : null;
  if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error("announcement_end_before_start");
  const record = { title: title2, body: bodyText, severity, audience_json: audience, starts_at: startsAt, ends_at: endsAt, in_game_enabled: payload.inGameEnabled !== false, push_enabled: Boolean(payload.pushEnabled), status: payload.status === "draft" ? "draft" : "scheduled", updated_by: actor.user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  let row;
  if (payload.id) {
    const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_announcements", { method: "PATCH", query: `id=eq.${encodeEq(payload.id)}&status=in.(draft,scheduled)`, body: record, prefer: "return=representation" });
    row = rows?.[0];
    if (!row) throw new Error("announcement_not_editable");
  } else {
    const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_announcements", { method: "POST", body: { ...record, created_by: actor.user.id }, prefer: "return=representation" });
    row = rows?.[0];
  }
  await audit(env2, actor, payload.id ? "announcement.update" : "announcement.create", "announcement", row.id, { severity, audience, status: row.status, startsAt, endsAt, pushEnabled: row.push_enabled });
  return row;
}
__name(saveAnnouncement, "saveAnnouncement");
async function cancelAnnouncement(env2, actor, payload) {
  requireRole(actor, "editor");
  const row = await single(env2, "ops_admin_announcements", `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error("announcement_not_found");
  if (row.severity === "critical" || row.push_enabled) requireRole(actor, "owner");
  const reason = String(payload.reason || "").trim();
  if (reason.length < 5) throw new Error("announcement_cancel_reason_too_short");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await supabaseFetch(env2, "/rest/v1/ops_admin_announcements", { method: "PATCH", query: `id=eq.${encodeEq(row.id)}`, body: { status: "cancelled", cancelled_by: actor.user.id, cancelled_at: now, updated_by: actor.user.id, updated_at: now }, prefer: "return=representation" });
  await audit(env2, actor, "announcement.cancel", "announcement", row.id, { reason, title: row.title });
  return rows?.[0];
}
__name(cancelAnnouncement, "cancelAnnouncement");
async function routeAction(env2, actor, action, payload) {
  switch (action) {
    case "me":
      return { user: { id: actor.user.id, email: actor.user.email }, admin: actor.admin };
    case "dashboard":
      return await dashboard(env2);
    case "listDrafts":
      return await list(env2, "liveops_event_drafts", "select=*&order=updated_at.desc&limit=100");
    case "saveDraft":
      return await saveDraft(env2, actor, payload);
    case "deleteDraft":
      return await deleteDraft(env2, actor, payload);
    case "listTemplates":
      return await list(env2, "liveops_admin_templates", "select=*&enabled=eq.true&order=name.asc&limit=100");
    case "saveTemplate":
      return await saveTemplate(env2, actor, payload);
    case "disableTemplate": {
      requireRole(actor, "editor");
      await supabaseFetch(env2, "/rest/v1/liveops_admin_templates", { method: "PATCH", query: `template_id=eq.${encodeEq(payload.templateId)}`, body: { enabled: false, updated_by: actor.user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, prefer: "return=minimal" });
      await audit(env2, actor, "template.disable", "event_template", payload.templateId);
      return { disabled: true };
    }
    case "cloneTemplateToDraft": {
      const template = await single(env2, "liveops_admin_templates", `template_id=eq.${encodeEq(payload.templateId)}&enabled=eq.true`);
      if (!template) throw new Error("template_not_found");
      const definition = normalizeDefinition(template.definition_json);
      if (payload.nextVersion) definition.version = Number(definition.version) + 1;
      return await cloneToDraft(env2, actor, definition, `${template.name} draft`, `template:${template.template_id}`);
    }
    case "listDefinitions":
      return await list(env2, "liveops_event_definitions", "select=event_id,version,scope,definition_json,config_hash,created_at,created_by&order=event_id.asc,version.desc&limit=200");
    case "cloneDefinitionToDraft": {
      const definitionRow = await single(env2, "liveops_event_definitions", `event_id=eq.${encodeEq(payload.eventId)}&version=eq.${Number(payload.version)}`);
      if (!definitionRow) throw new Error("definition_not_found");
      const definition = normalizeDefinition(definitionRow.definition_json);
      definition.version += 1;
      return await cloneToDraft(env2, actor, definition, `${definition.name} v${definition.version}`, `definition:${payload.eventId}@${payload.version}`);
    }
    case "publishDraft":
      return await publishDraft(env2, actor, payload);
    case "scheduleDefinition":
      return await scheduleDefinition(env2, actor, payload);
    case "listInstances":
      return await list(env2, "liveops_event_instances", "select=*&order=starts_at.desc&limit=200");
    case "rescheduleInstance":
      return await rescheduleInstance(env2, actor, payload);
    case "cancelInstance":
      return await cancelInstance(env2, actor, payload);
    case "archiveInstance":
      return await archiveInstance(env2, actor, payload);
    case "listRewards":
      return await list(env2, "liveops_admin_reward_catalog", "select=*&order=tier.asc,label.asc&limit=300");
    case "saveReward":
      return await saveReward(env2, actor, payload);
    case "leaderboard":
      return await leaderboard(env2, payload);
    case "eventStats":
      return await eventStats(env2, payload);
    case "operations":
      return await operations(env2);
    case "retryDeadLetter":
      return await retryDeadLetter(env2, actor, payload);
    case "remoteConfig":
      return await remoteConfig(env2);
    case "saveRemoteConfig":
      return await saveRemoteConfig(env2, actor, payload);
    case "healthEconomy":
      return await healthEconomy(env2);
    case "updateAlert":
      return await updateAlert(env2, actor, payload);
    case "resets":
      return await resets(env2);
    case "saveResetDefinition":
      return await saveResetDefinition(env2, actor, payload);
    case "retryResetRun":
      return await retryResetRun(env2, actor, payload);
    case "supportSearch":
      return await supportSearch(env2, payload);
    case "supportAccount":
      return await supportAccount(env2, payload);
    case "createSupportCase":
      return await createSupportCase(env2, actor, payload);
    case "updateSupportCase":
      return await updateSupportCase(env2, actor, payload);
    case "addSupportNote":
      return await addSupportNote(env2, actor, payload);
    case "controlCenter":
      return await controlCenter(env2);
    case "contentCatalog":
      return await contentCatalog(env2);
    case "listRedeemCodes":
      return await listRedeemCodes(env2);
    case "createRedeemCode":
      return await createRedeemCode(env2, actor, payload);
    case "setRedeemCodeEnabled":
      return await setRedeemCodeEnabled(env2, actor, payload);
    case "commandTimeline":
      return await commandTimeline(env2, payload);
    case "queueAdminCommand":
      return await queueAdminCommand(env2, actor, payload);
    case "approveAdminCommand":
      return await approveAdminCommand(env2, actor, payload);
    case "cancelAdminCommand":
      return await cancelAdminCommand(env2, actor, payload);
    case "retryAdminCommand":
      return await retryAdminCommand(env2, actor, payload);
    case "reverseAdminCommand":
      return await reverseAdminCommand(env2, actor, payload);
    case "listAdmins":
      return await listAdmins(env2);
    case "saveAdminUser":
      return await saveAdminUser(env2, actor, payload);
    case "listAnnouncements":
      return await listAnnouncements(env2);
    case "saveAnnouncement":
      return await saveAnnouncement(env2, actor, payload);
    case "cancelAnnouncement":
      return await cancelAnnouncement(env2, actor, payload);
    case "audit":
      return await list(env2, "liveops_admin_audit_log", "select=*&order=created_at.desc&limit=300");
    default:
      throw new Error("unknown_action");
  }
}
__name(routeAction, "routeAction");
function errorStatus(message) {
  if (["authentication_required", "invalid_session"].includes(message)) return 401;
  if (["admin_access_required", "insufficient_admin_role", "origin_not_allowed"].includes(message)) return 403;
  if (message.includes("not_found")) return 404;
  if (message.includes("conflict") || message.includes("overlap")) return 409;
  return 400;
}
__name(errorStatus, "errorStatus");
async function onRequest(context2) {
  const { request, env: env2 } = context2;
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    if (!action) throw new Error("action_required");
    if (MUTATING_ACTIONS.has(action)) assertOrigin(request, env2);
    const actor = await verifyUser(request, env2);
    const data = await routeAction(env2, actor, action, body?.payload ?? {});
    return json({ ok: true, data });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "unknown_error";
    console.error("VELDRYN Control API error", message);
    return json({ ok: false, error: message }, errorStatus(message));
  }
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-MXHGgI/functionsRoutes-0.4100610983927486.mjs
var routes = [
  {
    routePath: "/api/admin",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../Users/elroy/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
