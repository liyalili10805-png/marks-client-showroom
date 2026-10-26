# 生图请求 · Collection 首页（Everyday）

把本文件整体发给 Codex（图像生成）。生成后按 target 路径返回图片；尺寸不够时等比例放大，不要改构图。

统一要求：写实时装摄影质感；无文字、无 logo、无水印；人物为成年人；背景干净；颜色为低饱和暖中性色。

---

IMAGE_REQUEST
slot: Collection 首页 / Everyday 主视觉（hero）
target: assets/demo/gen/everyday-hero.webp
size: 2400×1200（2:1，横图）
purpose: Collection 首页右侧主图，表达 Everyday 日常通勤穿搭
style: 编辑感时装摄影；成年女性，30 岁左右；橄榄绿工装外套 + 奶油色针织衫 + 深色直筒牛仔裤；双手插袋，三分之四身位；背景为浅灰混凝土建筑、竖窗、秋季枯草；柔和阴天自然光；低饱和暖中性色；浅景深；左侧留白；无文字、无 logo、无水印
prompt: Editorial fashion photograph of an adult woman in her early thirties wearing an olive cotton utility overshirt over a cream ribbed knit sweater and dark straight-leg jeans, hands relaxed in pockets, three-quarter body, standing beside a modern light-grey concrete building with tall windows and autumn grasses, soft overcast daylight, muted warm neutral palette, shallow depth of field, 35mm lens, premium clothing catalogue look, generous negative space on the left, no text, no logos, no watermark
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（右上 hero 区域）
END_IMAGE_REQUEST

IMAGE_REQUEST
slot: Collection 首页 / This week's selections / 第 1 张（上衣）
target: assets/demo/gen/everyday-weekly-knit.webp
size: 1200×1200（1:1）
purpose: 本周推荐卡片的平铺商品图
style: 高端电商平铺图；奶油色肌理针织圆领毛衣；自然摊平，袖子舒展；纯白无缝背景；柔和均匀棚光；轻微投影；居中；突出纱线肌理；无模特、无文字、无 logo
prompt: Premium e-commerce flat lay of a cream textured knit crewneck sweater, neatly laid flat with sleeves relaxed, pure white seamless background, soft even studio lighting, subtle natural shadow, centered composition, high detail on yarn texture, no model, no text, no logo
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（左起第一张卡片）
END_IMAGE_REQUEST

IMAGE_REQUEST
slot: Collection 首页 / This week's selections / 第 2 张（外套）
target: assets/demo/gen/everyday-weekly-overshirt.webp
size: 1200×1200（1:1）
purpose: 本周推荐卡片的平铺商品图
style: 高端电商平铺图；橄榄绿棉质工装衬衫外套；胸前双翻盖口袋、纽扣门襟；自然摊平；纯白无缝背景；柔和棚光；轻微投影；居中；突出面料与缝线；无模特、无文字、无 logo
prompt: Premium e-commerce flat lay of an olive cotton utility overshirt with two chest flap pockets and a button front, neatly laid flat, pure white seamless background, soft even studio lighting, subtle natural shadow, centered composition, high detail on twill fabric and stitching, no model, no text, no logo
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（左起第二张卡片）
END_IMAGE_REQUEST

IMAGE_REQUEST
slot: Collection 首页 / This week's selections / 第 3 张（裤子）
target: assets/demo/gen/everyday-weekly-jeans.webp
size: 1200×1200（1:1）
purpose: 本周推荐卡片的平铺商品图
style: 高端电商平铺图；深靛蓝直筒牛仔裤；完整裤长、自然摊平；纯白无缝背景；柔和棚光；轻微投影；居中；突出丹宁纹理与洗水；无模特、无文字、无 logo
prompt: Premium e-commerce flat lay of dark indigo straight-leg jeans, full length laid flat, pure white seamless background, soft even studio lighting, subtle natural shadow, centered composition, high detail on denim texture and wash, no model, no text, no logo
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（左起第三张卡片）
END_IMAGE_REQUEST

IMAGE_REQUEST
slot: Collection 首页 / Browse by occasion / Everyday
target: assets/demo/gen/occasion-everyday.webp
size: 2400×920（约 2.6:1，横向长条）
purpose: 场景入口图，网页上叠加 Everyday 文字
style: 宽幅纪实时装感；女性穿橄榄绿工装外套走在城市人行道；秋季；浅景深；左侧留出可放文字的干净区域；画面内不要任何文字、logo、水印
prompt: Wide cinematic street photograph of a woman wearing an olive utility jacket walking along a city sidewalk in autumn, shallow depth of field, muted warm tones, clean uncluttered area on the left for a text overlay, no text, no logos, no watermark
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（Everyday 图条）
END_IMAGE_REQUEST

IMAGE_REQUEST
slot: Collection 首页 / Browse by occasion / Weekend
target: assets/demo/gen/occasion-weekend.webp
size: 2400×920（约 2.6:1，横向长条）
purpose: 场景入口图，网页上叠加 Weekend 文字
style: 宽幅自然风景；秋季湖泊、环湖森林、远处山脉；平静水面；暖色侧光；左侧留白；不要人物、不要文字
prompt: Wide landscape photograph of a calm autumn lake surrounded by forest and distant mountains, still water reflections, warm side light, clean space on the left for a text overlay, no people, no text, no logos
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（Weekend 图条）
END_IMAGE_REQUEST

IMAGE_REQUEST
slot: Collection 首页 / Browse by occasion / Outdoor
target: assets/demo/gen/occasion-outdoor.webp
size: 2400×920（约 2.6:1，横向长条）
purpose: 场景入口图，网页上叠加 Outdoor 文字
style: 宽幅自然风景；松林与雪山；清透日光；冷绿与灰蓝色调；左侧留白；不要人物、不要文字
prompt: Wide landscape photograph of a pine forest with snow-capped mountains in the background, crisp daylight, cool green and blue-grey palette, clean space on the left for a text overlay, no people, no text, no logos
reference: _impl_pkg/Marks_DeepSeek_Handoff_20261026/reference/01_collection_home.png（Outdoor 图条）
END_IMAGE_REQUEST
