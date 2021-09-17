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
