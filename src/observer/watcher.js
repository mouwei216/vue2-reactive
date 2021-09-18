import { Observer } from './index';
import {
  hasOwn,
  invokeWithErrorHandling,
  isObject,
  parsePath,
} from '../util/index';
import Dep, { popTarget, pushTarget } from './dep';
import { traverse } from './traverse';

let uid = 0;
export default class Watcher {
  // 唯一标识
  id;

  // 组件实例，渲染页面、监测给定数据都是基于某个组件的
  vm;

  // 渲染页面操作函数，或者是转化后的取值函数，因为需要取值所以命名为getter
  getter;

  // getter的返回值，一般来说渲染页面操作函数没有返回值，但监测给定数据时需要把最新值传给回调函数
  value;

  // getter执行完后需要执行的函数，一般来说渲染页面操作函数没有回调函数，但监测给定数据时肯定是有回调函数的
  cb;

  // 依赖
  // watcher要把自己的依赖存起来，等下一次收集依赖时再与新收集到的依赖作对比，
  // 看看是否需要取消订阅不再依赖的发布者
  deps;
  depIds;

  // 新一轮依赖
  newDeps;
  newDepIds;

  // 监测给定数据时是否进行深度监测
  deep;

  // 是否要对cb函数进行错误处理
  user;

  // 标识是lazy watcher
  lazy;

  // 标识lazy watcher的依赖有没变化
  dirty;

  constructor(vm, expOrFn, cb, options) {
    this.id = uid++;
    this.vm = vm;
    this.cb = cb;

    this.deps = [];
    this.depIds = new Set();
    this.newDeps = [];
    this.newDepIds = new Set();

    this.options = options || {};
    this.deep = !!this.options.deep;
    this.user = !!this.options.user;
    this.lazy = !!this.options.lazy;
    this.dirty = this.lazy;

    if (typeof expOrFn === 'function') {
      this.getter = expOrFn;
    } else {
      // 转化为取值操作函数
      this.getter = parsePath(expOrFn);
    }

    // 开始收集依赖
    // this.value = this.get();
    // layz watcher不能马上执行
    this.value = this.lazy ? undefined : this.get();
  }

  update() {
    // lazy watcher在依赖变化时只设置dirty标识
    if (this.lazy) {
      this.dirty = true;
    } else {
      this.run();
    }
  }

  // 执行getter函数，并且开启依赖收集
  get() {
    // 当前watcher入栈
    pushTarget(this);
    const value = this.getter.call(this.vm, this.vm);

    // 要进行深度监测
    if (this.deep) {
      // 递归对value的每个属性进行取值操作以进行依赖收集
      traverse(value);
    }

    // 当前watcher出栈
    popTarget();

    // 清除上轮用过但现在没用的依赖
    this.cleanupDeps();

    // 当前watcher出栈后，如果Dep.target还有值，则说明Dep.target中的watcher依赖于当前watcher
    // 要让其收集当前watcher的所有依赖
    if (Dep.target) {
      Dep.target.dependWatcher(this);
    }

    return value;
  }

  run() {
    const value = this.get();
    const oldValue = this.value;
    this.value = value;

    if (value !== oldValue || this.deep) {
      if (this.user) {
        invokeWithErrorHandling(this.cb, vm, value, oldValue);
      } else {
        this.cb.call(this.vm, value, oldValue);
      }
    }
  }

  // 获取lazy watcher的目标属性的值
  evaluate() {
    if (this.dirty) {
      this.value = this.get();
      this.dirty = false;
    }

    return this.value;
  }

  // 收集依赖(订阅发布者)
  depend(dep) {
    if (this.newDepIds.has(dep.id)) {
      return;
    }

    this.newDepIds.add(dep.id);
    this.newDeps.push(dep);

    if (this.depIds.has(dep.id)) {
      // 之前已经添加过就不必再添加了
      return;
    }

    dep.addSub(this);
  }

  // 递归收集数组的每一项的结构变化dep
  dependArray(arr) {
    for (let item of arr) {
      if (!isObject(item)) {
        continue;
      }

      if (hasOwn(item, '__ob__') && item.__ob__ instanceof Observer) {
        this.depend(item.__ob__.dep);
      }

      if (Array.isArray(item)) {
        this.dependArray(item);
      }
    }
  }

  // 收集依赖watcher的所有依赖
  dependWatcher(watcher) {
    for (let dep of watcher.deps) {
      this.depend(dep);
    }
  }

  // 清除上轮用过但现在没用的依赖
  cleanupDeps() {
    // 对于旧的dep，在新的上面找，如果没找到则说明新一轮不再依赖这个旧dep
    for (let dep of this.deps) {
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }

    // 新旧交换，并清空新的，比上面的快
    let tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  }
}
