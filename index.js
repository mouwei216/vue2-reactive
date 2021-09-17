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

// 这个类负责对一数据进行观测
class Observer {
  constructor(value) {
    def(value, '__ob__', this);

    if (Array.isArray(value)) {
      // todo
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
}

// 把obj的key属性设置为响应式的
// 或者为obj添加一个key属性，并且把这个key属性也设置成响应式的
function defineReactive(obj, key, val) {
  const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, key);
  // obj的key属性不可以重新配置就别瞎搞了
  if (propertyDescriptor && propertyDescriptor.configurable === false) {
    return;
  }

  // 如果是新添加的key，propertyDescriptor为undefined
  if (propertyDescriptor) {
    val = obj[key];
  }

  // 如果obj的key属性的值也是个对象，则继续对它的属性进行设置
  observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      return val;
    },
    set: function reactiveSetter(newVal) {
      // 新旧值都一样就别瞎搞了吧
      if (newVal === val || (newVal !== newVal && val !== val)) {
        return;
      }
      val = newVal;

      // 如果新设置的值没有被观测过则要对其进行观测
      observe(newVal);

      console.log('设置了新值，数据发变化了，重新渲染页面吧');
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

// 为target添加一个响应式的key属性，
function set(target, key, val) {
  // key已经存在，并且不是Object原型的属性
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return;
  }

  // target没有观测过，那就直接添加
  if (!target.__ob__) {
    target[key] = val;
    return;
  }

  defineReactive(target, key, val);

  console.log('添加了属性，渲染页面吧');
}

// 删除target的key属性
function del(target, key) {
  if (!target.hasOwnProperty(key)) {
    return;
  }

  delete target[key];

  if (!target.__ob__) {
    return;
  }

  console.log('删除了属性，渲染页面吧');
}
