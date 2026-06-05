export interface UpdateAnnouncementSection {
  heading: string;
  items: string[];
}

export interface UpdateAnnouncement {
  id: string;
  version: string;
  title: string;
  publishedAt: string;
  summary: string;
  sections: UpdateAnnouncementSection[];
}

export const updateAnnouncements: UpdateAnnouncement[] = [
  {
    id: "2026-06-05-collaboration-updates",
    version: "0.1.1",
    title: "协作开发与更新公告",
    publishedAt: "2026-06-05 20:13:38",
    summary: "建立 GitHub 协作开发流程，并在软件内新增更新公告页面。后续每次版本更新都会在这里记录中文说明、更新时间和详细改动。",
    sections: [
      {
        heading: "协作开发",
        items: [
          "整理出干净的 product-shot-studio-dev 开发目录，去掉打包产物和临时文件，保留源码、脚本、素材和配置。",
          "初始化 Git 仓库并推送到 GitHub，方便用户、朋友和 Codex 共同开发、查看改动和合并功能。",
          "补充 .gitignore，避免 node_modules、dist、work、outputs、本地密钥和数据库误提交到远程仓库。"
        ]
      },
      {
        heading: "更新公告",
        items: [
          "新增软件内“更新公告”页面，用户可以直接查看每次更新的发布时间、版本号、更新摘要和详细内容。",
          "新增独立公告数据文件，后续发布新版本时只需要追加一条公告记录，便于持续维护。",
          "公告内容使用中文编写，重点描述用户能感知到的功能变化、修复内容和协作注意事项。"
        ]
      },
      {
        heading: "验证结果",
        items: [
          "当前开发基线已通过 TypeScript 类型检查、单元测试和生产构建。",
          "GitHub 远程 main 分支已同步初始协作基线，朋友可以直接 clone 仓库参与开发。"
        ]
      }
    ]
  },
  {
    id: "2026-06-05-workflow-polish",
    version: "0.1.0",
    title: "专业商拍工作流版本",
    publishedAt: "2026-06-05 10:45:00",
    summary: "完善图片商拍、视频生成、个人中心、积分计费、历史回收站、教程和导出体验，让软件更接近专业桌面工作流工具。",
    sections: [
      {
        heading: "图片商拍",
        items: [
          "支持国内主流图像模型供应商：阿里百炼、火山方舟和腾讯混元，并提供可手动填写的模型 / 接入点 ID。",
          "新增白底主图、生活场景图、质感特写图、营销横图和商品海报等输出套装。",
          "商品海报可以填写功能、成分、效果、卖点和使用场景，生成结果更适合电商详情页和营销展示。"
        ]
      },
      {
        heading: "工作流与界面",
        items: [
          "主界面改为单屏工作区，上传区、参数配置、输出套装和生成结果尽量在一个屏幕内完成查看。",
          "左侧模型面板支持折叠和记忆，重新打开软件后会保留上次选择的供应商和模型。",
          "上传区支持点击插图上传、拖拽上传、批量图片队列、一键清空上传图片。"
        ]
      },
      {
        heading: "历史与个人中心",
        items: [
          "新增个人中心，可查看账户概览、历史记录、图片记录、充值明细和回收站。",
          "历史记录按本地账号隔离，不同账号之间不会共享生成任务和回收站数据。",
          "历史记录支持删除、恢复和彻底删除，降低误删风险。"
        ]
      },
      {
        heading: "导出与预览",
        items: [
          "生成图和原图支持点击放大预览，预览窗口内可以继续缩放、简单编辑、保存原图或保存编辑后的图片。",
          "新增默认导出文件夹设置，并在结果卡片和状态区域提供更快的导出入口。",
          "导出和刷新操作增加进度与状态反馈，避免用户误以为按钮没有响应。"
        ]
      },
      {
        heading: "错误提示",
        items: [
          "将火山方舟模型未开通、size 参数错误、额度不足、推理限制和 Safe Experience Mode 暂停等错误翻译成中文提示。",
          "生成失败时在结果区展示具体失败原因、供应商错误码和是否可重试。",
          "当 API 额度或平台限制可能导致失败时，会提示用户检查余额、免费额度或控制台限制。"
        ]
      },
      {
        heading: "视频生成",
        items: [
          "新增视频生成页面，基于上传产品图生成商品展示视频。",
          "支持选择视频模型、比例、时长、清晰度、水印和音效等参数。",
          "新增视频生成进度、取消、历史记录和导出能力。"
        ]
      }
    ]
  }
];
