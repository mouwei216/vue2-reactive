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
