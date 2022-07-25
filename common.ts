import { botConfig } from ".";

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

const clientArrToObj = function (clients: botConfig[]) {
  let obj: { [key: string]: botConfig } = {};
  clients.forEach(client => obj[client.account.toString()] = client);
  return obj!;
}

function clientArrToMap(clients: botConfig[]) {
  return new Map(clients.map(client => [client.account, client]));
}

export default { sleep, Map2Object, ObjToMap, clientArrToObj};
