# Tech Pack 站内录入 · 功能规划（待设计）

> 状态：**未开发**。页面尚未设计，先记录需求与字段，等 UI 方案确定后再实现。

## 1. 目标

选款完成后，在站内把工艺单需要的 BOM、工艺细节、线迹、尺寸、版型意见补齐；
导出 Excel / PDF 时自动带出，打样阶段一次性交给工厂。

## 2. 入口与页面

- 入口建议：
  - My Selection 每行的 “Edit tech pack / 填写工艺单”
  - 款式详情页底部 “Tech pack” tab
- 页面：`techpack.html?code=AE-014`
- 结构建议：
  1. 顶部：款号、款名、图片、保存状态（Draft / Submitted）
  2. 基本信息
  3. BOM（面料 / 辅料 / 标签 / 包装，可增删行）
  4. 工艺细节（部位 + 工艺说明 + 线迹 + 备注）
  5. 线迹说明（编号 + 中英说明）
  6. 尺寸表（部位 × S/M/L/XL + 公差）
  7. 版型意见（日期 / 轮次 / 意见 / 状态）
  8. 保存、导出、提交审核

## 3. 字段清单

### 3.1 基本信息

| 字段 | 中英 | 来源 |
| --- | --- | --- |
| 品牌 | Brand | 固定 SOHO FASHION |
| 渠道 | Banner | 固定 Mark's |
| 产品描述 | Product Description | 款名，可改 |
| 季节 | Season | AW26 / 后续可配置 |
| 日期 | Date | 自动 |
| 设计编号 | Design # | 自动，可改 |
| 产品编号 | Product # | 款号 |
| 分类 L3/L4/L5/L6 | Category | 性别 / 品类 / 细分 |
| 设计师 | Product Designer | 手填 |
| TD | TD Specialist | 手填 |
| 开发 | Product Developer | 手填 |
| Merch | PRO Merch | 手填 |
| 状态 | Status | Draft / In Review / Approved |

### 3.2 BOM（每行）

部位 Placement、供应商 Supplier、供应商料号 Supplier Ref.、材料编号 Material Ref.、
材料描述 Material Description、状态 Material Status、颜色 Color、单位 UOM、
用量 Consumption、单价 Price、币种 Currency、备注 Comments。

分区：Fabrics / Trims / Labels / Packaging。

### 3.3 工艺细节（每行）

部位 Part（门襟、领口、口袋、袖口、下摆、肩部…）、
工艺说明 Construction、线迹 Stitch、备注 Notes、参考图 Image。

### 3.4 线迹说明

编号 Code（SNLS / LTS 1/8" / LTS 1/4" / LES / CHS / BT / 2NCS…）、
中文说明、English description。

### 3.5 尺寸表

部位（胸围、肩宽、衣长、袖长、腰围、摆围…）× S/M/L/XL，
公差 Tolerance，单位 cm/inch，测量方法 Measuring method。

### 3.6 版型意见

日期 Date、轮次 Round（1st Proto / 2nd Proto / 3rd Fit…）、
意见 Comment、TD、状态 Status（Open / Fixed / Confirmed）、照片 Photos。

## 4. 数据模型（建议）

```json
{
  "code": "AE-014",
  "meta": {
    "designNo": "AE-014",
    "productNo": "AE-014",
    "season": "AW26",
    "designer": "",
    "td": "",
    "developer": "",
    "merch": "",
    "status": "draft",
    "updatedAt": "2026-11-11T00:00:00Z"
  },
  "bom": {
    "fabrics": [{ "placement": "", "supplier": "", "supplierRef": "", "materialRef": "", "description": "", "status": "", "color": "", "uom": "m", "consumption": "", "price": "", "currency": "USD", "comments": "" }],
    "trims": [],
    "labels": [],
    "packaging": []
  },
  "construction": [{ "part": "CF placket / 门襟", "construction": "", "stitch": "", "notes": "" }],
  "stitches": [{ "code": "SNLS", "zh": "单针平车", "en": "Single needle lockstitch" }],
  "measurements": [{ "point": "Chest / 胸围", "S": "", "M": "", "L": "", "XL": "", "tolerance": "±1.0", "unit": "cm" }],
  "fitComments": [{ "date": "", "round": "1st Proto", "comment": "", "status": "open", "photos": [] }]
}
```

## 5. 分阶段

1. **本地版**：localStorage / IndexedDB 保存，单机可用，导出读取。
2. **多人版**：Supabase 表 + Storage（图片/附件），按店铺区分。
3. **流程版**：Draft → Submitted → Approved，历史版本与变更记录。
4. **打样版**：一键导出完整 Excel + PDF，含 BOM、工艺、尺寸、fit 意见、实拍图。

## 6. 当前状态

- 导出 Excel 已包含：基本信息、Fabrics、Trims/Labels/Packaging、Construction、Stitch Legend、Measurements、Fit Comments、实拍图。
- 站内编辑页 **未开发**，等设计稿。
