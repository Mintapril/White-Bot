import { Message, FriendRequestEvent, GroupAdminEvent, GroupInviteEvent,
  GroupMessageEvent, GroupMuteEvent, GroupPokeEvent, GroupRecallEvent,
  GroupRequestEvent, GroupTransferEvent, MemberDecreaseEvent, MemberIncreaseEvent,
  PrivateMessageEvent, segment
} from "oicq";
import common from "./common.js";
import { BotConf } from "./config.js";
import { BotsMap } from "./index.js";
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
  self_id?: string | number;
  isMaster?: boolean;
}

async function dealMsg(e: MessageEvent) {
  //添加自定义的属性
  const MasterArr = BotConf.Clients.get(e.self_id!?.toString())?.Master as number[];
  if(MasterArr.includes(e.sender!.user_id)) e.isMaster = true;
  else e.isMaster = false;
  
  PluginsMap.forEach(plugin => {
    plugin.plugins.forEach(async(value, key) => {
      if (!(value.get("reg") === "noCheck") && !(value.get("reg") as RegExp).test(e.raw_message)) return;
      const pluginFunction: Function = value.get("method") as Function;
      console.log(plugin);
      //console.log(e);
      pluginFunction(e).catch((err: any) => console.log(err));
    });
  });
}
async function dealPrivateMsg(e: PrivateMessageEvent) {
  return dealMsg(e);
}
async function dealGroupMsg(e: GroupMessageEvent) {
  return dealMsg(e);
}
async function dealFriendRequest(e: FriendRequestEvent) {

}
async function dealGroupRequest(e: GroupRequestEvent | GroupInviteEvent) {

}
async function dealGroupNotice(e: GroupNoticeEvent) {

}

export default {dealPrivateMsg, dealGroupMsg, dealGroupNotice, dealGroupRequest, dealFriendRequest};