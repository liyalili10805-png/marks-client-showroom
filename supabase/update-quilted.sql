-- 补齐 QUILTED 的上身图和三视图
-- 在 Supabase SQL Editor 执行一次；重复执行不会重复插入。

update public.product_images i
set sort = 30
from public.products p
where i.product_id = p.id and p.code = 'M27-03' and i.kind = 'fabric';

insert into public.product_images (product_id, path, kind, sort, width, height)
select p.id, v.path, v.kind, v.sort, v.w, v.h
from (values
  ('assets/img/mens-look-quilted.webp',  'look',  10, 773, 1436),
  ('assets/img/mens-views-quilted.webp', 'views', 20, 956, 585)
) as v(path, kind, sort, w, h)
join public.products p on p.code = 'M27-03'
where not exists (
  select 1 from public.product_images i where i.product_id = p.id and i.path = v.path
);
