from pathlib import Path

p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()
old="if(reduced.length>=2&&reduced.length<=12)tokens.push(reduced);return unique(tokens,4);}"
new="const decisionNoise=/(?:省内|省外|全国|地区|范围|辽宁|沈阳|大连|新疆|西藏|公办|民办|中外|高收费|学校|专业|候选|能上|能报|预算|就业|工作|读研|考研|本科|平台|层次|机会|选择|取舍|平衡|志愿|方案|分数|位次|录取|城市|老师|家长|孩子|咨询|建议|怎么|如何|为什么|哪个|比较|对比)/.test(reduced);const directSource=source.replace(/[\\s，,。！？!?；;：:]+/g,'').replace(/^(那|再|还是|然后|顺便|看看|看下|看一下|帮我看|帮我查|我想看|想看|查下|查一下|请看|请查)+/,'').replace(/(呢|吗|呀|啊|吧|怎么样|如何|咋样)+$/g,'');const directLike=directSource.includes(reduced)&&directSource.length<=10;if(reduced.length>=2&&reduced.length<=6&&!decisionNoise&&directLike)tokens.push(reduced);return unique(tokens,4);}"
if old not in s: raise SystemExit('likelySchoolMentionTokens anchor missing')
p.write_text(s.replace(old,new))

p=Path('tools/verify-ai-workspace-v3990_1.mjs')
s=p.read_text()
anchor="const shenyangAviation=await resolveAiSchoolMentions('沈航的电气呢',fakeResolver);assert.deepEqual(shenyangAviation,['沈阳航空航天大学']);\n  const liaoningTech=await resolveAiSchoolMentions('辽科大的电气呢',fakeResolver);assert.deepEqual(liaoningTech,['辽宁科技大学']);"
replace=anchor+"\n  const directAlias=await resolveAiSchoolMentions('那辽科大呢',fakeResolver);assert.deepEqual(directAlias,['辽宁科技大学']);\n  let accidentalResolverCalls=0;const guardResolver={resolve(){accidentalResolverCalls++;return{status:'not_found',candidates:[]};}};for(const ordinary of ['440分，辽宁省内先看能上的学校','省内','公办优先','本科就业怎么选','预算可以上浮看看中外'])assert.deepEqual(await resolveAiSchoolMentions(ordinary,guardResolver),[],ordinary);assert.equal(accidentalResolverCalls,0,'ordinary parent decision language must not load school resolver');"
if anchor not in s: raise SystemExit('human journey alias test anchor missing')
p.write_text(s.replace(anchor,replace))
