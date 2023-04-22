import {
  Message, FriendRequestEvent, GroupAdminEvent, GroupInviteEvent,
  GroupMessageEvent, GroupMuteEvent, GroupPokeEvent, GroupRecallEvent,
  GroupRequestEvent, GroupTransferEvent, MemberDecreaseEvent, MemberIncreaseEvent,
  PrivateMessageEvent, segment, Client
} from "icqq";
import common from "./common.js";
import { BotConf } from "./config.js";
import { Bot, botConfig, BotsMap, simpleConfig } from "./index.js";
import { PluginsMap } from "./plugins/headfile.js";
import { sortedPlugins } from "./init.js"

export type GroupNoticeEvent =
  MemberIncreaseEvent | MemberDecreaseEvent |
  GroupRecallEvent | GroupAdminEvent |
  GroupMuteEvent | GroupTransferEvent |
  GroupPokeEvent;

//实例有self_id等属性，但是静态文件里没有，只能自己定义一个防止红波浪线
//不影响生成的js代码
export interface MessageEvent extends Message {
  msg: string;
  reply: Function;
  replyCatch: Function;
  selfBot: Bot;
  setConf: Function;
  self_id: number;
  isMaster: boolean;
  logger: any;
  message_type: string;
}

const cooldowns = new Map<number, number>();

async function dealMsg(e: MessageEvent) {

  const now = Date.now();
  const cooldownAmount = BotsMap.get(e.self_id)!.Config.Waiter || 5000; // 设置 CD 时间（单位：毫秒），可以根据需要调整
  //cd相关
  if (cooldowns.has(e.sender!.user_id)) {
    const expirationTime = cooldowns.get(e.sender!.user_id) as number + cooldownAmount;
    if (now < expirationTime) return;
  }
  cooldowns.set(e.sender!.user_id, now);

  let isDone: boolean = false;
  // 遍历并执行插件
  for (let plugin of sortedPlugins) {
    const value = plugin;
    if (!(value.get("reg") === "noCheck") && !(value.get("reg") as RegExp).test(e.raw_message)) continue;

    //添加自定义的属性
    const MasterArr = BotConf.Clients.get(e.self_id)?.Master as number[];
    if (MasterArr.includes(e.sender!.user_id)) e.isMaster = true;
    else e.isMaster = false;                                                                  //消息实例来源是否是主人
    e.selfBot = BotsMap.get(e.self_id)!;
    e.setConf = async (conf: simpleConfig) => BotConf.setConf(e.self_id, conf);               //获取自己的设置实例，便于修改
    e.logger = e.selfBot.Client.logger;                                                       //方便打印
    e.msg = e.raw_message;

    const method: Function = value.get("method") as Function;
    isDone = await method(e).catch((err: any) => e.logger.error(err));
    if (isDone) break;
  }
}

async function dealPrivateMsg(e: MessageEvent /**PrivateMessageEvent **/) {
  return dealMsg(e);
}
async function dealGroupMsg(e: MessageEvent /** GroupMessageEvent **/) {
  return dealMsg(e);
}
async function dealFriendRequest(e: FriendRequestEvent) {

}
async function dealGroupRequest(e: GroupRequestEvent | GroupInviteEvent) {

}
async function dealGroupNotice(e: GroupNoticeEvent) {

}

export default { dealPrivateMsg, dealGroupMsg, dealGroupNotice, dealGroupRequest, dealFriendRequest };
