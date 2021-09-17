import {
  def,
  hasOwn,
  hasProto,
  isObject,
  isValidArrayIndex,
} from '../util/index';
import { arrayMethods } from './array';
import Dep from './dep';

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

// 这个类负责对一数据进行观测
export class Observer {
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

// 对一个对象进行观测，把obj的所有属性都设置为响应式的
export function observe(value) {
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

// 把obj的key属性设置为响应式的
// 或者为obj添加一个key属性，并且把这个key属性也设置成响应式的
export function defineReactive(obj, key, val) {
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
export function set(target, key, val) {
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
export function del(target, key) {
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
