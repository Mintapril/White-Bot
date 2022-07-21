import { ConfigFile } from "./index.js";

let configFile: ConfigFile;
const createConfigFile = () => configFile = new ConfigFile();

export { createConfigFile, configFile };