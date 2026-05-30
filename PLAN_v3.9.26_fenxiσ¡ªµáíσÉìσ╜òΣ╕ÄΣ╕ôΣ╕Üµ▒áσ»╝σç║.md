# v3.9.26 /fenxi 学校名录与专业池导出

## 目标

从当前部署的 `/fenxi/data` 中抽取：

```text
学校名录
学校-专业汇总
完整专业池
```

用于后续建设：

```text
学校知识库
专业知识库
AI诊断可信上下文
```

## 新增接口

```text
/api/fenxi-catalog
```

支持：

```text
/api/fenxi-catalog
/api/fenxi-catalog?type=schools
/api/fenxi-catalog?type=school-major
/api/fenxi-catalog?type=major-pool
/api/fenxi-catalog?type=schools&format=csv
/api/fenxi-catalog?type=school-major&format=csv
/api/fenxi-catalog?type=major-pool&format=csv
```

## 新增页面

```text
/ln-rank/fenxi-catalog.html
```

用于小白直接点击下载 CSV。

## 注意

当前 ZIP 不内置 `/fenxi/data`。  
导出动作是在 Cloudflare Pages 部署后，由接口读取线上 `/fenxi/data/manifest.json` 和 chunks 完成。
