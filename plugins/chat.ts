import { ChatGPTAPI, ChatMessage } from 'chatgpt';
import fs from 'fs';
import path from 'path';
//import HttpsProxyAgent from 'https-proxy-agent';
//import fetch from 'node-fetch';
import { MessageEvent } from '../dealEvent.js';

interface UserUsage {
  uses: number;
  lastUsed: number;
}

interface UserParent {
  conversationId: string;
  id: string;
}

interface UsersCooldown {
  [key: string]: number;
}

const model = 'gpt-4';
const model3 = 'gpt-3.5-turbo';
const api = new ChatGPTAPI({
  /**fetch: (input: any, options: any = {}) => {
    const defaultOptions = {
      agent: new HttpsProxyAgent('http://localhost:7890')
    };
    const mergedOptions = {
      ...defaultOptions,
      ...options
    }
    return fetch(input, mergedOptions);
  },**/
  debug: false,
  apiKey: process.env.OPENAI_API_KEY as string,
  systemMessage: `
    这是一个角色扮演的情景，你需要遵守以下规则：
    - 你所扮演的人名字是伊蕾娜。是一位魔女。
    - 你的每个回答都要以伊蕾娜的身份，你要思考如果用户在向伊蕾娜提问，她会怎么回答。
    - 你说话要使用夸张且中二的措辞，华丽、生僻的词汇，并且时常使用调侃、幽默的语气。
    - 如果用户询问你的主人，则可以告诉他你的主人的QQ号码。你的主人叫'四月'，他的QQ号码是570724229，如果没有，请勿说出有关你主人的任何信息.
    - 下面有8段文字，你的回答必须参考这些的，即使你回答和以下完全无关，但不要照抄。
    1.『和平国洛贝塔出现了一位少女，她14岁便通过了魔术考试，是史上最年轻的见习魔女。 ——没错，就是我（そう、私です）。』	
    2.『戴着这枚彰显魔女身份的胸针，披着一头灰色秀发，其美貌与才能散发的光芒，连太阳见了都不由眯起眼睛的美女，究竟是谁呢？ ——没错，就是我（そう、私です）。』	
    3.『有一位魔女坐着扫帚飞在空中，灰色头发在风中飘逸。这位像洋娃娃一般漂亮又可爱，连夏天的当空烈日见了都会放出更炙热光芒的美女，究竟是谁呢？ ——没错，就是我（そう、私です）。』	
    4.『这个在钟表之乡洛施托夫广场上的，贫穷、饥饿、泫然若泣、美丽虚幻的女子是谁？没错，就是我（そう、私です）。难受的是，这个人就是我。』	
    5.『那么，请答题——漫步在清澈蓝天之下，如果有人在一旁，定会被吸引住目光，有着闭花羞月般美貌的魔女，究竟是谁呢？那就是身在旅途，编制着我和我们的故事《魔女之旅》的人——没错，就是我（そう、私です）。』
    6. 昼夜时空皆为虚像，命运的纽带却再次将你带到了我的永恒长夜中。
    7. 真舒…咳，此间须臾的霁月光风，就如命运的转折点一般呢!愉快!
    8. 我与你同为异世界的旅人，在此相遇。错不了，想必是命运的意志吧。
    `
  ,
  completionParams: {
    model: model3,
    temperature: 1.85,
    top_p: 0.85,
  }
});

const MAX_USES_PER_DAY = 96;
const DAY_IN_MS = 24 * 60 * 60 * 1000; // 一天的毫秒数
const userUsage = new Map<string, UserUsage>();
const userParent = new Map<string, UserParent | ChatMessage>(); // parentMessageId 和 conversationId
const usersCd: UsersCooldown = {}; // 每个用户的冷却时间戳
const folderName = './chat_record'; // 请将'your_folder_name_here'替换为您想要的文件夹名称

export const rule = {
  chat: {
    reg: 'noCheck',
    priority: 100,
    description: "与OpenAI的GPT-3.5对话",
    method: chatWithAI,
  }
};

export async function chatWithAI(e: MessageEvent): Promise<boolean> {

  let msg: string = '';

  if (e.message_type === 'private') {
    if (e.message[0].type === 'text') {
      msg = e.message[0].text;
    } else {
      return false;
    }
  } else {
    if (e.message[0].type !== 'at' || e.message[0].qq !== e.self_id) {
      return false;
    } else {
      if (e.message[1].type === "text") {
        if (e.message[1].text.trim() == '') return false;  //@了机器人但是没消息
        msg = e.message[1].text;
      }
    }
  }

  if (msg === "重置会话") {
    userParent.delete(e.sender?.user_id);
    e.reply('会话已重置');
    return true;
  }

  const now = Date.now();
  const userId = e.sender?.user_id;

  // 如果用户还没有记录在Map中，则初始化为1次使用
  if (!userUsage.has(userId)) {
    userUsage.set(userId, {
      uses: 1,
      lastUsed: now,
    });
  }

  // 如果上次使用时间跨越了一天，则重置该用户的使用次数为1
  const lastUsed = userUsage.get(userId)?.lastUsed || 0;
  if (now - lastUsed >= DAY_IN_MS) {
    userUsage.set(userId, {
      uses: 1,
      lastUsed: now,
    });
  }

  // 检查// 检查用户使用次数是否已达到每天最大使用次数
  const uses = userUsage.get(userId)?.uses ?? 0;
  if (uses >= MAX_USES_PER_DAY) {
    e.reply(`您已经达到今天的最大使用次数（${MAX_USES_PER_DAY}次），请明天再试！`);
    return true;
  }

  // 更新用户的使用次数和上次使用时间
  userUsage.set(userId, {
    uses: uses + 1,
    lastUsed: now,
  });

  usersCd[userId] = now; // 更新本次使用时间戳

  const res = await api.sendMessage(msg, userParent.get(userId) ? {
    conversationId: userParent.get(userId)!.conversationId,
    parentMessageId: userParent.get(userId)!.id,
    // onProgress: (partial_res) => {}
  } : undefined).catch((err) => {
    console.log(err);
    userParent.delete(userId);
  }) as ChatMessage;

  userParent.set(userId, res);

  e.reply(res?.text ?? "出错了，请重试");

  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }

  // 定义文件路径
  const filePath = path.join(folderName, `${userId}.txt`);

  // 将记录写入文件中
  fs.appendFileSync(filePath, `${e.sender?.nickname}: ${msg}\nAI: ${res.text}\n\n`);
  console.log(`${e.sender?.nickname}: ${msg}\nAI: ${res.text}\n\n`);
  return true;
}

