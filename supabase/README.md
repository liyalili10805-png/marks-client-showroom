# Supabase 初始化（一次就好）

## 1. 建项目

1. 打开 <https://supabase.com>，用 GitHub 登录。
2. New project：名字填 `soho-marks`，Region 选 **Southeast Asia (Singapore)** 或 **Northeast Asia (Tokyo)**，数据库密码自己存好。
3. 等 1–2 分钟项目就绪。

## 2. 建表

1. 左侧 **SQL Editor** → New query。
2. 把 `supabase/schema.sql` 全文粘进去，点 **Run**。
3. 看到 `Success. No rows returned` 就对了。

## 3. 建管理员账号

1. 左侧 **Authentication** → **Users** → **Add user** → Create new user。
2. 填邮箱和密码，勾选 **Auto Confirm User**。
3. 复制这个用户的 **UID**。
4. 回 SQL Editor 执行（把 UUID 换成你的）：

```sql
insert into public.admins (user_id) values ('你的-用户-UID');
```

只有 `admins` 表里的账号能上传内容和管理评论。

## 4. 把两个值发给我

左侧 **Project Settings** → **API**：

- **Project URL**（形如 `https://xxxx.supabase.co`）
- **anon public** key

这两个本来就是公开的，放前端没问题。

**service_role key 不要发给我、也不要写进任何前端文件**，它等于数据库最高权限。

## 5. 之后我会做

1. 前端改成读 Supabase 数据，FW27 用现在 MENS 的风衣/夹克/绗缝做测试款。
2. 每款加选款、投票、意见。
3. `/admin` 上传后台：登录 → 建季节 → 传图 → 发布。

## 数据表说明

| 表 | 用途 |
| --- | --- |
| `seasons` | 季节，如 FW27 |
| `categories` | 季节下的分类，如 MENS / WOMENS |
| `products` | 款式，名称、货号、描述、排序 |
| `product_images` | 款式图片，`kind` 区分 look / views / fabric |
| `votes` | 投票，同一设备对同一款只能投一次 |
| `comments` | 客人意见，管理员可删 |
| `selections` | 选款记录，同一设备对同一款只记一次 |
| `admins` | 允许登录后台的账号 |

图片放在 Storage 的 `showroom` 桶里，公开可读，只有管理员能传。
