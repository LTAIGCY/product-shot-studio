# 轻拍图片设计网站

这是 `qingpaiai.com` 的个人软件作品展示网站，与 `api.qingpaiai.com` 的后端服务相互独立。网站名称和内容已与备案申请中的“轻拍图片设计 / 网络图片”保持一致。

## 本地预览

直接双击 `index.html` 即可查看。也可以在当前目录启动任意静态文件服务器。

## 上线前检查

1. 确认 `2499986960@qq.com` 能正常收件，不能使用时请替换为真实联系方式。
2. 获得 ICP 备案号后，在所有页面底部添加正式备案号，并链接至 `https://beian.miit.gov.cn/`；未获得备案号前不要填写虚构或占位备案号。
3. 根据实际经营主体、服务范围和数据处理方式复核隐私政策与服务条款。
4. 备案审核期间保持“轻拍图片设计”的网站标题和个人软件作品定位，不加入充值、交易、论坛、直播等与当前备案内容不一致的功能。

## 部署到腾讯云

在服务器创建目录并上传本目录中的网站文件：

```bash
sudo mkdir -p /var/www/qingpai
sudo chown -R ubuntu:ubuntu /var/www/qingpai
```

将 `deploy/nginx-qingpaiai.com.conf` 上传到：

```text
/etc/nginx/sites-available/qingpaiai.com
```

然后启用站点：

```bash
sudo ln -sf /etc/nginx/sites-available/qingpaiai.com /etc/nginx/sites-enabled/qingpaiai.com
sudo nginx -t
sudo systemctl reload nginx
```

确认 `qingpaiai.com` 和 `www.qingpaiai.com` 都已解析至服务器公网 IP 后，再申请 HTTPS 证书：

```bash
sudo certbot --nginx -d qingpaiai.com -d www.qingpaiai.com
```

该配置不会修改或覆盖现有的 `api.qingpaiai.com` 后端站点。

如果域名尚未完成 ICP 备案，腾讯云可能会将公网访问拦截到备案提示页，导致 HTTP 验证证书申请失败。此时可先通过服务器公网 IP 检查官网内容，备案通过后再执行证书申请命令。
