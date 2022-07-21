const sleep: Function = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const Map2Object: Function = (conf: Map<string | number, any>) => {
  return [...conf.entries()].reduce((obj, [key, value]) => (obj[key] = value, obj), {} as any);
}
const ObjToMap = function (obj: any) {
    var map = new Map();
    for (let key in obj) {
        map.set(key, obj[key]);
    }
    return map;
}
 

export default { sleep, Map2Object, ObjToMap};
