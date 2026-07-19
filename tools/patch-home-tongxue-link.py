from pathlib import Path

path = Path('index.html')
original = path.read_text(encoding='utf-8')

air_card = '''            <a href="./Liaoning_Universit_Dorm_AC_Field_Guide.html" class="resource-card life">
              <span class="resource-kicker">生活辅助</span>
              <span class="resource-title">辽宁高校宿舍空调参考</span>
              <span class="resource-desc">按学校整理宿舍空调安装情况和可复核线索。</span>
            </a>'''

tongxue_card = '''
            <a href="./tongxue.html" class="resource-card life">
              <span class="resource-kicker">学校体验</span>
              <span class="resource-title">同学你好</span>
              <span class="resource-desc">输入学校全名、简称或轻微错别字，查看来源 AI 摘要或近期真实评论。</span>
            </a>'''

footer_text = '        孩子先休息好，家长先稳住。先把范围看清，再一项一项核验；任何工具页面都不能直接当成录取结论。'
footer_with_version = footer_text + '\n        <br><span>首页 v1.0.1 · 更新于 2026-07-19</span>'

updated = original
if './tongxue.html' not in updated:
    if updated.count(air_card) != 1:
        raise SystemExit(f'宿舍空调卡片定位异常：{updated.count(air_card)}')
    updated = updated.replace(air_card, air_card + tongxue_card, 1)

if '首页 v1.0.1 · 更新于 2026-07-19' not in updated:
    if updated.count(footer_text) != 1:
        raise SystemExit(f'Footer 定位异常：{updated.count(footer_text)}')
    updated = updated.replace(footer_text, footer_with_version, 1)

assert updated.count('href="./tongxue.html"') == 1
assert updated.count('首页 v1.0.1 · 更新于 2026-07-19') == 1
assert updated.count('Liaoning_Universit_Dorm_AC_Field_Guide.html') == original.count('Liaoning_Universit_Dorm_AC_Field_Guide.html')
assert updated.count('<script') == original.count('<script')
assert updated.count('</script>') == original.count('</script>')
assert updated.count('<style') == original.count('<style')
assert updated.count('</style>') == original.count('</style>')

path.write_text(updated, encoding='utf-8')
print('Homepage patch verified.')
