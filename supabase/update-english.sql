-- English product copy for the FW27 test styles
-- Run once in Supabase SQL Editor.

update public.products set subtitle = 'Cotton Trench',
  description = 'Beige cotton trench coat with a relaxed shoulder, made for commuting and layering.'
where code = 'M27-01';

update public.products set subtitle = 'Green Field Jacket',
  description = 'Olive lightweight zip jacket with a stand collar, built for transitional weather.'
where code = 'M27-02';

update public.products set subtitle = 'Black Quilted',
  description = 'Black quilted jacket with lightweight warmth, made for autumn and winter layering.'
where code = 'M27-03';

update public.products set subtitle = 'Olive Utility',
  description = 'Olive utility jacket with matching trousers, layered for transitional weather.'
where code = 'W27-01';

update public.products set subtitle = 'Tan Quilted',
  description = 'Tan quilted jacket with lightweight warmth for everyday wear.'
where code = 'W27-02';

update public.products set subtitle = 'Cream Set',
  description = 'Cream set with a clean silhouette, made for the change of season.'
where code = 'W27-03';
