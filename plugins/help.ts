import { segment } from "oicq";
import fetch from "node-fetch";
import yaml from "js-yaml";
import { MessageEvent } from "../dealEvent.js";
import { BotConf } from "../config.js";
import common from "../common.js";
import { fstat, readFileSync } from "fs";
import path from "path";
import { BotsMap } from "../index.js";

export const rule = {
  help: /** 规则名字,当method项为可调用时可任意 **/ {
    reg: "^#?(帮助|help|菜单)",    //匹配正则
    priority: 500,     //暂无效
    description: "打印SerializedPlugins.json",   //简介
    method: help,   //调用的method，此项有效时key可以任意
  },
};

const _path = process.cwd();

export async function help(e: MessageEvent) { e.reply(readFileSync(path.join(_path, "plugins-overview.json"), "utf-8")) }
