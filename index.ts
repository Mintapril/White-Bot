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

export class ConfigFile {
  /**
   * Creates an instance of ConfigFile.
   * @param {string} [filepath] 设置文件位置，仅支持yaml
   * @memberof ConfigFile 
   */
  constructor(filepath?: string) {
    this.confPath = filepath ?? path.join(_path, "config.yaml");
    const settings: any = yaml.load(readFileSync(this.confPath, "utf-8"));
    this.Clients = new Map(settings.Clients.map((client: botConfig) => [client.account, client]));
    this.DefaultConfig = settings.DefaultSettings;
    this.configObj = settings;
  }
  confPath: string;
  Clients: Map<number, botConfig> = new Map<number, botConfig>();
  DefaultConfig: botConfig;
  /**
   *
   *
   * @param {number} account qq号码，用于确认所设置机器人实例
   * @param {simpleConfig} settings 设置项，请参考interface ConfigContantable构建，不建议在这里设置account和pwd
   * @type {Function}
   * @memberof ConfigFile
   */
  setConf: Function = async(account: number, settings: simpleConfig) => {
    //this.Clients.set(account, Object.assign({}, this.Clients.get(account), settings));
    console.log(Object.assign({}, this.Clients.get(account), settings));
    const conf = Object.assign({}, this.configObj, { Clients: Array.from(this.Clients.values())});
    this.configObj = conf;
    fs.writeFile("./config.yaml", yaml.dump(conf)).catch(() => console.log("配置文件保存失败，重启后将恢复原始设置"));
    /*
    const _settings: ConfigFile = yaml.load(readFileSync(this.confPath, "utf-8")) as ConfigFile;
    this.Clients = new Map(Object.entries(_settings.Clients));
    this.DefaultSettings = _settings.DefaultSettings;
    this.configObj = _settings;
    */
    //console.log(this.Clients);
    return this.Clients.get(account);
  };
  private configObj: any;
}


export class Bot {
  /**
   * Creates an instance of Bot.
   * @param {userSettings} Config 机器人启动的必须项
   * @memberof Bot
   */
  constructor(Config: botConfig) {
    this.Config = Config;
    this.self = Config.account;
    this.Client = createClient(this.Config.account, {
      log_level: this.Config.log_level ?? "info",
      platform: this.Config.platform ?? 4,
      resend: this.Config.resend,
      data_dir: path.join(_path, "data", this.Config.account.toString() + "_data"),
    });
    this.Client.login(this.Config.pwd);
  }
  private Config: botConfig;
  self: number;
  Client: Client;
}

createConfig();
const createBot = (Config: botConfig) => new Bot(Config);
export let BotsMap: Map<string | number, Bot> = new Map();
BotConf.Clients.forEach(botSettings => BotsMap.set(botSettings.account, createBot(botSettings)));

BotsMap.forEach(bot => {
  bot.Client.on("system.login.qrcode", function (e) {
    this.logger.mark("扫码后按Enter回车完成登录");
    process.stdin.once("data", () => {
      this.login();
    });
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