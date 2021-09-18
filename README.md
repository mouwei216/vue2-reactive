# vue2-reactive

一步一步学习 vue2 响应式

```bash
git clone https://github.com/mouweimo/vue2-reactive.git
cd vue2-reactive
npm install
npm run dev
```

## Vue 响应式

Vue 响应式是指页面上使用到的数据变化时，自动重新渲染页面。

## 观测数据

根据上面的定义，我们第一步需要监测数据的变化。

Javascript 有个函数：[**Object.defineProperty**](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)，它可以把一个对象上的属性转化为 getter/setter 的形式。当对这个对象的某个属性进行取值时就会调用这个属性的 getter。当设置这个对象的某个属性的值时，就会调用这个属性的 setter。设置值不就是数据发生了变化吗？

好了，我们页面渲染中用到的数据主要是组件的数据，我们以 data 为例子。data 最终的形式是一个对象，所以我们可以用 Object.defineProperty 这个函数来把 data 上所有的属性都转化为 getter/setter 的形式。只要属性重新设置值，就会调用这个属性的 setter，我们就可以在这个 setter 中重新渲染页面了。

Talk is cheep, show you the code！搞个 observe(obj)函数，把一个对象传进来，就会把这个对象所有的属性都转化为 getter/setter 形式。这个过程暂且叫做观测数据。我们把对对象的观测的细节封装到 Observe 类中去。当 new 一个 Observer 时，自动对这个对象进行观测。

```javascript
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

// 对一个对象进行观测，把obj的所有属性都设置为响应式的
function observe(obj) {
  // 不是对象就别来瞎搞了
  if (!isObject(obj)) {
    return;
  }

  // 观测过程都在这个类实例化过程中
  new Observer(obj);
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
```

**[[去 CodeSandBox 试一试]](https://codesandbox.io/s/01-zui-ji-ben-de-jian-ce-shu-ju-bian-hua-owsw3)**

### 问题 1

如果 obj 的 key 属性的值为数组怎么办？这样第二次进入到 observe()时，会对数组的索引进行 Object.defineProperty()，但是很尴尬，Object.defineProperty 对数组的索引进行设置是不生效的。

对于这个问题，我们需要把数组的观测与对象区别开来，我们先搞对象再搞数组吧。

```javascript
// 这个类负责对一数据进行观测
class Observer {
  constructor(value) {
    if (Array.isArray(value)) {
      // todo
    } else {
      this.walk(value);
    }
  }

  ...
}
```

### 问题 2

如果一个 obj 已经被观测过怎么办？

由于对一个对象进行观测时我们都会 new 一个 Observer 实例，所以我们可以用这个实例来标识一个对象是否被观测过。那我们可以设置一个不可以枚举的属性在 obj 上，这个属性的值就是 Observer 实例，属性名字就叫**ob**。一来，可以通过这个属性来判断 obj 是否已被观测过，如果被观测过就不再对其进行观测了。二来，在下面遍历 obj 所有的 key 的过程中，可以使这个属性不被遍历出来，从而避免把这个属性也设置成响应式的。

```javascript
// 把一个key以数据描述符的形式定义到obj上
function def (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

// 判断obj自身是否有key属性
function hasOwn(obj, key) {
  return obj.hasOwnProperty(key);
}

// 这个类负责对一数据进行观测
class Observer {
  constructor(value) {
    def(value, '__ob__', this);

    ...
  }

  ...
}

// 对一个对象进行观测，把obj的所有属性都设置为响应式的
function observe(value) {
  ...

  let ob;

  // 已经被观测过了就别来瞎搞了
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else {
    ob = new Observer(value);
  }

  return ob;
}
```

### 问题 3

在 setter 里面，如果新设置的值没有被观测过怎么办？

当然也应该对这个新设置的值进行观测啦！

```javascript
// 把obj的key属性设置为响应式的
function defineReactive(obj, key) {
  ...

  Object.defineProperty(obj, key, {
    ...

    set: function reactiveSetter(newVal) {
      ...

      // 如果新设置的值没有被观测过则要对其进行观测
      observe(newVal);

      console.log('设置了新值，数据发变化了，重新渲染页面吧');
    }
  });
}
```

### 问题 4

如果观测完 obj 后，再在 obj 添加一个新属性或者删除 obj 的一个已有的属性怎么办？

很尴尬，没有办法来监测 obj 的属性的添加和删除。但我们可以搞些替代方法 set(obj, key, val)和 del(obj, key)。

```javascript
// 为target添加一个响应式的key属性，值为val
function set(target, key, val) {
  // key已经存在，并且不是Object原型的属性，直接设置
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

  ...
}

```

### 问题 5

要是 obj 中的属性原本就是用 Object.defineProperty()定义了 gettter/setter，或者只定义了 getter，或者只定义了 setter，又或者 getter 和 setter 都没定义呢，怎么办?

这。。。。。。。这要对 Object.defineProperty()理解到得够深入才能理解吖。

```javascript
// 把obj的key属性设置为响应式的
// 或者为obj添加一个key属性，并且把这个key属性也设置成响应式的
function defineReactive(obj, key, val) {
  ...

  const getter = propertyDescriptor && propertyDescriptor.get;
  const setter = propertyDescriptor && propertyDescriptor.set;
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  // 如果obj的key属性的值也是个对象，则继续对它的属性进行设置
  observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

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
      observe(newVal);

      console.log('设置了新值，数据发变化了，重新渲染页面吧')
    }
  });
}
```

## 监测数组的变化

现在来研究研究数组。既然**Object.defineProperty**对数组索引设置不生效，那我们只能另找办法了。

首先，什么样的操作会改变数组？

1.  修改数组的 length 属性
2.  通过索引去修改数组项的值
3.  调用一些修改自身数组的方法（**push/pop/shift/unshift/splice/sort/reverse**）

对应：

1.  办法，不能够，后面搞些替代方法给你用。
2.  又是没办法，又是不能够，又是后面搞些替代方法给你用。
3.  我们已经知道了**push/pop/shift/unshift/splice/sort/reverse**这 7 个方法能够改变数组，那么有没有办法监听数组这几个方法呢？

    办法是有的，不过需要理解下 Javascript 的原型链概念。这里对原型链不作多介绍，不了解的某度一下。

    我们就是通过改变数组（这里的数组要监测的数组，并不是 Javascript 中的 Array 对象）的原型，来监测数组的是否调用**push/pop/shift/unshift/splice/sort/reverse**这 7 个方法的。

    在新原型中，我们让新原型的原型指向数组的旧原型，然后我们在新原型中自己定义 7 个同名方法，当要监测的数组调用**push/pop/shift/unshift/splice/sort/reverse**这 7 个方法时就会去调用新原型中我们自己定义的方法，在这里我们就可以通知页面去重新渲染了。

### 定义新原型

```javascript
// 旧原型，数组的所有方法都在这个原型上
const arrayProto = Array.prototype;

// 新原型，我们重新定义的7个数组方法存放在这里。注意新原型的原型是旧原型arrayProto
const arrayMethods = Object.create(arrayProto);

// 7个要重新定义的方法名
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
];

// 把7个方法定义到新原型arrayMethods中
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

    // 需要对新插入的数据进行观测
    if (inserted) this.__ob__.observeArray(inserted);

    console.log('修改了数组，重新渲染页面吧');
    return result;
  });
});
```

### 更改数组原型

新原型定义好了我们在观测数组时，就把数组的原型改为新原型

```javascript
class Observer {
  constructor(value) {
    if (Array.isArray(value)) {
      // 把数组value的原型设置为新原型
      protoAugment(value, arrayMethods);
    } else {
      this.walk(value);
    }
  }
}

function protoAugment(target, src) {
  target.__proto__ = src;
}
```

### 问题 1

有些浏览器不支持**proto**。

那我们可以直接把重新定义的函数定义到数组中

```javascript
...
const hasProto = '__proto__' in {};
const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

class Observer {
  constructor(value) {
    if (Array.isArray(value)) {
      if (hasProto) {
        // 支持__proto__属性，则设置value的__proto__属性为arrayMethods
        protoAugment(value, arrayMethods);
      } else {
        // 不支持__proto__属性，则把重写的7个方法定义到value中
        copyAugment(value, arrayMethods, arrayKeys);
      };
    } else {
	  this.walk(value);
    }
  }
}

function copyAugment(target, src, keys) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

...
```

### 问题 2

当数组的项为对象时，我修改对象的属性时怎么办？

这时我们应该再对数组的每一项进行观测，也就是进行递归观测。

```javascript
class Observer {
  constructor(value) {
    if (Array.isArray(value)) {
      ...

      // 对数组的每一项进行观测
      this.observeArray(value);
    } else {
	  this.walk(value);
    }
  }

  // 对数组的每一项进行观测
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }

  ...
}
```

### 修改数组的 length 属性与通过索引去修改数组项的值

再来搞下修改数组的 length 属性和通过索引去修改数组项的值的代替方法

1.  修改数组的 length 属性
    用 splice 方法就可了，因为我们已经自定义过 splice 方法了。arr.length = newLength ⇒ arr.splice(newLength)
2.  通过索引去修改数组项的值
    还是用 splice 方法。arr[index] = newValue ⇒ arr.splice(index, 1, newValue)

支持下用 set()/del()方法吧

```javascript
// 判断是否是合法的索引
function isValidArrayIndex (val){
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && Object.isFinite(val)
}

function set(target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return;
  }

  ...
}

function del(target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }

  ...
}
```

## 完整代码

```javascript
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

    // 需要对新插入的数据进行观测
    if (inserted) this.__ob__.observeArray(inserted);

    console.log('修改了数组，重新渲染页面吧');
    return result;
  });
});

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

// 这个类负责对一数据进行观测
class Observer {
  constructor(value) {
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
  observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

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

  // target没有观测过，那就直接添加
  if (!target.__ob__) {
    target[key] = val;
    return;
  }

  defineReactive(target, key, val);

  console.log('修改了属性，渲染页面吧');
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

  if (!target.__ob__) {
    return;
  }

  console.log('删除了属性，渲染页面吧');
}
```

### 去试试

**[[去 CodeSandBox 试一试]](https://codesandbox.io/s/02-wei-tian-jia-depyu-watcherban-qwonl)**

## 发布/订阅

问题来了，我们是把 data 的全部属性都转为 getter/setter 的形式，那我们怎么知道渲染页面用到了 data 的哪些属性呢？没理由没用到的属性发生了变化都去重新渲染页面吧。

咦，这情况不是跟我们的发布/订阅模式很像么？

想想看，data 的属性不就是一个个的发布者么？而渲染页面这个操作不就是订阅者的回调函数么？

嘿嘿，我们为每个属性搞个发布者，为渲染页面这操作搞个订阅者，再把渲染页面这操作作为订阅者的回调函数。

之前不是说了要把属性都转为 getter/setter 吗，那这个转的过程搞个发布者

渲染页面操作是在我们组件挂载的过程中进行的，在挂载的过程中搞个订阅者，把渲染页面操作封装为订阅者的一个方法

现在发布者（属性）和订阅者（渲染页面操作）都有了，再来就是要搞订阅者怎么去订阅发布者了

再想想，渲染页面过程中如果用到某个属性就一定会对这个属性进行取值操作吖，对一个属性进行取值操作不是会调用在观测数据时设置的 getter 吗？好了，我们就在这个 getter 中让订阅者去订阅发布者。

### 发布者

先来搞发布者，叫什么好呢？叫 Dep（Dependency，依赖）吧，毕竟渲染页面这个操作就是依赖属性来搞的。

```javascript
let depUid = 0;
class Dep {
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

  // 通知与这个dep关联的订阅者们，属性发生了变化
  notify() {
    const subs = this.subs.slice();
    for (let sub of subs) {
      sub.update();
    }
  }
}
```

### 订阅者

再来，订阅者，叫什么好呢？叫 Watcher 吧。

```javascript
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
  }

  update() {
    this.cb.call(this.vm);
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

  // 清除上轮用过但现在没用的依赖
  cleanupDeps() {
    // 对于旧的dep，在新的上面找，如果没找到则说明新一轮不再依赖这个旧dep
    for (let dep of this.deps) {
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }

    // this.deps = this.newDeps;
    // this.depIds = this.newDepIds;
    // this.newDeps = [];
    // this.newDepIds = new Set();

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
```

## 依赖收集

继续，让订阅者去订阅发布者（让 watcher 去收集依赖）。

```javascript
function defineReactive(obj, key, val) {
  // 为每个属性都定义一个Dep，用到这个属性的watcher都会被收集到这个Dep的subs中
  const dep = new Dep();

  ...

  Object.defineProperty(obj, key, {
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

      // 订阅者watcher哪里来吖???
      // watcher.depend(dep);

      return value;
    },
    ....
  });
}
```

订阅者哪里来吖？先让我研究研究。

有了，渲染页面函数不是在 wathcer 中吗，在挂载过程中搞这个 watchr 时就让渲染页面函数执行一遍，执行时就会对使用到的属性取值，不就调用属性的 getter 吗？这时不就是有 watcher 了吗？渲染页面函数执行前搞个全局变量来存放这个 watcher，在 getter 中就能拿到了吖。

我们把当前 watcher 放在 Dep.target 上面。

```javascript
class Dep {
  // 静态变量，全局唯一，存放当前收集依赖的watcher
  static target;
  ...
}

class Watcher {
  ...

  constructor(vm, cb) {
  	...

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
}

function defineReactive(obj, key, val) {
  // 为每个属性都定义一个Dep，用到这个属性的watcher都会被收集到这个Dep的subs中
  const dep = new Dep();

  ...

  Object.defineProperty(obj, key, {
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

      // Dep.target如果有值，则说明现在需要收集依赖
      if (Dep.target) {
        Dep.target.depend(dep);
      }

      return value;
    },
    ....
  });
}
```

## 通知更新

继续，把通知更新的地方完成。

```javascript
function defineReactive(obj, key, val) {
  ...
  Object.defineProperty(obj, key, {
    ...
    set: function reactiveSetter(newVal) {
      ...

      //console.log('设置了新值，数据发变化了，重新渲染页面吧')
      dep.notify();
    }
  });
}

// 为target添加一个响应式的key属性，
function set(target, key, val) {
  ...
  defineReactive(target, key, val);

  // dep哪里来？？？？？？
  // dep.notify();
}

// 删除target的key属性
function del(target, key) {
  ...
  if (!target.__ob__) {
    return;
  }

  // dep哪里来？？？？？？
  // dep.notify();
}
```

我去，set()函数和 del()函数里的 dep 哪里来？还有处理数组里面的函数哪找 dep？
先让我研究研究。。。。

## 结构变化 dep

有意思了，那些地方是改了对象或者数组的结构：

1.  对象：添加新属性、删除旧属性
2.  数组：插入项、删除项、改变数组项的顺序

我们可以为对象和数组也搞个 dep（结构变化 dep），当它们的结构变化时，它们的结构变化 dep 通知 watcher 去更新。

当一个属性的值是对象或数组时，watcher 收集这个属性的 dep 时，也要让 watcher 去收集这个属性的值的结构变化 dep。当这个属性的值是数组时，不仅要收集这个值的结构变化 dep，还需要递归收集数组每一项的结构变化 dep。这样当它们的结构变化时，就能够通知 watcher 了。

嗯。。。数组和对象的结构变化 dep 存放在哪里好呢。

有了，在观测时，我们不是在每个对象或数组中设置了个**ob**属性吗？**ob**是 Observer 的实例，结构变化 dep 就存放在 Observer 实例中。

```javascript
class Observer {
  // 结构变化dep
  dep;

  constructor(value) {
    this.dep = new Dep();

    ...
  }

  ...
}

function defineReactive(obj, key, val) {
  ...

  // 如果obj的key属性的值也是个对象，则继续对它的属性进行设置
  let ob = observe(val)

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
      ...
      // 如果新设置的值没有被观测过则要对其进行观测
      // 新设置值时，要ob应该为新值的ob，所以要更新
      ob = observe(newVal);

      dep.notify();
    }
  });
}


class Watcher() {
  ...

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

  ...
}
```

继续，把通知更新的地方完成。

```javascript
function set(target, key, val) {
  ...
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

function del(target, key) {
  ...

  const ob = target.__ob__;
  if (!ob) {
    return;
  }

  // console.log('删除了属性，渲染页面吧');
  ob.dep.notify();
}

methodsToPatch.forEach(function (method) {
  const original = arrayProto[method];

  // 把method定义到arrayMethods中
  def(arrayMethods, method, function mutator(...args) {
    ...

    const ob = this.__ob__;

    // 需要对新插入的数据进行观测
    if (inserted) ob.observeArray(inserted);

    // console.log('修改了数组，重新渲染页面吧');
    ob.dep.notify();

    return result;
  });
});
```

搞定

## 完整代码

```javascript
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
```

### 去试试

**[[去CodeSandBox试一试]](https://codesandbox.io/s/03-wan-zheng-ban-ben-peht2)**

## 搭建测试环境

代码太多了，还是搭建一个测试环境，把代码分割下放在不同的文件下吧。

### 方法 1

把项目克隆下来：[Github 地址](https://github.com/mouweimo/vue2-reactive)

### 方法 2

把文件都按目录结构放好，然后打开终端，cd 进入 projectRoot 目录，然后执行：

```javascript
npm install
npm run dev
```

就可以快乐的玩耍啦！

### 目录结构

```javascript
projectRoot
|—— src
|   |—— index.js
|   |—— observer
|   |   |—— array.js
|   |   |—— dep.js
|   |   |—— index.js
|   |   |—— watcher.js
|   |
|   |—— util
|       |—— index.js
|—— index.html
|—— .babelrc
|—— package.json
|—— rollup.config.js
```

### src/observer/index.js

```javascript
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
```

### src/observer/array.js

```javascript
import { def } from '../util/index';

// 数组的所有方法都在这个原型上
const arrayProto = Array.prototype;

// 我们重新定义的7个数组函数存放在这里
export const arrayMethods = Object.create(arrayProto);

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
```

### src/observer/dep.js

```javascript
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
```

### src/observer/watcher.js

```javascript
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
```

### src/util/index.js

```javascript
// 判断一个值是否是对象类型
export function isObject(value) {
  return value !== null && typeof value === 'object';
}

// 把一个key以数据描述符的形式定义到obj上
export function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true,
  });
}

// 判断obj自身是否有key属性
export function hasOwn(obj, key) {
  return obj.hasOwnProperty(key);
}

// 判断是否是合法的索引
export function isValidArrayIndex(val) {
  const n = parseFloat(String(val));
  return n >= 0 && Math.floor(n) === n && Object.isFinite(val);
}

// 判断是否支持__proto__属性
export const hasProto = '__proto__' in {};
```

### src/index

```javascript
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
```

### index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>
  <body>
    <div>
      <input id="firstname" type="text" />
      <button onclick="changeFirstname()">修改firstname</button>
      <br />
      <input id="lastname" type="text" />
      <button onclick="changeLastname()">修改lastname</button>
      <br />
      <input id="age" type="text" />
      <button onclick="changeAge()">修改age</button>
      <br />
      <input id="arrAdd" type="text" />
      <button onclick="arrAdd()">数组添加一项</button>
    </div>
    <script src="./dist/vue.js"></script>
    <script>
      const firstnameInput = document.querySelector('#firstname');
      const lastnameInput = document.querySelector('#lastname');
      const ageInput = document.querySelector('#age');
      const arrAddInput = document.querySelector('#arrAdd');

      function changeFirstname() {
        vm.firstname = firstnameInput.value;
      }

      function changeLastname() {
        vm.lastname = lastnameInput.value;
      }

      function changeAge() {
        vm.age = ageInput.value;
      }

      function arrAdd() {
        vm.arr.push(arrAddInput.value);
      }

      function render() {
        console.log('\r\n');
        console.log(`开始渲染页面。。。。。。。。。。`);
        console.log(`firstname: ${this.firstname}, lastname: ${this.lastname}`);
        console.log(`arr: ${JSON.stringify(this.arr)}`);
        console.log(`页面渲染完成。。。。。。。。。。`);
      }

      const vm = new Vue({
        render,
        data: {
          firstname: 'HXK',
          lastname: 'dksafl',
          age: 20,
          arr: [1, 2, 3],
        },
      });

      console.log(vm);
    </script>
  </body>
</html>
```

### .babelrc

```json
{
  "presets": ["@babel/preset-env"]
}
```

### package.json

```json
{
  "name": "vue2-reactive",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "rollup -c -w"
  },
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "@babel/core": "^7.15.0",
    "@babel/preset-env": "^7.15.0",
    "rollup": "^2.56.2",
    "rollup-plugin-babel": "^4.4.0",
    "rollup-plugin-serve": "^1.1.0"
  }
}
```

### rollup.config.js

```javascript
import babel from 'rollup-plugin-babel';
import serve from 'rollup-plugin-serve';

export default {
  input: './src/index.js',
  output: {
    format: 'umd',
    name: 'Vue',
    file: 'dist/vue.js',
    sourcemap: true,
  },
  plugins: [
    babel({
      exclude: 'node_module/**',
    }),
    serve({
      port: 8080,
      contentBase: '',
      openPage: '/index.html',
      open: true,
    }),
  ],
};
```

## 实现监测给定的数据

我给一个属性给你，当这个属性发生变化时执行我自己定义的一些操作。

比如：
watch('data.name', function showFullName(name) { console.log('Vue ' + name); })，我要监测'data.name'这个属性，当它变化后执行 showFullName 这个函数。

这不和之前的响应式一样吗？

不完全一样。本质上是一样的。

之前的响应式是你在渲染页面操作时自己去找出需要监测哪些数据（渲染页面过程中对那些属性进行取值操作），现在是给定了需要监测的数据，相当于简化了一步。

为了运用之前的响应式，我们可以把这给定的属性转化为一个操作，这个操作只是对这给定的属性进行取值操作。这样，这个操作就和渲染页面操作一样了，就可以完完全全用之前的响应式了。

开搞，让 watcher 兼容监测给定的数据：
之前在新创建一个 watcher 时是直接把渲染页面操作的函数传进来，现在有可能传一个属性的表达式进来。我们可以根据传入的是函数还是字符串来确定是否要转化为只对属性进行取值操作函数。

### src/util/index.js

```javascript
...

const unicodeRegExp =
  /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);

// 转化为取值操作，path的形式必须是xxx.xxx.xxx...的形式
export function parsePath(path) {
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split('.');
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return;
      obj = obj[segments[i]];
    }
    return obj;
  };
}
```

### src/observer/watcher.js

```javascript
...

export default class Watcher {
  ...

  // 渲染页面操作函数，或者是转化后的取值函数，因为需要取值所以命名为getter
  getter;

  // getter的返回值，一般来说渲染页面操作函数没有返回值，但监测给定数据时需要把最新值传给回调函数
  value;

  // getter执行完后需要执行的函数，一般来说渲染页面操作函数没有回调函数，但监测给定数据时肯定是有回调函数的
  cb;

  ...

  constructor(vm, expOrFn, cb) {
    ...

    if (typeof expOrFn === 'function') {
      this.getter = expOrFn;
    } else {
      // 转化为取值操作函数
      this.getter = parsePath(expOrFn)
    }

    // 创建watcher后，马上执行以进行依赖收集
    this.value = this.get();
  }

  update() {
    this.run()
  }

  // 执行getter函数，并且开启依赖收集
  get() {
    Dep.target = this;
    const value = this.getter.call(this.vm, this.vm);
    Dep.target = null;

    // 清除上轮用过但现在没用的依赖
    this.cleanupDeps();

    return value;
  }

  run() {
    const value = this.get();
    const oldValue = this.value;
    this.value = value;
    if (value !== oldValue) {
	  this.cb.call(this.vm, value, oldValue);
    }
  }
}
```

## 深度监测

比如想要监测一个对象，data.obj，当 obj 改变或只要 obj 中的任一属性变化了都执行回调函数。
这时我们需要传入一个参数，说明是要进行深度监测的，参数名就叫 deep。
在进行依赖收集时，需要对监测的对象的每个属性都进行取值操作，这样每个属性也被收集为依赖

```javascript
class Watcher {
  ...

  // 监测给定数据时是否进行深度监测
  deep;

  ...

  constructor(vm, expOrFn, cb, options) {
    ...
	this.options = options || {};
    this.deep = !!this.options.deep;

    ...
  }

  ...

  // 执行getter函数，并且开启依赖收集
  get () {
    Dep.target = this;
    const value = this.getter.call(this.vm, this.vm);

    // 要进行深度监测
    if (this.deep) {
      // 递归对value的每个属性进行取值操作以进行依赖收集
      traverse(value);
    }
    Dep.target = null;

	return value;
  }
  ...
}
```

traverse.js

```javascript
import { isObject } from '../util/index';

const seenObjects = new Set();

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse(val) {
  _traverse(val, seenObjects);
  seenObjects.clear();
}

function _traverse(val, seen) {
  let i, keys;
  const isA = Array.isArray(val);
  if ((!isA && !isObject(val)) || Object.isFrozen(val)) {
    return;
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id;
    if (seen.has(depId)) {
      return;
    }
    seen.add(depId);
  }
  if (isA) {
    i = val.length;
    while (i--) _traverse(val[i], seen);
  } else {
    keys = Object.keys(val);
    i = keys.length;
    while (i--) _traverse(val[keys[i]], seen);
  }
}
```

一般来说，传入的 cb 函数都是用户自己写的，如果在 cb 函数抛出了错误但没有进行错误处理就会终止程序。
这时我们可以设置一个参数，表示是否要对 cb 函数进行错误处理，参数就叫 user。

```javascript
export default class Watcher {
  ...

  // 是否要对cb函数进行错误处理
  user;

  ...

  constructor(vm, expOrFn, cb, options) {
    ...

    this.user = !!this.options.user;

    ...
  }

  ...

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
}

function invokeWithErrorHandling() {
  // 自己去实现
}
```

如果想监测多个数据怎么办呢？

这个简单，你自己编写转换后的函数，在这个函数中把你想监测的数据都进行取值操作。然后就和之前的响应式一样。

## computed 属性（计算属性）

现在有个需求：
现有一个属性，定义了一个 getter，这个 getter 的返回值依赖了一些响应式数据。
当对这个属性进行取值时，如果其依赖没有变化，则直接返回上一次执行 getter 函数得到的结果。如果其依赖发生了变化，则要执行 getter 函数以得到最新的结果并将这个最新结果返回。

结合我们的 watcher 怎么实现这需求呢？

先让我研究研究。
有了，我们对 watcher 进行改造：

1.  watcher 的 getter 存放目标属性的 getter。
2.  watcher 把目标属性的 getter 的执行结果存储在 value 中。
3.  watcher 设置一个 dirty 标识，标识目标属性的依赖是否发生变化，依赖变化时只设置这个 dirty 标识。
4.  watcher 提供一个 evaluate 方法获取 value，在这个方法中，通过 dirty 标识来判断是否要重新执行目标属性的 getter 来更新 value。

我们把这种 watcher 叫做 lazy watcher。当要对这个属性进行取值时就调用 watcher 的 evaluate 方法。

```javascript
class Watcher {
  ...

  // 标识是lazy watcher
  lazy;

  // 标识lazy watcher的依赖有没变化
  dirty;

  constructor(vm, expOrFn, cb, options) {
    ...

    this.lazy = !!this.options.lazy;
    this.dirty = this.lazy;

    ...

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

  ...

  // 获取lazy watcher的目标属性的值
  evaluate() {
    if (this.dirty) {
      this.value = this.get();
      this.dirty = false;
    }

    return this.value;
  }
}
```

完整版的 Watcher：

```javascript
class Watcher {
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
    Dep.target = this;
    const value = this.getter.call(this.vm, this.vm);
    // 要进行深度监测
    if (this.deep) {
      // 递归对value的每个属性进行取值操作以进行依赖收集
      traverse(value);
    }
    Dep.target = null;

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
}
```

这就是 Vue 中 computed 属性的原理。

要记住：computed 属性的依赖发生变化时不会马上执行 getter 函数，而是等到下一次对 computed 属性取值时才执行 getter 函数以得到最新值。

如果页面渲染用到了 computed 属性，在 computed 属性的依赖发生变化时，我们应该重新执行页面渲染函数，重新执行页面渲染函数时就会对 computed 属性进行取值，这时页面渲染拿到的才是最新的值。

那在 computed 属性的依赖发生变化时怎么才能让渲染页面函数重新执行呢？

这个就简单了，我们让 computed 属性的依赖也成为渲染页面函数的依赖不就行了吗？这就相当于 watcherA 依赖于 watcherB 时，watcherA 就依赖于 watcherB 的所有依赖。

好了，这时我们应该问怎么才能让 watcherA 收集 watcherB 的所有依赖？

我们之前已经把 watcher 的所有依赖都存储起来放在 deps 中了，当 watcherA 依赖于 watcherB 时就让 watcherA 去收集 watcherB 的所有依赖。当 watcherA 在收集依赖的过程中，watcherB 又开始收集依赖时，watcherA 就是依赖于 watcherB 的。

想想，watcherA（渲染页面函数）在收集依赖的过程中（执行渲染页面函数），会对 watcherB（computed 属性）进行取值，取值时，watcherB 的 getter 又会执行，watcherB 就开始收集依赖，收集完依赖后（watcherB 的 getter 执行完后），又回到 watcherA 收集依赖。

那我们在 watcherB 收集完依赖后（watcherB 的 getter 执行完后），就让 watcherA 收集 watcherB 的所有依赖。

之前，我们在收集依赖时，把当前的 watcher 存在 Dep.target 中，当其收集完依赖时把 Dep.target 置为空。现在就不能这样了，现在应该是一个栈结构，Dep.target 存的应该是处于栈顶的 watcher。

开始改造：
observer/watcher.js

```javascript
...

export default class Watcher {
  ...

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

    // 清除之前用过但现在没用的依赖
    this.cleanupDeps();

    // 当前watcher出栈后，如果Dep.target还有值，则说明Dep.target中的watcher依赖于当前watcher
    // 要让其收集当前watcher的所有依赖
    if (Dep.target) {
      Dep.target.dependWatcher(this);
    }

    return value;
  }

  ...

  // 收集依赖watcher的所有依赖
  dependWatcher(watcher) {
    for (let dep of watcher.deps) {
      this.depend(dep);
    }
  }

  ...
}
```

observer/dep.js

```javascript

...

const targetStack = [];
export function pushTarget(target) {
  targetStack.push(target);
  Dep.target = target;
}

export function popTarget() {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1];
}
```

## 异步更新

// todo
