import { botConfig } from ".";

const sleep: Function = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

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

export default { sleep, ObjToMap, clientArrToObj};
