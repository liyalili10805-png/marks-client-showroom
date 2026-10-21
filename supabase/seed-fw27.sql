-- FW27 测试款：用现有 MENS 三组图片先跑通流程
-- 在 Supabase SQL Editor 执行一次即可；重复执行不会产生重复数据。

insert into public.products (season_id, category_id, code, name, subtitle, description, sort)
select s.id, c.id, v.code, v.name, v.subtitle, v.descr, v.sort
from (values
  ('M27-01', 'COAT',    '棉质风衣', '米色棉质风衣，宽松落肩，适合通勤与日常叠穿。', 10),
  ('M27-02', 'JACKET',  '绿色夹克', '橄榄绿轻量夹克，立领、拉链门襟，适合过渡季。', 20),
  ('M27-03', 'QUILTED', '黑色绗缝', '黑色绗缝面料，轻量保暖，适合秋冬内搭与外套。', 30)
) as v(code, name, subtitle, descr, sort)
join public.seasons s on s.slug = 'fw27'
join public.categories c on c.season_id = s.id and c.slug = 'mens'
where not exists (
  select 1 from public.products p where p.season_id = s.id and p.code = v.code
);

insert into public.product_images (product_id, path, kind, sort, width, height)
select p.id, v.path, v.kind, v.sort, v.w, v.h
from (values
  ('M27-01', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-look-coat.webp',    'look',   10, 682,  1264),
  ('M27-01', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-views-coat.webp',   'views',  20, 1466, 1253),
  ('M27-01', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-fabric-coat.webp',  'fabric', 30, 848,  1028),
  ('M27-02', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-look-jacket.webp',  'look',   10, 518,  990),
  ('M27-02', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-views-jacket.webp', 'views',  20, 1189, 755),
  ('M27-02', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-fabric-jacket.webp','fabric', 30, 848,  1028),
  ('M27-03', 'https://liyalili10805-png.github.io/marks-client-showroom/assets/img/mens-fabric-quilted.webp','fabric', 10, 848,  1028)
) as v(code, path, kind, sort, w, h)
join public.products p on p.code = v.code
where not exists (
  select 1 from public.product_images i where i.product_id = p.id and i.path = v.path
);
