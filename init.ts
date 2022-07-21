import fs from "fs/promises";
import { existsSync , PathLike, watch} from "fs";
import path from "path";
import common from "./common.js";
import { PluginsMap } from "./plugins/headfile.js";
import { createConfigFile } from "./config.js";  

const __dirname = process.cwd();
let i = 0;
export class Plugin {
  name: string;
  path: string;
  plugins: Map<string, Map<string, RegExp | Function | string>> = new Map();
  /**
   * Creates an instance of Plugin.
   * @param {string} _path
   * @memberof Plugin
   */
  subModiles: Array<string> = [];
  constructor(file: string) {
    this.path = path.join(__dirname, "plugins", file);
    this.name = file.replace(/\.js$/, "");
    import("file://" + this.path).then(module => {
      for (let name in module.rule) {
        const value = module.rule[name];
        this.plugins.set(name, new Map([
          ["name", name],
          ["reg", value.reg === "noCheck" ? null : new RegExp(value.reg)],
          ["description", value.description],
          ["function", module[name]],
        ]));
        this.subModiles = [];
        this.subModiles.push(name);
      };
    });
    PluginsMap.set(this.name, this);
    let fsTimeout: NodeJS.Timeout | null;
    watch(this.path, async (event, filename) => {
      await common.sleep(150);
      if (!fsTimeout) {
        fsTimeout = setTimeout(() => fsTimeout = null, 500); // give 0.5 seconds for multiple events
      } else return;
      if (!existsSync(this.path)) {
        PluginsMap.delete(this.name);
        console.log(`${filename}被移除`);
        return;
      }
      await this.refresh();
      console.log(`更新${filename}完成`);
    });
  }
  refresh: Function = async() => {
    //console.log(this._path);
    const module = await import(`file://${this.path}?version=${new Date().getTime()}`);
    for (let key in module.rule) {
      const value = module.rule[key];
      this.plugins.set(key, new Map([
        ["name", key],
        ["reg", new RegExp(value.reg)],
        ["description", value.description],
        ["function", module[key]],
      ]));
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
    process.exit(0);
    //throw new ConfigFileNotFoundError;
  });

  createConfigFile();  

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
