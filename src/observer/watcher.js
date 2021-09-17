import { Observer } from './index';
import { hasOwn, isObject } from '../util/index';
import Dep from './dep';

let uid = 0;
export default class Watcher {
  // 唯一标识
  id;

  // 渲染页面操作函数是哪个组件的
  vm;

  // 渲染页面操作函数
  cb;

  // 依赖
  // watcher要把自己的依赖存起来，等下一次收集依赖时再与新收集到的依赖作对比，
  // 看看是否需要取消订阅不再依赖的发布者
  deps;
  depIds;

  // 新一轮依赖
  newDeps;
  newDepIds;

  constructor(vm, cb) {
    this.id = uid++;
    this.vm = vm;
    this.cb = cb;

    this.deps = [];
    this.depIds = new Set();
    this.newDeps = [];
    this.newDepIds = new Set();

    // 创建watcher后，马上执行以进行依赖收集
    this.run();
  }

  update() {
    this.run();
  }

  run() {
    Dep.target = this;
    this.cb.call(this.vm);
    Dep.target = null;

    // 清除上轮用过但现在没用的依赖
    this.cleanupDeps();
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
