import { Client, createClient, LogLevel, Platform } from "oicq";
import yaml from "js-yaml";
import fs from "fs/promises";
import { readFileSync } from "fs";
import path from "path";
import common from "./common.js";
import eventHandler from "./dealEvent.js"
import { Init } from "./init.js";
import { BotConf, createConfig} from "./config.js";

const _path = process.cwd();

/**
 *
 *
 * @interface ConfigContantable Config文件基类
 */
interface ConfigContantable {
  platform: undefined | Platform;
  log_level: undefined | LogLevel;
  resend: undefined | boolean;
  Master: undefined | string[] | number[];
  Waiter: undefined | number;
  Blacks: {
    user: any;
    group: any;
  }
  PluginConfig: any;
}

/**
 *
 *
 * @interface botConfig 包含账号和密码，用于和自行构建区分
 * @extends {ConfigContantable}
 */
export interface botConfig extends ConfigContantable {
  account: number;
  pwd: string;
}

/**
 *
 *
 * @interface simpleConfig 自行构建设置
 * @extends {ConfigContantable}
 */
export interface simpleConfig extends ConfigContantable {

}

/**
 * ConfigFile类用于处理机器人配置文件的读取和设置。
 * 支持的配置文件格式为yaml。
 */
export class ConfigFile {
  confPath: string; // 配置文件路径
  Clients: Map<number, botConfig> = new Map<number, botConfig>(); // 存储各个机器人实例的配置
  DefaultConfig: botConfig; // 默认配置
  private configObj: any; // 存储整个配置文件对象
  /**
   * ConfigFile类的构造函数。
   * @param {string} [filepath] 配置文件路径，如果未提供，则默认为当前路径下的config.yaml
   * @memberof ConfigFile
   */
  constructor(filepath?: string) {
    this.confPath = filepath ?? path.join(_path, "config.yaml");
    const settings: any = yaml.load(readFileSync(this.confPath, "utf-8"));
    this.Clients = new Map(settings.Clients.map((client: botConfig) => [client.account, client]));
    this.DefaultConfig = settings.DefaultSettings;
    this.configObj = settings;
  }
  /**
   * setConf用于设置特定机器人实例的配置项，通常用于主人通过消息管理机器人设置
   * @param {number} account 机器人实例的qq号码，用于确认所设置机器人实例
   * @param {simpleConfig} settings 配置项，需参考interface ConfigContantable构建，不建议在这里设置account和pwd
   * @returns 返回更新后的机器人实例配置
   * @memberof ConfigFile
   */
  async setConf(account: number, settings: simpleConfig) {
    console.log(Object.assign({}, this.Clients.get(account), settings));
    const conf = Object.assign({}, this.configObj, { Clients: Array.from(this.Clients.values())});
    this.configObj = conf;
    fs.writeFile("./config.yaml", yaml.dump(conf)).catch(() => console.log("配置文件保存失败，重启后将恢复原始设置"));
    return this.Clients.get(account);
  };
}

/**
 * Bot类表示一个聊天机器人实例，用于与用户进行对话。
 * @class Bot
 */
export class Bot {
  /**
   * Bot的配置对象
   * @property {botConfig} Config - 包含Bot的配置信息的对象
   */
  Config: botConfig;
  /**
   * Bot的自身账户的ID
   * @property {number} self - Bot的账户ID
   */
  self: number;
  /**
   * Bot的客户端实例对象
   * @property {Client} Client - 表示Bot客户端实例的对象
   */
  Client: Client;
  /**
   * 创建一个新的Bot实例
   * @param {botConfig} Config - Bot的配置信息
   * @constructor
   */
  constructor(Config: botConfig) {
    this.Config = Config;
    this.self = Config.account;
    // 创建一个基于配置信息的客户端实例
    this.Client = createClient(this.Config.account, {
      log_level: this.Config.log_level ?? "info",
      platform: this.Config.platform ?? 4,
      resend: this.Config.resend,
      data_dir: path.join(_path, "data", this.Config.account.toString() + "_data"),
    });
    // 通过提供的密码进行登录
    this.Client.login(this.Config.pwd);
  }
}

createConfig();
const createBot = (Config: botConfig) => new Bot(Config);
export let BotsMap: Map<string | number, Bot> = new Map();
BotConf.Clients.forEach(botSettings => BotsMap.set(botSettings.account, createBot(botSettings)));

BotsMap.forEach(bot => {
  bot.Client.on("system.login.qrcode", async function (e) {
    this.logger.mark("扫码后按Enter回车完成登录");
    await common.sleep(12000);
    this.login();
//    process.stdin.once("data", () => {
//      this.login();
//    });
  });
  bot.Client.on("system.login.slider", function () {
    this.logger.mark(bot.self, "请输入获取的ticket，按回车完成滑动验证");
    process.stdin.once("data", (input) => {
      this.submitSlider(input.toString());
    });
  })
  bot.Client.on("system.login.error", function (e) {
    if (e.code == 1) this.logger.error(bot.self, "密码错误，请修改密码重试");
    process.exit();
  });
  bot.Client.on("system.login.device", function (e) {
    process.stdin.once("data", () => {
      this.login();
    });
  });
  bot.Client.on("system.online", function() {
    Init().catch(err => {
    this.logger.error(err);
    process.exit();
  })});

  //后面是消息处理

  //监听群消息事件
  bot.Client.on("message.group", (event) => {
    eventHandler.dealGroupMsg(event as any).catch((error) => {
      bot.Client.logger.error(error);
    });
  });
  //监听私聊消息事件
  bot.Client.on("message.private", (event) => {
    eventHandler.dealPrivateMsg(event as any).catch((error) => {
      bot.Client.logger.error(error);
    });
  });
  //监听好友事件
  bot.Client.on("request.friend", (event) => {
    eventHandler.dealFriendRequest(event);
  });
  //监听群通知
  bot.Client.on("notice.group", (event) => {
    eventHandler.dealGroupNotice(event).catch((error) => {
      bot.Client.logger.error(error);
    });
  });
  //监听群事件
  bot.Client.on("request.group", (event) => {
    eventHandler.dealGroupRequest(event);
  });
});