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
      --panel: rgba(255, 255, 255, 0.9);
      --ink: #10201d;
      --muted: #6b7b78;
      --line: #dbe6e1;
      --brand: #107f70;
      --danger: #a63b2e;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
    }
    body { margin: 0; background: radial-gradient(circle at top left, #d9ebe6, transparent 36rem), var(--bg); color: var(--ink); }
    .shell { max-width: 1280px; margin: 0 auto; padding: 28px; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    p { color: var(--muted); margin: 6px 0 0; }
    button, input { font: inherit; }
    button { border: 0; border-radius: 12px; background: var(--brand); color: white; padding: 10px 16px; font-weight: 700; cursor: pointer; }
    input { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; min-width: 220px; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 20px 60px rgba(30, 55, 50, 0.08); padding: 18px; }
    .login { display: flex; gap: 10px; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
    .metric strong { display: block; font-size: 28px; margin-top: 6px; }
    .layout { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-weight: 700; }
    .status-failed { color: var(--danger); font-weight: 700; }
    .toolbar { display: flex; gap: 10px; align-items: center; }
    .hidden { display: none; }
    .message { color: var(--danger); min-height: 22px; margin-top: 10px; }
    @media (max-width: 980px) { .grid, .layout { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <h1>Product Shot Studio 监测后台</h1>
        <p>本地账本服务：用户、积分、充值、扣费、生成任务和异常记录。</p>
      </div>
      <div class="login panel">
        <input id="password" type="password" placeholder="管理员密码" />
        <button id="login">登录后台</button>
        <button id="refresh" class="hidden">刷新</button>
      </div>
    </header>
    <div id="message" class="message"></div>
    <section id="dashboard" class="hidden">
      <div class="grid">
        <div class="panel metric"><span>用户数</span><strong id="totalUsers">0</strong></div>
        <div class="panel metric"><span>总余额</span><strong id="totalBalance">0</strong></div>
        <div class="panel metric"><span>总充值</span><strong id="totalRecharged">0</strong></div>
        <div class="panel metric"><span>总消耗</span><strong id="totalUsed">0</strong></div>
      </div>
      <div class="layout">
        <div class="panel">
          <h2>用户列表</h2>
          <table><thead><tr><th>账号</th><th>余额</th><th>冻结</th><th>充值/消耗</th><th>状态</th></tr></thead><tbody id="users"></tbody></table>
        </div>
        <div class="panel">
          <h2>失败任务</h2>
          <table><thead><tr><th>账号</th><th>模型</th><th>错误</th><th>时间</th></tr></thead><tbody id="failedJobs"></tbody></table>
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
    </section>
  </div>
  <script>
    const $ = (id) => document.getElementById(id);
    const fmt = (value) => Number(value || 0).toLocaleString("zh-CN") + " 积分";
    const date = (value) => value ? new Date(value).toLocaleString("zh-CN") : "-";
    const tokenKey = "product-shot-admin-token";

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
        const [overview, users, jobs, recharges] = await Promise.all([
          api("/admin/overview"),
          api("/admin/users"),
          api("/admin/jobs?status=failed&limit=12"),
          api("/admin/recharges?limit=12")
        ]);
        $("message").textContent = "";
        $("dashboard").classList.remove("hidden");
        $("refresh").classList.remove("hidden");
        $("totalUsers").textContent = overview.totalUsers;
        $("totalBalance").textContent = fmt(overview.totalBalancePoints);
        $("totalRecharged").textContent = fmt(overview.totalRechargedPoints);
        $("totalUsed").textContent = fmt(overview.totalUsedPoints);
        $("users").innerHTML = users.items.map((user) => "<tr><td>" + user.username + "</td><td>" + fmt(user.wallet.balancePoints) + "</td><td>" + fmt(user.wallet.reservedPoints) + "</td><td>" + fmt(user.wallet.totalRechargedPoints) + " / " + fmt(user.wallet.totalUsedPoints) + "</td><td>" + user.status + "</td></tr>").join("");
        $("failedJobs").innerHTML = jobs.items.map((job) => "<tr><td>" + (job.username || "-") + "</td><td>" + (job.modelId || "-") + "</td><td class='status-failed'>" + (job.errorMessage || "-") + "</td><td>" + date(job.createdAt) + "</td></tr>").join("");
        $("recharges").innerHTML = recharges.items.map((tx) => "<tr><td>" + (tx.username || "-") + "</td><td>" + fmt(tx.amountPoints) + "</td><td>" + (tx.modelId || "-") + "</td><td>" + date(tx.createdAt) + "</td></tr>").join("");
        $("usage").innerHTML = overview.recentUsage.map((tx) => "<tr><td>" + (tx.username || "-") + "</td><td>" + fmt(Math.abs(tx.amountPoints)) + "</td><td>" + (tx.modelId || "-") + "</td><td>" + date(tx.createdAt) + "</td></tr>").join("");
      } catch (error) {
        $("message").textContent = error.message;
      }
    }

    if (localStorage.getItem(tokenKey)) {
      load();
    }
  </script>
</body>
</html>`;
}
