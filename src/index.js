import { observe } from './observer/index';
import Watcher from './observer/watcher';
import { isPlainObject, noop } from './util/index';

function Vue(options) {
  this._init(options);
}

Vue.prototype._init = function (options) {
  const vm = this;
  vm.options = options;
  vm._watchers = [];

  if (!options.data) {
    options.data = {};
  }

  if (options.methods) {
    initMethods(vm);
  }

  initData(vm);

  if (options.computed) {
    initComputed(vm);
  }

  if (options.watch) {
    initWatch(vm);
  }

  if (options.render) {
    initRender(vm);
  }
};

Vue.prototype.$watch = function (expOrFn, cb, options) {
  const vm = this;
  if (isPlainObject(cb)) {
    return createWatcher(vm, expOrFn, cb, options);
  }
  options = options || {};
  options.user = true;
  const w = new Watcher(vm, expOrFn, cb, options);
  vm._watchers.push(w);
};

function initMethods(vm) {
  const methods = vm.options.methods;
  const keys = Object.keys(methods);
  for (let key of keys) {
    vm[key] = methods[key];
  }
}

function initData(vm) {
  const data = (vm._data = vm.options.data);
  let keys = Object.keys(data);
  for (let key of keys) {
    proxy(vm, data, key);
  }
  observe(data);
}

function initComputed(vm) {
  const computed = vm.options.computed;
  vm._computedWatchers = Object.create(null);
  const keys = Object.keys(computed);
  for (let key of keys) {
    const userDef = computed[key];
    const getter = typeof userDef === 'function' ? userDef : userDef.get;

    const watcher = new Watcher(vm, getter, noop, { lazy: true });
    vm._computedWatchers[key] = watcher;

    Object.defineProperty(vm, key, {
      enumerable: true,
      configurable: true,
      get: function computedGetter() {
        return watcher.evaluate();
      },
    });
  }
}

function initWatch(vm) {
  const watch = vm.options.watch;
  for (const key in watch) {
    const handler = watch[key];
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, expOrFn, handler, options) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === 'string') {
    handler = vm[handler];
  }
  return vm.$watch(expOrFn, handler, options);
}

function initRender(vm) {
  const render = vm.options.render;
  const w = new Watcher(vm, render, noop);
  vm._watcher = w;
  vm._watchers.push(w);
}

function proxy(target, source, key) {
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get: function proxyGetter() {
      return source[key];
    },
    set: function proxySetter(val) {
      source[key] = val;
    },
  });
}

export default Vue;
