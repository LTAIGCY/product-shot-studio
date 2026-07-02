export function renderAdminHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Product Shot Studio 监测后台</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #eef4f1;
      --panel: rgba(255, 255, 255, 0.94);
      --ink: #10201d;
      --muted: #6b7b78;
      --line: #dbe6e1;
      --brand: #107f70;
      --brand-soft: #e8f6f2;
      --danger: #a63b2e;
      --warning: #9a6a19;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at top left, #d9ebe6, transparent 36rem), var(--bg);
      color: var(--ink);
    }
    .shell { max-width: 1360px; margin: 0 auto; padding: 28px; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    p { color: var(--muted); margin: 6px 0 0; }
    button, input { font: inherit; }
    button {
      border: 0;
      border-radius: 12px;
      background: var(--brand);
      color: white;
      padding: 10px 16px;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: #eef7f4;
      color: var(--brand);
      border: 1px solid rgba(16, 127, 112, 0.22);
    }
    input { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; min-width: 220px; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(30, 55, 50, 0.08);
      padding: 18px;
    }
    .login { display: flex; gap: 10px; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
    .metric strong { display: block; font-size: 28px; margin-top: 6px; }
    .layout { display: grid; grid-template-columns: 1.12fr 1fr; gap: 14px; }
    .layout-wide { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table-scroll { overflow: auto; }
    .users-table { min-width: 1460px; }
    .feedback-table { min-width: 1180px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-weight: 700; white-space: nowrap; }
    td { word-break: break-word; }
    .feedback-message { max-width: 420px; white-space: pre-wrap; }
    .status-failed { color: var(--danger); font-weight: 700; }
    .admin-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; color: var(--muted); }
    .live-pill, .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      padding: 7px 10px;
      font-weight: 700;
      white-space: nowrap;
    }
    .live-pill { border: 1px solid rgba(16, 127, 112, 0.2); color: var(--brand); background: var(--brand-soft); }
    .live-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--brand); box-shadow: 0 0 0 6px rgba(16, 127, 112, 0.12); }
    .live-dot.offline { background: var(--danger); box-shadow: 0 0 0 6px rgba(166, 59, 46, 0.12); }
    .presence-online { background: #e7f7ef; color: #0b7a4b; }
    .presence-offline { background: #f3f0ec; color: #756b62; }
    .account-active { background: #eef7f4; color: var(--brand); }
    .account-disabled { background: #fff2ed; color: var(--danger); }
    .message { color: var(--danger); min-height: 22px; margin-top: 10px; }
    .hint { color: var(--muted); font-size: 13px; margin: -6px 0 14px; }
    .password-meta { display: grid; gap: 3px; min-width: 150px; }
    .password-meta small { color: var(--muted); }
    button.mini-button { padding: 7px 10px; border-radius: 9px; font-size: 12px; white-space: nowrap; }
    .hidden { display: none; }
    @media (max-width: 1100px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .layout { grid-template-columns: 1fr; }
      header { align-items: flex-start; flex-direction: column; }
      .login { width: 100%; flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <h1>Product Shot Studio 监测后台</h1>
        <p>实时查看用户、在线状态、积分、充值、扣费、生成任务和异常审计事件。</p>
      </div>
      <div class="login panel">
        <input id="password" type="password" placeholder="管理员密码" />
        <button id="login">登录后台</button>
        <button id="refresh" class="secondary hidden">立即刷新</button>
      </div>
    </header>
    <div id="message" class="message"></div>
    <section id="dashboard" class="hidden">
      <div class="admin-meta">
        <span class="live-pill"><span id="liveDot" class="live-dot"></span><span id="liveStatus">实时监测中</span></span>
        <span id="lastUpdated">等待刷新</span>
      </div>
      <div class="grid">
        <div class="panel metric"><span>用户数</span><strong id="totalUsers">0</strong></div>
        <div class="panel metric"><span>在线用户</span><strong id="onlineUsers">0</strong></div>
        <div class="panel metric"><span>总余额</span><strong id="totalBalance">0</strong></div>
        <div class="panel metric"><span>总充值</span><strong id="totalRecharged">0</strong></div>
        <div class="panel metric"><span>总消耗</span><strong id="totalUsed">0</strong></div>
      </div>
      <div class="layout">
        <div class="panel">
          <h2>用户列表</h2>
          <p class="hint">账号 ID 永久唯一，账号名允许重复。密码只保存不可逆哈希，后台可查看加密状态并重置，但不会泄露原密码。</p>
          <div class="table-scroll">
            <table class="users-table">
              <thead>
                <tr>
                  <th>账号 ID</th><th>账号名</th><th>密码状态</th><th>在线状态</th>
                  <th>最后登录</th><th>最后在线</th><th>最后下线</th><th>余额</th>
                  <th>冻结</th><th>充值 / 消耗</th><th>账号状态</th><th>操作</th>
                </tr>
              </thead>
              <tbody id="users"></tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <h2>失败任务</h2>
          <table><thead><tr><th>账号</th><th>模型</th><th>原因</th><th>时间</th></tr></thead><tbody id="failedJobs"></tbody></table>
        </div>
        <div class="panel">
          <h2>最近充值</h2>
          <table><thead><tr><th>账号</th><th>金额</th><th>模型</th><th>时间</th></tr></thead><tbody id="recharges"></tbody></table>
        </div>
        <div class="panel">
          <h2>最近扣费</h2>
          <table><thead><tr><th>账号</th><th>扣费</th><th>模型</th><th>时间</th></tr></thead><tbody id="usage"></tbody></table>
        </div>
      </div>
      <div class="layout-wide">
        <div class="panel">
          <h2>用户反馈</h2>
          <p class="hint">展示最近提交的设置页意见反馈，包含账号、联系方式、客户端版本和 IP。</p>
          <div class="table-scroll">
            <table class="feedback-table">
              <thead><tr><th>时间</th><th>账号 ID</th><th>账号名</th><th>联系方式</th><th>反馈内容</th><th>IP</th><th>版本</th></tr></thead>
              <tbody id="feedback"></tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <h2>实时审计事件</h2>
          <table><thead><tr><th>时间</th><th>账号</th><th>动作</th><th>IP</th><th>详情</th></tr></thead><tbody id="auditEvents"></tbody></table>
        </div>
      </div>
    </section>
  </div>
  <script>
    const $ = (id) => document.getElementById(id);
    const tokenKey = "product-shot-admin-token";
    const fmt = (value) => Number(value || 0).toLocaleString("zh-CN") + " 积分";
    const date = (value) => value ? new Date(value).toLocaleString("zh-CN") : "-";
    let liveTimer = null;

    $("login").onclick = async () => {
      try {
        const res = await fetch("/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: $("password").value })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "登录失败");
        localStorage.setItem(tokenKey, data.token);
        await load();
        startLiveMonitor();
      } catch (error) {
        $("message").textContent = error.message;
      }
    };

    $("refresh").onclick = () => load();

    async function api(path) {
      const res = await fetch(path, { headers: { Authorization: "Bearer " + localStorage.getItem(tokenKey) } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "请求失败");
      return data;
    }

    async function apiPost(path, body) {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem(tokenKey),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "请求失败");
      return data;
    }

    async function load() {
      try {
        const [overview, users, jobs, recharges, auditEvents, feedback] = await Promise.all([
          api("/admin/overview"),
          api("/admin/users"),
          api("/admin/jobs?status=failed&limit=12"),
          api("/admin/recharges?limit=12"),
          api("/admin/audit-events?limit=16"),
          api("/admin/feedback?limit=20")
        ]);
        $("message").textContent = "";
        setLiveStatus(true);
        $("dashboard").classList.remove("hidden");
        $("refresh").classList.remove("hidden");
        $("lastUpdated").textContent = "最后刷新：" + new Date().toLocaleString("zh-CN");
        $("totalUsers").textContent = overview.totalUsers;
        $("onlineUsers").textContent = overview.onlineUsers || 0;
        $("totalBalance").textContent = fmt(overview.totalBalancePoints);
        $("totalRecharged").textContent = fmt(overview.totalRechargedPoints);
        $("totalUsed").textContent = fmt(overview.totalUsedPoints);
        $("users").innerHTML = users.items.map(renderUser).join("");
        $("failedJobs").innerHTML = jobs.items.map((job) => "<tr><td>" + text(job.username || "-") + "</td><td>" + text(job.modelId || "-") + "</td><td class='status-failed'>" + text(job.errorMessage || "-") + "</td><td>" + date(job.createdAt) + "</td></tr>").join("");
        $("recharges").innerHTML = recharges.items.map((tx) => "<tr><td>" + text(tx.username || "-") + "</td><td>" + fmt(tx.amountPoints) + "</td><td>" + text(tx.modelId || "-") + "</td><td>" + date(tx.createdAt) + "</td></tr>").join("");
        $("usage").innerHTML = overview.recentUsage.map((tx) => "<tr><td>" + text(tx.username || "-") + "</td><td>" + fmt(Math.abs(tx.amountPoints)) + "</td><td>" + text(tx.modelId || "-") + "</td><td>" + date(tx.createdAt) + "</td></tr>").join("");
        $("feedback").innerHTML = feedback.items.map(renderFeedback).join("");
        $("auditEvents").innerHTML = auditEvents.items.map((event) => "<tr><td>" + date(event.createdAt) + "</td><td>" + text(event.username || "-") + "</td><td>" + text(actionLabel(event.action)) + "</td><td>" + text(event.ip || "-") + "</td><td>" + text(metadataText(event.metadata)) + "</td></tr>").join("");
      } catch (error) {
        setLiveStatus(false);
        $("message").textContent = error.message;
      }
    }

    function renderUser(user) {
      return "<tr>" +
        "<td><strong>" + text(user.accountId) + "</strong></td>" +
        "<td>" + text(user.username) + "</td>" +
        "<td>" + passwordStatus(user.password) + "</td>" +
        "<td>" + presenceBadge(user) + "</td>" +
        "<td>" + date(user.lastLoginAt) + "</td>" +
        "<td>" + date(user.lastSeenAt) + "</td>" +
        "<td>" + date(user.lastLogoutAt) + "</td>" +
        "<td>" + fmt(user.wallet.balancePoints) + "</td>" +
        "<td>" + fmt(user.wallet.reservedPoints) + "</td>" +
        "<td>" + fmt(user.wallet.totalRechargedPoints) + " / " + fmt(user.wallet.totalUsedPoints) + "</td>" +
        "<td>" + accountBadge(user.status) + "</td>" +
        "<td><button class='mini-button secondary' data-reset-password='" + text(user.id) + "' data-account-id='" + text(user.accountId) + "'>重置密码</button></td>" +
        "</tr>";
    }

    function renderFeedback(item) {
      return "<tr>" +
        "<td>" + date(item.createdAt) + "</td>" +
        "<td><strong>" + text(item.accountId || "-") + "</strong></td>" +
        "<td>" + text(item.username || "-") + "</td>" +
        "<td>" + text(item.contact || "-") + "</td>" +
        "<td class='feedback-message'>" + text(item.message || "-") + "</td>" +
        "<td>" + text(item.ip || "-") + "</td>" +
        "<td>" + text(item.appVersion || "-") + "</td>" +
        "</tr>";
    }

    function passwordStatus(password) {
      if (!password?.configured) return "<span class='status-failed'>未设置</span>";
      return "<span class='password-meta'><strong>" + text(password.masked) + "</strong><small>" +
        text(password.algorithm) + " · " + date(password.updatedAt) + "</small></span>";
    }

    function presenceBadge(user) {
      const online = user.presenceStatus === "online";
      return "<span class='badge " + (online ? "presence-online" : "presence-offline") + "'>" + text(user.presenceLabel || (online ? "在线" : "离线")) + "</span>";
    }

    function accountBadge(status) {
      const active = status === "active";
      return "<span class='badge " + (active ? "account-active" : "account-disabled") + "'>" + (active ? "已启用" : text(status || "已停用")) + "</span>";
    }

    function startLiveMonitor() {
      if (liveTimer) clearInterval(liveTimer);
      liveTimer = setInterval(() => load(), 5000);
    }

    function setLiveStatus(ok) {
      $("liveStatus").textContent = ok ? "实时监测中" : "连接异常，等待恢复";
      $("liveDot").classList.toggle("offline", !ok);
    }

    function actionLabel(action) {
      const labels = {
        "user.register": "用户注册",
        "auth.login": "用户登录",
        "auth.logout": "用户退出",
        "auth.login_failed": "登录失败",
        "wallet.recharge_simulated": "模拟充值",
        "usage.reserve": "生成预扣",
        "usage.commit": "成功扣费",
        "usage.cancel": "取消/失败释放",
        "user.feedback_submit": "用户提交反馈",
        "admin.login": "管理员登录",
        "admin.login_failed": "后台登录失败",
        "admin.adjust_points": "管理员调分",
        "admin.reset_password": "管理员重置密码"
      };
      return labels[action] || action;
    }

    function metadataText(metadata) {
      if (!metadata) return "-";
      if (typeof metadata === "string") return metadata;
      return Object.entries(metadata).map(([key, value]) => key + "=" + value).join("，");
    }

    function text(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    }

    if (localStorage.getItem(tokenKey)) {
      load();
      startLiveMonitor();
    }

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-reset-password]");
      if (!button) return;
      const accountId = button.dataset.accountId;
      const password = window.prompt("为账号 " + accountId + " 输入新密码（6-128 位）。原密码无法查看。");
      if (password === null) return;
      try {
        button.disabled = true;
        await apiPost("/admin/users/" + encodeURIComponent(button.dataset.resetPassword) + "/reset-password", { password });
        window.alert("密码已重置。请立即安全地告知用户；此密码不会在后台再次显示。");
        await load();
      } catch (error) {
        $("message").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}
