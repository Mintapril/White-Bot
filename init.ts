import fs from "fs/promises";
import { existsSync , PathLike, watch} from "fs";
import path from "path";
import common from "./common.js";
import { PluginsMap } from "./plugins/headfile.js";
import { createConfig } from "./config.js";  

const __dirname = process.cwd();

interface PluginRule {
  name: string;
  reg: string;
  description?: string;
  describe?: string;
  method?: Function;
}

/**
 *
 *
 * @class PluginRuleMap 每个method一个实例
 * @extends {(Map<string, string | RegExp | Function>)}
 */
class PluginRuleMap extends Map<string, string | RegExp | Function>{
  /**
   * Creates an instance of PluginRuleMap.
   * @param {PluginRule} rules 
   * @param {*} father plugin本体
   * @memberof PluginRuleMap
   */
  constructor(rules: PluginRule, father: any) {
    super();
    /*
    this.set("name", rules.name);
    this.set("reg", rules.reg === "noCheck" ? rules.reg : new RegExp(rules.reg));
    this.set("description", rules.description ?? rules.describe ?? "");
    this.set("method", rules.method ?? father[rules.name]);
    */
    return new Map<string, string | RegExp | Function>([
      ["name", rules.name],
      ["reg", rules.reg === "noCheck" ? rules.reg : new RegExp(rules.reg)],
      ["description", rules.description ?? rules.describe ?? ""],
      ["method", rules.method ?? father[rules.name]],
    ]);
    return this;
  }
}

/**
 *
 * 使用new Plugin(filename)创建一个plugin实例
 * Plugin文件目前基本支持YunzaiPlugin的单独js的形式，未来会增加更多新特性
 * 每个plugin实例都会在检测到原文件变更时刷新自己
 * @export
 * @class Plugin 每个文件一个实例
 */
export class Plugin {
  name: string;
  path: string;
  plugins: Map<string, Map<string, RegExp | Function | string> | PluginRuleMap> = new Map();
  subModiles: Array<string> = [];
  /**
   * Creates an instance of Plugin.
   * @param {string} file plugin文件名
   * @memberof Plugin
   */
  constructor(file: string) {
    this.path = path.join(__dirname, "plugins", file);
    this.name = file.replace(/\.js$/, "");
    import("file://" + this.path).then(module => {
      for (let name in module.rule) {
        const rule: PluginRule = Object.assign(module.rule[name], {name: name});
        //const value = module.rule[name];
        this.plugins.set(name, new PluginRuleMap(rule, module));
        this.subModiles = [];
        this.subModiles.push(name);
      };
    }).catch(err => console.log(err));
    PluginsMap.set(this.name, this);
    let fsTimeout: NodeJS.Timeout | null;
    watch(this.path, async (event, filename) => {
      await common.sleep(50);
      if (!fsTimeout) {
        fsTimeout = setTimeout(() => fsTimeout = null, 500); //fs.watch不是很可靠，避免短时间内多次触发
      } else return;
      if (!existsSync(this.path)) {
        PluginsMap.delete(this.name);
        await this.refresh();
        console.log(`${filename}被移除`);
        return;
      }
      await this.refresh();
      console.log(`更新${filename}完成`);
    });
  }
  /**
   *
   * 刷新plugin文件，目前用于热更新
   * @type {Function}
   * @memberof Plugin
   */
  refresh: Function = async() => {
    //console.log(this._path);
    const module = await import(`file://${this.path}?version=${new Date().getTime()}`).catch(err => console.log(err));
    for (let name in module.rule) {
      const rule: PluginRule = Object.assign(module.rule[name], {name: name});
      //const value = module.rule[key];
      this.plugins.set(name, new PluginRuleMap(rule, module));
    };
    PluginsMap.set(this.name, this);
    //console.log(`Plugin ${this.name} initialized`);
  }
}

class ConfigFileNotFoundError extends Error {
}

export async function Init() {
  await fs.access("./config.yaml").catch(async() => {
    await fs.copyFile("./default_config.yaml", "./config.yaml");
    console.log("未找到config文件，已生成默认配置，请修改后再次登录。");
    process.exit();
    //throw new ConfigFileNotFoundError;
  });

  createConfig();  

  fs.readdir(path.join(__dirname, "plugins")).then(dist => {
    dist.forEach(async file => {
      if (!/\.js$/.test(file) || /^headfile\.js$/.test(file)) return;
      //const module = await import(path.join(__dirname, "plugins", file));
      const plugin = new Plugin(file);
      console.log(`plugin ${plugin.name} initialized`);
    });
  });
  /*
  watch(path.join(__dirname, "plugins"), async (event, filename) => {
    //console.log(event);
    if (!existsSync(path.join(__dirname, "plugins", filename)) && !/\.js$/.test(filename) && /^headfile\.js$/.test(filename)) return;
      const plugin = new Plugin(filename);
      plugin.init();
      console.log(`更新${filename}完成`);
  });
  */
  return;
}
