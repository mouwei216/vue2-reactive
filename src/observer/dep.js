let uid = 0;
export default class Dep {
  // 静态变量，全局唯一，存放当前收集依赖的watcher
  static target;

  // 唯一标识
  id;

  // 订阅者们(Watcher)
  subs;
  subIds;

  constructor() {
    this.id = uid++;
    this.subs = [];
    this.subIds = new Set();
  }

  // 添加一个订阅者
  addSub(sub) {
    if (!this.subIds.has(sub.id)) {
      this.subs.push(sub);
      this.subIds.add(sub.id);
    }
  }

  // 删除一个订阅者
  removeSub(sub) {
    if (this.subIds.has(sub.id)) {
      this.subIds.delete(sub.id);
      const index = this.subs.indexOf(sub);
      if (index >= 0) {
        this.subs.splice(index, 1);
      }
    }
  }

  // 通通知与这个dep关联的订阅者们，属性发生了变化
  notify() {
    const subs = this.subs.slice();
    for (let sub of subs) {
      sub.update();
    }
  }
}

const targetStack = [];
export function pushTarget(target) {
  targetStack.push(target);
  Dep.target = target;
}

export function popTarget() {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1];
}
