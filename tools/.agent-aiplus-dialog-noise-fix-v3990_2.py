from pathlib import Path

path=Path('functions/_lib/ai/command-interpreter.js')
text=path.read_text()
old="!/(?:候选|能上|能报|预算|就业|读研|考研|平台|层次|机会|取舍|平衡|志愿|方案|分数|位次|城市|老师|家长|孩子|咨询|建议|为什么|比较|对比)/.test(reduced)"
new="!/(?:候选|能上|能报|预算|就业|工作|读研|考研|平台|层次|机会|选择|取舍|平衡|志愿|方案|分数|位次|城市|老师|家长|孩子|咨询|建议|为什么|比较|对比|公办|民办|中外|高收费|本科|学校|专业)/.test(reduced)"
if old not in text:
    raise SystemExit('dialog noise guard anchor missing')
text=text.replace(old,new,1)
# Boundary candidates must also reject ordinary decision-language prefixes, not only final reduced text.
old2="candidate.length>=2&&candidate.length<=10&&!regionOnly.has(candidate)&&!/^(?:我|孩子|家长|学校|专业|分数|位次|去年|往年|历年)/.test(candidate)"
new2="candidate.length>=2&&candidate.length<=10&&!regionOnly.has(candidate)&&!/^(?:我|孩子|家长|学校|专业|分数|位次|去年|往年|历年)/.test(candidate)&&!/(?:公办|民办|中外|高收费|本科|就业|预算|候选|志愿|方案|平台|专业质量|培养)/.test(candidate)"
if old2 not in text:
    raise SystemExit('boundary school alias guard anchor missing')
path.write_text(text.replace(old2,new2,1))
