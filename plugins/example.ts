import { segment } from "oicq";          //使用segment构建复杂消息类型
import fetch from "node-fetch";
import { MessageEvent } from "../dealEvent.js";
import common from "../common.js";

export const rule = {
  onesaid: /** 规则名字,当method项为可调用时可任意 **/ {
    reg: "^#?一言",    //匹配正则
    priority: 500,     //暂无效
    describe: "一言",  //YunzaiPlugin原始简介
    description: null,   //简介
    method: onesaid,   //调用的method，此项有效时key可以任意
  },
};

const url = "https://v1.hitokoto.cn";    //接口链接
/**
 *
 *
 * @export 
 * @param {MessageEvent} e 事件实例
 * @return {boolean} 
 */
export async function onesaid(e: MessageEvent): Promise<boolean> {
  
  //const conf: Map<string, any> = await e.setConf({PluginConfig: null}); //无用
  //e.logger.info(conf);
  const response = await fetch(url);     //调用接口获取数据
  const res: any = await response.json();//数据转json格式方便解析
  /*
  const hitokoto = res.hitokoto;
  const source = res.from;
  const who = res.from_who;
  */
  let msg = [];                          //创建要将要发送消息的数组
  msg.push(`『${res.hitokoto}』\n`);     //插入消息
  res.from_who ? msg.push(`— — ${res.from_who}`) : null;
  res.from && !res.from_who ? 
    msg.push(`— —「 ${res.from}」`) :
    res.from ? 
      msg.push(`「 ${res.from}」`) : null;
  /**
  const message = [                      //使用segment构建复杂消息元素，详情见oicq库
    "hello world",
    segment.image("/tmp/abc.jpg"),
    segment.face(104),
    segment.at(10001),
  ];
  msg.push(message);
  */
  e.reply(msg);  //回复消息
  return true;   //返回true表示成功执行，目前返回值暂无效
}