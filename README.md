# White-Bot
 基于oicq协议库的简单的qq机器人  
 业余爱好，技术力低下
 #### 下一步...
 - 添加每个bot实例的插件开关功能
 - 移除config.yaml中的插件设置，每个插件会有一个单独的配置文件
 - 插件可以是文件夹形式
 - 我的部分Yunzai-Bot插件会移植过来
 - 还在想
 ### 部署
 ```bash
 git clone https://github.com/Mintapril/White-Bot.git
 cd White-Bot
 tsc
 npm i
 ```
 ### 使用
 ```bash
 node index # 生成config.yaml编辑配置后再次
 node index 
 # 或复制default_config.yaml为config.yaml一份并编辑  
 ```
 ### 持久运行
 ```bash
 npm i pm2 -g
 pm2 start index.js --name White-Bot
 pm2 ls
 ```
 ### 插件
 - 将插件放入 `./plugins` 文件夹即可
 - White-Bot基本支持Yunzai-Bot(v2)的单独js文件形式的插件，未来会添加更多特性
 ```typescript
 /**     插件示例     */
 export const rule = {
  onesaid: /** 规则名字,当method项为可调用时任意 **/ {
    reg: "^#?一言",     //匹配正则
    description: null,  //简介
    method: onesaid,    //调用的method，此项有效时key可以任意
  },
}
export async function onesaid(e: MessageEvent): Promise<boolean> {
  //do something...
  return true;   //返回true表示成功执行，目前返回值暂无效
}
```
 
 

 
 
