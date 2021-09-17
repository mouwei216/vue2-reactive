// 判断一个值是否是对象类型
function isObject(value) {
  return value !== null && typeof value === 'object';
}

// 把一个key以数据描述符的形式定义到obj上
function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true,
  });
}

// 判断obj自身是否有key属性
function hasOwn(obj, key) {
  return obj.hasOwnProperty(key);
}

// 判断是否是合法的索引
function isValidArrayIndex(val) {
  const n = parseFloat(String(val));
  return n >= 0 && Math.floor(n) === n && Object.isFinite(val);
}

// 判断是否支持__proto__属性
const hasProto = '__proto__' in {};

// 数组的所有方法都在这个原型上
const arrayProto = Array.prototype;

// 我们重新定义的7个数组函数存放在这里
const arrayMethods = Object.create(arrayProto);

// 7个要重新定义的函数名
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
];

// 把重写的7个函数定义到arrayMethods中去
methodsToPatch.forEach(function (method) {
  const original = arrayProto[method];

  // 把method定义到arrayMethods中
  def(arrayMethods, method, function mutator(...args) {
    // 先调用原生方法,得到结果
    const result = original.apply(this, args);

    // 再判断是否有新的数据插入到数组中，如果有则要对这些新插入的数据进行观测
    let inserted;

    // 7个方法中，只push/unshift/splice有可能插入新的数据
    switch (method) {
      // push/unshift(item1, item2, ...)
      case 'push':
      case 'unshift':
        inserted = args;
        break;

      // splice(startIndex, howmany, item1, item2, ...)
      case 'splice':
        inserted = args.slice(2);
        break;
    }

    const ob = this.__ob__;

    // 需要对新插入的数据进行观测
    if (inserted) ob.observeArray(inserted);

    // console.log('修改了数组，重新渲染页面吧');
    ob.dep.notify();

    return result;
  });
});

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

// 这个类负责对一数据进行观测
class Observer {
  dep;

  constructor(value) {
    this.dep = new Dep();

    def(value, '__ob__', this);

    if (Array.isArray(value)) {
      if (hasProto) {
        // 支持__proto__属性，则设置value的__proto__属性为arrayMethods
        // arrayMethods中定义了重写的7个方法
        protoAugment(value, arrayMethods);
      } else {
        // 不支持__proto__属性，则把重写的7个方法定义到value中
        copyAugment(value, arrayMethods, arrayKeys);
      }

      // 观测数组的每一项
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  }

  // 把obj的每一个属性都设置为响应式的
  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i]);
    }
  }

  // 对数组的每一项进行观测
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

// 把obj的key属性设置为响应式的
// 或者为obj添加一个key属性，并且把这个key属性也设置成响应式的
function defineReactive(obj, key, val) {
  // 为每个属性都定义一个Dep，用到这个属性的watcher都会被收集到这个Dep的subs中
  const dep = new Dep();

  const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, key);
  // obj的key属性不可以重新配置就别瞎搞了
  if (propertyDescriptor && propertyDescriptor.configurable === false) {
    return;
  }

  const getter = propertyDescriptor && propertyDescriptor.get;
  const setter = propertyDescriptor && propertyDescriptor.set;
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  // 如果obj的key属性的值也是个对象，则继续对它的属性进行设置
  let ob = observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

      // 如果Dep.target存在，则说是现在需要进行依赖收集
      if (Dep.target) {
        Dep.target.depend(dep);

        // 有ob说明当前属性的值是一个对象或数组
        // 如果一个属性的值是对象或数组，则ob中的dep代表的是对象或数组的结构变化dep
        // 结构变化对应于：
        //   对象：添加属性/删除属性
        //   数组：插入数组项/删除数组项/改变数组项顺序
        if (ob) {
          // 收集结构变化dep
          Dep.target.depend(ob.dep);

          // 如果一个属性的值是数组, 还需要递归收集数组每一项的结构变化dep
          if (Array.isArray(value)) {
            Dep.target.dependArray(value);
          }
        }
      }

      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;

      // 新旧值都一样就别瞎搞了吧
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }

      if (getter && !setter) return;
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }

      // 如果新设置的值没有被观测过则要对其进行观测
      ob = observe(newVal);

      // console.log('设置了新值，数据发变化了，重新渲染页面吧');
      dep.notify();
    },
  });
}

// 对一个对象进行观测，把obj的所有属性都设置为响应式的
function observe(value) {
  // 不是对象或者数组就别来瞎搞了
  if (!isObject(value)) {
    return;
  }

  let ob;

  // 已经被观测过了就别来瞎搞了
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else {
    ob = new Observer(value);
  }

  return ob;
}

function protoAugment(target, src) {
  target.__proto__ = src;
}

function copyAugment(target, src, keys) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

// 为target添加一个响应式的key属性，
function set(target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return;
  }

  // key已经存在，并且不是Object原型的属性
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return;
  }

  const ob = target.__ob__;

  // target没有观测过，那就直接添加
  if (!ob) {
    target[key] = val;
    return;
  }

  defineReactive(target, key, val);

  // console.log('修改了属性，渲染页面吧');
  ob.dep.notify();
}

// 删除target的key属性
function del(target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }

  if (!target.hasOwnProperty(key)) {
    return;
  }

  delete target[key];

  const ob = target.__ob__;
  if (!ob) {
    return;
  }

  // console.log('删除了属性，渲染页面吧');
  ob.dep.notify();
}

let depUid = 0;
class Dep {
  // 静态变量，全局唯一，存放当前收集依赖的watcher
  static target;

  // 唯一标识
  id;

  // 订阅者们(Watcher)
  subs;
  subIds;

  constructor() {
    this.id = depUid++;
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

let watcherUid = 0;
class Watcher {
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
    this.id = watcherUid++;
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
