import { Message, FriendRequestEvent, GroupAdminEvent, GroupInviteEvent,
  GroupMessageEvent, GroupMuteEvent, GroupPokeEvent, GroupRecallEvent,
  GroupRequestEvent, GroupTransferEvent, MemberDecreaseEvent, MemberIncreaseEvent,
  PrivateMessageEvent, segment, Client, Logger
} from "oicq";
import common from "./common.js";
import { BotConf } from "./config.js";
import { Bot, botConfig, BotsMap, simpleConfig } from "./index.js";
import { PluginsMap } from "./plugins/headfile.js";
import lodash from "lodash";


export type GroupNoticeEvent = 
MemberIncreaseEvent | MemberDecreaseEvent | 
GroupRecallEvent | GroupAdminEvent | 
GroupMuteEvent | GroupTransferEvent | 
GroupPokeEvent;

//实例有self_id等属性，但是静态文件里没有，只能自己定义一个防止红波浪线
//不影响生成的js代码
export interface MessageEvent extends Message {
  reply: Function;
  replyCatch: Function;
  selfBot: Bot;
  setConf: Function;
  self_id: number;
  isMaster: boolean;
  logger: Logger;
}

async function dealMsg(e: MessageEvent) {
  //添加自定义的属性
  const MasterArr = BotConf.Clients.get(e.self_id)?.Master as number[];
  if(MasterArr.includes(e.sender!.user_id)) e.isMaster = true;
  else e.isMaster = false;                                                                  //消息实例来源是否是主人
  e.selfBot = BotsMap.get(e.self_id)!;
  e.setConf = async(conf: simpleConfig) => BotConf.setConf(e.self_id, conf);                //获取自己的设置实例，便于修改
  e.logger = e.selfBot.Client.logger;                                                       //方便打印
  e.replyCatch = e.reply;
  e.reply = async(msg: any) => e.replyCatch(msg).catch((err: any) => e.logger.error(err));  //原始e.reply方法没有catch块

  PluginsMap.forEach(plugin => {
    plugin.plugins.forEach(async(value, key) => {
      if (!(value.get("reg") === "noCheck") && !(value.get("reg") as RegExp).test(e.raw_message)) return;
      const pluginFunction: Function = value.get("method") as Function;
      //e.logger.info(plugin);
      //console.log(e);
      pluginFunction(e).catch((err: any) => e.logger.error(err));
    });
  });
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

export default {dealPrivateMsg, dealGroupMsg, dealGroupNotice, dealGroupRequest, dealFriendRequest};