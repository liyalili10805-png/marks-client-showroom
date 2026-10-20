# SOHO-Marks 推款展厅

SOHO 面向 Marks 门店客户的推款展厅。页面沿用原 Style3D 展厅的版式与内容（TREND / PRODUCTS / MENS / WOMENS / ABOUT US），并在其上加了选款单、意见记录和每周订阅入口。

线上地址：<https://liyalili10805-png.github.io/marks-client-showroom/>

## 本地预览

`dist/` 是纯静态站点，没有构建步骤。启动任意静态服务器即可：

```powershell
python -m http.server 8080 --directory dist
```

然后打开 <http://localhost:8080/>。直接双击 `dist/index.html` 也能看，但 `file://` 下部分浏览器行为与线上不同，联调时建议用本地服务器。

## 目录

```
dist/
  index.html        页面骨架：头部、页脚、选款单、搜索、弹窗
  styles.css        版式与响应式样式
  app.js            路由、内容数据、选款/意见/订阅逻辑
  favicon.svg
  assets/img/*.webp 压缩后的展厅图片（共约 2.9 MB）
```

没有依赖，没有打包工具，改完文件刷新即可。

## 内容从哪来

TREND 的 6 张、MENS / WOMENS 的各组图片、ABOUT 的两张长图，都来自原 Style3D 展厅（`cloud.style3d.com/home/showroom/preview/74797`）的展示素材。原图合计约 69 MB，已统一转成最长边 2400 / 1600 px 的 WebP，画质 82，合计约 2.9 MB，文字与面料细节仍然清晰。

这些图本身是“成品版面”：趋势页里已经排好了标题、标签和 Core Highlights；系列页里已经排好了三视图与面料格。因此页面按原比例整幅展示，不再裁切成小卡片。

## 怎么加“更新”内容

`dist/app.js` 顶部的两个数据表就是全部内容配置。

**加一页趋势**：把图放进 `dist/assets/img/`，在 `trend` 数组里加一项：

```js
{ id: 'trend-denim', no: '07', name: 'DENIM', meta: 'FW26 Denim Trend', file: 'trend-denim.webp' }
```

**加一组款式**：把图放进 `dist/assets/img/`，在 `collections.mens.groups` 或 `collections.womens.groups` 里加一项：

```js
{ id: 'mens-denim', name: 'DENIM', meta: '牛仔夹克 · 三视图 / 面料', images: ['mens-look-denim.webp', 'mens-views-denim.webp', 'mens-fabric-denim.webp'] }
```

第一张图会作为选款单缩略图。图片按数组顺序出现在同一行，点任意一张进入详情，可切换、选款、写意见。

**换系列横幅**：改 `collections.mens.banner` / `lineup` 指向的文件名即可；`banner` 设为 `null` 就不显示。

## 功能与存储

- 选款单、意见、订阅邮箱都存在浏览器 `localStorage`，换设备不同步。
- “导出选款单”会生成一个带缩略图的 HTML 文件，可直接打印或转发。
- 订阅表单是演示流程，只在本机记录邮箱，不发送邮件。
- 搜索覆盖 TREND 与两个系列的全部款式。

上线前如果要多人共享选款和意见，需要接一个后端（比如 Supabase / 飞书多维表格 / 企业微信接口）；订阅要真正发送，需要接邮件服务。这两块目前都刻意保持为本地演示。

## 部署

仓库已带 GitHub Actions 工作流 `.github/workflows/pages.yml`：推送到 `main` 后自动把 `dist/` 发布到 GitHub Pages。

```powershell
git add -A
git commit -m "描述这次改动"
git push origin main
```

部署进度看 <https://github.com/liyalili10805-png/marks-client-showroom/actions>，成功后刷新线上地址即可。

## 本机 git 备注

这台机器上的 Git 走 schannel 时拿不到证书，仓库里已配置 `http.sslBackend=openssl`。如果换机器后 `git fetch` 报 `SEC_E_NO_CREDENTIALS`，在仓库里执行一次：

```powershell
git config http.sslBackend openssl
```
