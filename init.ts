import fs from "fs/promises";
import { existsSync , PathLike, watch} from "fs";
import path from "path";
import common from "./common.js";
import { PluginsMap } from "./plugins/headfile.js";
import { createConfig } from "./config.js";  

const __dirname = process.cwd();

/**
 * PluginRule 是一个包含规则基本信息的对象。
 * 在插件文件中定义，便于开发者理解和维护。
 * 我认为这个接口没有必要存在，我完全不能理解以前我定义这个接口时的想法。
 * 在没有完整注释的时候，我对这个和PluginRuleMap两个东西感到十分困惑。
 * 未来会移除这个东西。 
 *
 * @typedef {Object} PluginRule
 * @property {string} name - 规则的名称，通常与关联的方法名称相同。
 * @property {string} reg - 一个正则表达式字符串，用于匹配该规则应用的文本。
 * @property {number} priority - 一个数字，表示规则的优先级。值越小，优先级越高。
 * @property {string} [description] - 用于描述规则的简短文本。
 * @property {string} [describe] - 与 description 具有相同的功能，仅仅为了兼容Yunzai-Botv2的代码。
 * @property {Function} [method] - 与规则关联的方法。建议使用这个而不是name。
 */
interface PluginRule {
  name: string;
  reg: string;
  priority: Number;
  description?: string;
  describe?: string;
  method?: Function;
}

/**
 * PluginRuleMap 是一个 Map 数据结构，用于存储和操作插件规则。
 * 在主程序中为每个插件规则创建一个实例。
 * 它包含与 PluginRule 相同的信息。
 * 这使得主程序可以更容易地查找和执行相应的方法。
 *
 * @typedef {Map<string, string | number | RegExp | Function>} PluginRuleMap
 * @property {string} name - 规则的名称，通常与关联的方法名称相同。
 * @property {RegExp} reg - 一个 RegExp 对象，由 PluginRule 中的正则表达式字符串创建。
 * @property {number} priority - 一个数字，表示规则的优先级。值越小，优先级越高。
 * @property {string} description - 用于描述规则的简短文本。
 * @property {Function} method - 与规则关联的方法。通常位于插件文件中，名称与规则相同。
 */
 class PluginRuleMap extends Map<string, string | number | RegExp | Function>{
  /**
   * Creates an instance of PluginRuleMap.
   * @param {PluginRule} rules 
   * @param {*} father plugin本体
   * @memberof PluginRuleMap
   */
  constructor(rules: PluginRule, father: any) {
    super();
    return new Map<string, string | number | RegExp | Function>([
      ["name", rules.name],
      ["reg", rules.reg === "noCheck" ? rules.reg : new RegExp(rules.reg)],
      ["priority", rules.priority],
      ["description", rules.description ?? rules.describe ?? ""],
      ["method", rules.method ?? father[rules.name]],
    ]);
    //return this;
  }
}
interface PluginContantable {
  name: string;
  path: string;
  plugins: any;
  subModules: Array<string>;
}

/**
 * Plugin类用于表示一个插件，包含插件的名称、路径、规则映射等属性。
 * 注意：请勿直接调用构造函数来创建Plugin实例，而应使用create静态方法。
 * 
 * @class Plugin
 * @implements {PluginContantable}
 */
 export class Plugin implements PluginContantable {
  name: string;
  path: string;
  plugins: Map<string, PluginRuleMap> = new Map();
  subModules: Array<string> = [];
  /**
   * Plugin类的构造函数，初始化一个新的Plugin实例。
   * 注意：请勿直接调用构造函数来创建Plugin实例，而应使用create静态方法。
   * 直接调用构造函数会破坏创建过程，因为它不会调用init方法。
   * @param {string} file 插件文件名。
   */
    constructor(file: string) {
    this.path = path.join(__dirname, "plugins", file);
    this.name = file.replace(/\.js$/, "");
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
  public async refresh() {
    //console.log(this._path);
    const module = await import(`file://${this.path}?version=${new Date().getTime()}`).catch(err => console.log(err));
    for (let name in module.rule) {
      const rule: PluginRule = Object.assign(module.rule[name], {name: name});
      this.plugins.set(name, new PluginRuleMap(rule, module));
    };
    PluginsMap.set(this.name, this);
    //console.log(`Plugin ${this.name} initialized`);
    plugins_sort();
    generatePluginOverviewFile();
  }
  /**
   * init方法用于初始化插件，主要是读取插件文件并解析其中的规则。
   * 此方法仅在类内部使用，不应在外部单独调用。
   */
  private async init() {
    try {
      const module = await import("file://" + this.path);
      for (let name in module.rule) {
        const rule: PluginRule = Object.assign(module.rule[name], { name: name });
        this.plugins.set(name, new PluginRuleMap(rule, module));
        this.subModules = [];
        this.subModules.push(name);
      }
    } catch (err) {
      console.log(err);
    }
  }
  /**
   * create方法用于创建一个新的Plugin实例。
   * 相比直接调用构造函数，使用create方法可以确保适当地调用init方法。
   * @param {string} file 插件文件名。
   * @returns {Promise<Plugin>} 返回一个Promise，该Promise resolve为创建的Plugin实例。
   */
  static async create(file: string): Promise<Plugin> {
    const plugin = new Plugin(file);
    await plugin.init();
    return plugin;
  }
}

export async function Init() {
  await fs.access("./config.yaml").catch(async() => {
    await fs.copyFile("./default_config.yaml", "./config.yaml");
    console.log("未找到config文件，已生成默认配置，请修改后再次登录。");
    process.exit();
  });

  createConfig();  

  let promises: Array<Promise<Plugin>>;
  try {
    const dist = await fs.readdir(path.join(__dirname, "plugins"));
    promises = dist.map(file => {
      if (!/\.js$/.test(file) || /^headfile\.js$/.test(file)) return;
      return Plugin.create(file);
    }).filter((plugin) => plugin) as Array<Promise<Plugin>>;
    await Promise.all(promises);
    await generatePluginOverviewFile();
    console.log("插件总览文件plugins-overview.txt已生成");
    plugins_sort();
  } catch (error) {
    console.error(error);
  }
  return;
}
// 定义生成插件摘要文件的异步函数
async function generatePluginOverviewFile() {
  let summaryText = '插件摘要：\n\n';

  PluginsMap.forEach((plugin: Plugin) => {
    const pluginName = plugin.name;
    summaryText += `插件名称：${pluginName}\n`;

    plugin.plugins.forEach((pluginRuleMap: PluginRuleMap) => {
      const ruleName = pluginRuleMap.get('name');
      const description = pluginRuleMap.get('description');
      const reg = pluginRuleMap.get('reg') === 'noCheck' ? "无正则检查" : pluginRuleMap.get('reg');
      const priority = pluginRuleMap.get('priority');

      summaryText += `  规则名称：${ruleName}\n`;
      summaryText += `  优先级：${priority}\n`;
      summaryText += `  触发正则：${reg}\n`;
      summaryText += `  简介：${description}\n\n`;
    });

    summaryText += '\n';
  });

  await fs.writeFile('plugin_overview.txt', summaryText);
}

export let sortedPlugins:any;
function plugins_sort() {
  // 对插件进行排序，根据优先级排序（数值越小越早执行）
  sortedPlugins = Array.from(PluginsMap).flatMap(([_, pluginContainer]) => {
    return Array.from(pluginContainer.plugins).map(([_, plugin]) => plugin);
  }).sort((a, b) => {
    const priorityA = Number(a.get("priority")) ?? Infinity;
    const priorityB = Number(b.get("priority")) ?? Infinity;
    return priorityA - priorityB;
  });
}