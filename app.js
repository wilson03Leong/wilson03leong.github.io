const webAppKey = "867a5b19d5b3f56f611c21e8";

// ✅ user_str 必须稳定不变，同一个浏览器每次都要一样
// 用 localStorage 保存，没有才生成新的（key 沿用旧版，已订阅的浏览器不会变成新用户）
function getUserStr() {
  let userStr = localStorage.getItem('engagelab_user_str');
  if (!userStr) {
    userStr = "demo_user_" + Date.now();
    localStorage.setItem('engagelab_user_str', userStr);
  }
  return userStr;
}

/* ---------- 初始化日志 ---------- */
// type: 'wait' | 'ok' | 'fail' | 'info'
function logStage(text, type) {
  const box = document.getElementById('logBox');
  if (!box) return;
  const colors = { ok: '#34d399', fail: '#f87171', wait: '#a855f7', info: '#94a3b8' };
  const color = colors[type] || colors.info;

  const row = document.createElement('div');
  row.className = 'log-row';

  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });

  const dot = document.createElement('span');
  dot.className = 'log-dot';
  dot.style.background = color;

  const msg = document.createElement('span');
  msg.className = 'log-text';
  msg.style.color = color;
  msg.textContent = text; // 用 textContent，推送内容里带 HTML 也不会被执行

  row.append(time, dot, msg);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

// 初始化配置
const config = {
  appkey: webAppKey,
  user_str: getUserStr(),
  swUrl: '/sw.produce.min.3.3.5.js',
  //openUrl: window.location.origin + '/promotion',

  // ✅ 开启 MA：SDK 会把这个浏览器的推送设备和 MA 用户绑在一起
  // 前提：MA 控制台已添加 Web 数据源，并选择「同时使用 WebPush」+ 本应用
  maOpen: true,
  userIdentity: { user_id: getUserStr() }, // 玩家 ID 作为 MA 的 user_id，之后 bot 也用同一个
  maCompletion: function(code, msg) {
    if (code === 0) {
      logStage('MA SDK 初始化成功', 'ok');
      window.MAInterface.EUID(function(c, euid) {
        if (c === 0 && euid) logStage('MA 用户 EUID：' + euid, 'info');
        else logStage('获取 EUID 失败（' + c + '）', 'fail');
      });
      reportReturnFromPush();
    } else {
      logStage('MA SDK 初始化失败：' + msg, 'fail');
    }
  },

  success: function(data) {
    console.log("✅ SDK初始化成功", data);
    logStage('SDK 初始化成功', 'ok');
  },

  fail: function(data) {
    console.error("❌ SDK初始化失败", data);
    const reason = data && (data.message || data.content);
    logStage('SDK 初始化失败' + (reason ? '：' + reason : ''), 'fail');
  },

  canGetInfo: function(data) {
    const regId = MTpushInterface.getRegistrationID().toLowerCase(); // ✅ 转小写
    console.log("✅ 订阅成功，RegId:", regId);
    logStage('注册 ID 生成成功', 'ok');
    logStage('RegID: ' + regId, 'info');
  },

  webPushcallback: function(code, tip) {
    console.log("通知权限状态:", code, tip);
    // code: 1 已允许  2 已拒绝  3 未确认  其它为不支持或异常
    if (code === 1)      logStage('通知权限已允许', 'ok');
    else if (code === 2) logStage('通知权限被拒绝', 'fail');
    else if (code === 3) logStage('通知权限未确认（等待用户在引导框操作）', 'wait');
    else                 logStage('通知不可用（' + (tip || code) + '）', 'fail');
  }
};

// 页面打开时就记下来源（之后网址参数会被清掉）
const LAUNCH_FROM = (function() {
  const from = new URLSearchParams(window.location.search).get('from');
  return from && from.indexOf('push_') === 0 ? from : null;
})();

// ✅ 玩家点推送回来：网址带 ?from=push_xxx 时，自动上报「玩家回来了」，MA 旅程据此提前退出并计入转化
function reportReturnFromPush() {
  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');
  if (!from || from.indexOf('push_') !== 0) return;

  window.MAInterface.onEvent({ name: 'player_returned', properties: { source: 'push_click', push: from } });
  logStage('从推送回来（' + from + '），已上报 player_returned', 'ok');

  // 去掉网址里的参数，刷新页面时不会重复上报
  params.delete('from');
  const rest = params.toString();
  history.replaceState(null, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
}

// ✅ LiveDesk 对话框带上同一个玩家 ID，bot 上报事件时才知道是哪个玩家
window.addEventListener('livedesk:ready', function() {
  const playerId = getUserStr();
  try {
    window.$livedesk.setUserId(playerId, { name: 'Player ' + playerId.slice(-4) });
    window.$livedesk.setCustomAttributes({ player_id: playerId });
    if (LAUNCH_FROM) window.$livedesk.setConversationCustomAttributes({ from_push: LAUNCH_FROM });
    logStage('对话框已带上玩家 ID' + (LAUNCH_FROM ? '，来源：' + LAUNCH_FROM : ''), 'ok');
  } catch (e) {
    logStage('对话框设置玩家 ID 失败：' + e.message, 'fail');
  }
});
window.addEventListener('livedesk:error', function(e) {
  console.error('LiveDesk 错误:', e.detail);
  logStage('对话框报错：' + JSON.stringify(e.detail), 'fail');
});

function initPush() {
  if (!('serviceWorker' in navigator)) { logStage('浏览器不支持 Service Worker', 'fail'); return; }
  if (!('PushManager' in window))      { logStage('浏览器不支持 Web Push', 'fail'); return; }
  logStage('开始初始化 SDK…', 'wait');
  // 控制台为「默认提示」模式时，SDK 会自动弹出引导框（关注不迷路），用户点「关注」后才弹系统权限框
  MTpushInterface.init(config);
}

// 页面加载完成后直接初始化（不需要按钮）
document.addEventListener('DOMContentLoaded', function() {

  // 消息监听在 init 之前注册
  MTpushInterface.onMsgReceive(function(res) {
    console.log("📩 收到推送消息:", res);
    const m = res && res.data && res.data.messages && res.data.messages[0];
    logStage('收到推送：' + (m ? m.content : '（无内容）'), 'info');
  });

  MTpushInterface.onMsgClick((msgData) => {
    console.log('点击消息回调:', msgData);
    console.log('msg_id:', msgData.msg_id);
    logStage('点击了推送，msg_id：' + msgData.msg_id, 'info');
  });

  logStage('页面已加载，玩家 ID：' + getUserStr(), 'info');
  initPush();
});
