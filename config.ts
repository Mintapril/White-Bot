import { ConfigFile } from "./index.js";

let BotConf: ConfigFile;
/**
 *
 * 创建config实例
 * @param {string} [path] yaml配置文件位置
 */
const createConfig = (path?: string) => BotConf = new ConfigFile(path);

export { createConfig, BotConf };