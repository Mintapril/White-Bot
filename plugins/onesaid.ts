import { segment } from "oicq";
import fetch from "node-fetch";
import yaml from "js-yaml";
import { MessageEvent } from "../dealEvent.js";
import { configFile } from "../config.js";
import common from "../common.js";

export const rule = {
  onesaid: {
    reg: "^#?一言",
    priority: 511,
    describe: "一言",
  },
};

const url = "https://v1.hitokoto.cn";
export async function onesaid(e: MessageEvent) {

  const conf: Map<string, any> = await configFile.setConf(e.self_id!.toString(), {PluginSettings: null});
  const response = await fetch(url);
  const res: any = await response.json();
  const hitokoto = res.hitokoto;
  const source = res.from;
  const who = res.from_who;

  let msg = [];
  msg.push(`『${hitokoto}』\n`);
  if (who) msg.push(`— — ${who }`);
  if (source && !who) {
    msg.push(`— —「 ${source}」`);
  } else if (source) {
    msg.push(`「 ${source}」`);
  }

  e.reply(msg);
  return true;
}