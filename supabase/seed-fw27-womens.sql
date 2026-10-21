-- FW27 WOMENS 测试款：GREEN / TAN / CREAM
-- 在 Supabase SQL Editor 执行一次；重复执行不会产生重复数据。

insert into public.products (season_id, category_id, code, name, subtitle, description, sort)
select s.id, c.id, v.code, v.name, v.subtitle, v.descr, v.sort
from (values
  ('W27-01', 'GREEN', '橄榄绿工装', '橄榄绿工装夹克与同色长裤，适合过渡季叠穿。', 10),
  ('W27-02', 'TAN',   '驼色绗缝',   '驼色绗缝外套，轻量保暖，日常通勤。', 20),
  ('W27-03', 'CREAM', '奶油色套装', '奶油色套装，干净利落，适合春夏交替。', 30)
) as v(code, name, subtitle, descr, sort)
join public.seasons s on s.slug = 'fw27'
join public.categories c on c.season_id = s.id and c.slug = 'womens'
where not exists (
  select 1 from public.products p where p.season_id = s.id and p.code = v.code
);

insert into public.product_images (product_id, path, kind, sort, width, height)
select p.id, v.path, v.kind, v.sort, v.w, v.h
from (values
  ('W27-01', 'assets/img/womens-look-green.webp',   'look',   10, 790,  1244),
  ('W27-01', 'assets/img/womens-views-green.webp',  'views',  20, 1376, 768),
  ('W27-01', 'assets/img/womens-fabric-green.webp', 'fabric', 30, 1148, 768),
  ('W27-02', 'assets/img/womens-look-tan.webp',     'look',   10, 746,  1205),
  ('W27-02', 'assets/img/womens-views-tan.webp',    'views',  20, 1376, 768),
  ('W27-02', 'assets/img/womens-fabric-tan.webp',   'fabric', 30, 1068, 768),
  ('W27-03', 'assets/img/womens-views-cream.webp',  'views',  10, 1376, 768),
  ('W27-03', 'assets/img/womens-fabric-cream.webp', 'fabric', 20, 1068, 768)
) as v(code, path, kind, sort, w, h)
join public.products p on p.code = v.code
where not exists (
  select 1 from public.product_images i where i.product_id = p.id and i.path = v.path
);
