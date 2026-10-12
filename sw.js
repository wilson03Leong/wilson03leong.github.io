// 推送由 EngageLab SDK 自带的 service worker（/sw.produce.min.3.3.5.js）处理。
// 本文件目前没有被任何地方注册。
// 旧版在这里监听了 'push' 事件，一旦被注册就会和 SDK 抢事件，导致重复弹通知，所以已移除。
// 如果以后要加自定义逻辑，不要监听 'push'，也不要和 SDK 的 SW 注册在同一作用域。

const VERSION = "1.1.0"; // 每次改动就改这个数字
