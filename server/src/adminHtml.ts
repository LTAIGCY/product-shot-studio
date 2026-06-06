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
      --panel: rgba(255, 255, 255, 0.92);
      --ink: #10201d;
      --muted: #6b7b78;
      --line: #dbe6e1;
      --brand: #107f70;
      --danger: #a63b2e;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top left, #d9ebe6, transparent 36rem), var(--bg); color: var(--ink); }
    .shell { max-width: 1320px; margin: 0 auto; padding: 28px; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    p { color: var(--muted); margin: 6px 0 0; }
    button, input { font: inherit; }
    button { border: 0; border-radius: 12px; background: var(--brand); color: white; padding: 10px 16px; font-weight: 700; cursor: pointer; }
    button.secondary { background: #eef7f4; color: var(--brand); border: 1px solid rgba(16, 127, 112, 0.22); }
    input { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; min-width: 220px; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 20px 60px rgba(30, 55, 50, 0.08); padding: 18px; }
    .login { display: flex; gap: 10px; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
    .metric strong { display: block; font-size: 28px; margin-top: 6px; }
    .layout { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; }
    .layout-wide { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-weight: 700; }
    td { word-break: break-word; }
    .status-failed { color: var(--danger); font-weight: 700; }
    .admin-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; color: var(--muted); }
    .live-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(16, 127, 112, 0.2); border-radius: 999px; padding: 8px 12px; color: var(--brand); background: #e8f6f2; font-weight: 700; }
    .live-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--brand); box-shadow: 0 0 0 6px rgba(16, 127, 112, 0.12); }
    .live-dot.offline { background: var(--danger); box-shadow: 0 0 0 6px rgba(166, 59, 46, 0.12); }
    .message { color: var(--danger); min-height: 22px; margin-top: 10px; }
    .hidden { display: none; }
    @media (max-width: 980px) {
      .grid, .layout { grid-template-columns: 1fr; }
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
        <p>实时查看用户、积分、充值、扣费、生成任务和异常审计事件。</p>
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
        <div class="panel metric"><span>总余额</span><strong id="totalBalance">0</strong></div>
        <div class="panel metric"><span>总充值</span><strong id="totalRecharged">0</strong></div>
        <div class="panel metric"><span>总消耗</span><strong id="totalUsed">0</strong></div>
      </div>
      <div class="layout">
        <div class="panel">
          <h2>用户列表</h2>
          <table><thead><tr><th>账号</th><th>余额</th><th>冻结</th><th>充值 / 消耗</th><th>状态</th></tr></thead><tbody id="users"></tbody></table>
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

    async function load() {
      try {
        const [overview, users, jobs, recharges, auditEvents] = await Promise.all([
          api("/admin/overview"),
          api("/admin/users"),
          api("/admin/jobs?status=failed&limit=12"),
          api("/admin/recharges?limit=12"),
          api("/admin/audit-events?limit=16")
        ]);
        $("message").textContent = "";
        setLiveStatus(true);
        $("dashboard").classList.remove("hidden");
        $("refresh").classList.remove("hidden");
        $("lastUpdated").textContent = "最后刷新：" + new Date().toLocaleString("zh-CN");
        $("totalUsers").textContent = overview.totalUsers;
        $("totalBalance").textContent = fmt(overview.totalBalancePoints);
        $("totalRecharged").textContent = fmt(overview.totalRechargedPoints);
        $("totalUsed").textContent = fmt(overview.totalUsedPoints);
        $("users").innerHTML = users.items.map((user) => "<tr><td>" + text(user.username) + "</td><td>" + fmt(user.wallet.balancePoints) + "</td><td>" + fmt(user.wallet.reservedPoints) + "</td><td>" + fmt(user.wallet.totalRechargedPoints) + " / " + fmt(user.wallet.totalUsedPoints) + "</td><td>" + text(user.status) + "</td></tr>").join("");
        $("failedJobs").innerHTML = jobs.items.map((job) => "<tr><td>" + text(job.username || "-") + "</td><td>" + text(job.modelId || "-") + "</td><td class='status-failed'>" + text(job.errorMessage || "-") + "</td><td>" + date(job.createdAt) + "</td></tr>").join("");
        $("recharges").innerHTML = recharges.items.map((tx) => "<tr><td>" + text(tx.username || "-") + "</td><td>" + fmt(tx.amountPoints) + "</td><td>" + text(tx.modelId || "-") + "</td><td>" + date(tx.createdAt) + "</td></tr>").join("");
        $("usage").innerHTML = overview.recentUsage.map((tx) => "<tr><td>" + text(tx.username || "-") + "</td><td>" + fmt(Math.abs(tx.amountPoints)) + "</td><td>" + text(tx.modelId || "-") + "</td><td>" + date(tx.createdAt) + "</td></tr>").join("");
        $("auditEvents").innerHTML = auditEvents.items.map((event) => "<tr><td>" + date(event.createdAt) + "</td><td>" + text(event.username || "-") + "</td><td>" + text(actionLabel(event.action)) + "</td><td>" + text(event.ip || "-") + "</td><td>" + text(metadataText(event.metadata)) + "</td></tr>").join("");
      } catch (error) {
        setLiveStatus(false);
        $("message").textContent = error.message;
      }
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
        "auth.login_failed": "登录失败",
        "wallet.recharge_simulated": "模拟充值",
        "usage.reserve": "生成预扣",
        "usage.commit": "成功扣费",
        "usage.cancel": "取消/失败释放",
        "admin.login": "管理员登录",
        "admin.login_failed": "后台登录失败",
        "admin.adjust_points": "管理员调分"
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
  </script>
</body>
</html>`;
}
