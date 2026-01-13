# additional-suffix-plugin (ASP)

为 flyMD 提供「可扩展文件后缀机制」的示例插件（带设置界面）。

## 功能

- 默认声明额外后缀：`.zhixu`
- 文件树展示：显示 `.zhixu` 文件（图标为普通文件）
- 打开策略：将 `.zhixu` 打开转发给插件 API `zhixu-draw`（即 `zhixu-draw-plugin` 提供的绘图编辑器）

## 怎么添加更多后缀？

1. 在 flyMD → 插件 → 已安装扩展列表里找到 `additional-suffix-plugin`
2. 确保该插件已启用
3. 点击右侧的“设置”按钮，使用可视化界面添加规则并保存

可视化规则字段含义：

- `后缀`：多个用逗号分隔（不需要写点号），例如 `png, jpg, jpeg`
- `显示名`：打开文件对话框中的过滤名称（可选）
- `文件树显示`：是否在文件树中显示该后缀文件
- `图标`：`file` 或 `pdf`（仅影响文件树图标样式）
- `打开模式`：

  - `markdown`：交给 flyMD 内置 Markdown 编辑器
  - `plugin`：转发给指定插件 API（`pluginId` 对应 `context.registerAPI(pluginId, api)` 注册的命名空间）

## 安装（本地）

在 flyMD → 插件 → 从本地安装，选择插件目录