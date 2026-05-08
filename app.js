const webAppKey = "867a5b19d5b3f56f611c21e8";

// ✅ user_str 必须稳定不变，同一个浏览器每次都要一样
// 用 localStorage 保存，没有才生成新的
function getUserStr() {
  let userStr = localStorage.getItem('engagelab_user_str');
  if (!userStr) {
    userStr = "demo_user_" + Date.now();
    localStorage.setItem('engagelab_user_str', userStr);
  }
  return userStr;
}

// 初始化配置
const config = {
  appkey: webAppKey,
  user_str: getUserStr(),
  swUrl: '/sw.produce.min.3.3.5.js',

  success: function(data) {
    console.log("✅ SDK初始化成功", data);
    document.getElementById('status').textContent = '状态：SDK已初始化';
  },

  fail: function(data) {
    console.error("❌ SDK初始化失败", data);
    document.getElementById('status').textContent = '状态：初始化失败';
  },

  canGetInfo: function(data) {
    console.log("✅ 订阅成功，RegId:", MTpushInterface.getRegistrationID());
    console.log("完整数据:", data);
    document.getElementById('status').textContent =
      '状态：已订阅 (RegId: ' + MTpushInterface.getRegistrationID() + ')';
    alert("订阅成功！");
  },

  webPushcallback: function(code, tip) {
    console.log("通知权限状态:", code, tip);
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {

  document.getElementById('subscribeBtn').addEventListener('click', function() {

    if (!('serviceWorker' in navigator)) {
      alert("你的浏览器不支持Service Worker");
      return;
    }

    if (!('PushManager' in window)) {
      alert("你的浏览器不支持Web Push");
      return;
    }

    MTpushInterface.init(config);
  });

  MTpushInterface.onMsgReceive(function(res) {
    console.log("📩 收到推送消息:", res);
    document.getElementById('status').textContent = '收到推送: ' + res.data.messages[0].content;
  });
});
