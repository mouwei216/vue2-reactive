// 判断一个值是否是对象类型
function isObject(value) {
  return value !== null && typeof value === 'object';
}

// 这个类负责对一数据进行观测
class Observer {
  constructor(value) {
    this.walk(value);
  }

  // 把obj的每一个属性都设置为响应式的
  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i]);
    }
  }
}

// 把obj的key属性设置为响应式的
function defineReactive(obj, key) {
  const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, key);
  // obj的key属性不可以重新配置就别瞎搞了
  if (propertyDescriptor.configurable === false) {
    return;
  }

  // 取出key对应的值
  let val = obj[key];

  // 如果obj的key属性的值也是个对象，则继续对它的属性进行设置
  observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      return val;
    },
    set: function reactiveSetter(newVal) {
      // 新旧值都一样就别瞎搞了吧，val !== val 判断val是否是NaN
      if (newVal === val || (newVal !== newVal && val !== val)) {
        return;
      }
      val = newVal;

      console.log('设置了新值，数据发变化了，重新渲染页面吧');
    },
  });
}

// 对一个对象进行观测，把obj的所有属性都设置为响应式的
function observe(obj) {
  // 不是对象就别来瞎搞了
  if (!isObject(obj)) {
    return;
  }

  // 观测过程都在这个类实例化过程中
  new Observer(obj);
}
