import { observe } from './observer/index';
import Watcher from './observer/watcher';

function Vue(options) {
  this._init(options);
}

Vue.prototype._init = function (options) {
  const vm = this;
  vm.options = options;
  if (!options.data) {
    options.data = {};
  }

  initData(vm);

  if (options.render) {
    initRender(vm);
  }
};

function initData(vm) {
  const data = (vm._data = vm.options.data);
  let keys = Object.keys(data);
  for (let key of keys) {
    proxy(vm, data, key);
  }
  observe(data);
}

function initRender(vm) {
  const render = vm.options.render;
  const w = new Watcher(vm, render);
  vm._watcher = w;
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
