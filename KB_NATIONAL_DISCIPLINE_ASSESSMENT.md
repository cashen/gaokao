# v3.9.32 全国第四轮学科评估知识库

## 本版目标

把全国第四轮学科评估机器可读数据接入知识库底座，用于全国/省外高校的学科线索补全。

## 数据范围

```text
原始评级行：834
学校-学科记录：5112
唯一学校/单位：462
匹配到当前辽宁专业池学校：404 / 944
新增匹配学校：372
```

## 数据来源

```text
机器可读整理数据：
https://github.com/Johnnydaszhu/2017ChinaUniversityDisciplineAssessment

Raw CSV：
https://raw.githubusercontent.com/Johnnydaszhu/2017ChinaUniversityDisciplineAssessment/master/2017%E6%95%99%E8%82%B2%E9%83%A8%E7%AC%AC%E5%9B%9B%E8%BD%AE%E5%AD%A6%E7%A7%91%E8%AF%84%E4%BC%B0.csv

底层口径：
教育部学位与研究生教育发展中心：全国第四轮学科评估结果
https://www.cdgdc.edu.cn/dslxkpgjggb/
```

## 重要原则

```text
1. 只使用第四轮学科评估。
2. 第五轮学科评估不采用非官方全量汇总。
3. 学科评估是学科层面线索，不等同本科专业强弱。
4. 分校/校区可以继承母体学科评估线索，但必须保留真实地域和办学实体。
5. 当前专业未命中相关学科时，AI诊断必须提示需核验学院实力和就业质量报告。
```

## 新增文件

```text
functions/_lib/kb/national-discipline-assessment.generated.js
```

## 更新文件

```text
functions/_lib/kb/school-kb.generated.js
functions/_lib/kb/kb-retriever.js
```
