function has(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function detectSpecialProgram(record = {}) {
  const text = [
    record.school,
    record.major,
    record.geoEntity,
    record.displayLocation,
    record.locationWarning,
    Array.isArray(record.flags) ? record.flags.join(' ') : '',
    Array.isArray(record.schoolTags) ? record.schoolTags.join(' ') : ''
  ].filter(Boolean).join(' ');

  const types = [];
  const checks = [];
  const riskTags = [];
  let reminder = '';
  let parentNote = '';
  let priority = 0;

  const isCoop = has(text, [/中外合作/, /合作办学/, /中外联合/, /国际合作/, /国际本科/, /中美/, /中英/, /中澳/, /中加/, /中法/, /中德/, /中俄/]);
  const isHighFee = has(text, [/高收费/, /较高收费/, /收费较高/, /学费较高/]);
  const isJoint = has(text, [/联合培养/, /协同培养/, /联合办学/, /联合学士/]);
  const isEnterprise = has(text, [/校企合作/, /产业学院/, /订单班/, /定向培养/, /现代产业学院/]);
  const isCampus = has(text, [/分校/, /校区/, /异地办学/, /威海/, /深圳/, /秦皇岛/, /盘锦/, /沙河/, /保定/]);

  if (isCoop) {
    priority = Math.max(priority, 5);
    types.push('中外合作办学');
    riskTags.push('中外合作', '高收费', '培养模式', '证书口径');
    checks.push(
      '核验中外合作办学收费、培养模式和毕业证/学位证口径',
      '核验外方合作院校、是否必须出国和英语授课比例',
      '核验转专业限制、保研/升学和奖助政策是否有差异'
    );
    reminder = '这是中外合作办学，不能按普通专业简单理解；重点看收费、培养模式、外方资源、证书口径和升学政策。';
    parentNote = '分数位置舒服也要先确认家庭预算和培养模式能否接受。';
  }

  if (isHighFee && !isCoop) {
    priority = Math.max(priority, 4);
    types.push('高收费专业');
    riskTags.push('高收费', '家庭预算');
    checks.push(
      '核验学费、住宿费、奖助政策和四年总成本',
      '核验高收费项目是否影响转专业、升学或培养安排'
    );
    reminder ||= '该专业存在高收费线索，不能只看分数位置，还要先确认家庭预算和培养安排。';
    parentNote ||= '先算清四年成本和家庭承受力，再决定是否保留。';
  }

  if (isJoint) {
    priority = Math.max(priority, 3);
    types.push('联合培养');
    riskTags.push('联合培养', '培养地点');
    checks.push(
      '核验联合培养的培养地点、培养单位和毕业证/学位证口径',
      '核验后续转段、住宿、交通和课程衔接安排'
    );
    reminder ||= '该专业存在联合培养线索，要重点看培养地点、培养单位和证书口径。';
    parentNote ||= '联合培养不能只看学校名，要先确认实际在哪里学、跟谁学。';
  }

  if (isEnterprise) {
    priority = Math.max(priority, 3);
    types.push('校企合作/定向');
    riskTags.push('校企合作', '就业约束');
    checks.push(
      '核验校企合作或定向培养的企业、课程、实习和就业约束',
      '核验是否有额外协议、服务期或违约成本'
    );
    reminder ||= '该专业存在校企合作或定向线索，需看清企业参与深度、实习安排和就业约束。';
    parentNote ||= '校企合作要看企业质量和协议条件，不要只看专业名称。';
  }

  if (isCampus) {
    types.push('分校/校区');
    riskTags.push('校区核验');
    checks.push('核验实际办学地点、校区资源和毕业证/学位证口径');
    reminder ||= '该条存在校区/分校线索，需确认实际办学地点、资源共享和证书口径。';
    parentNote ||= '先确认实际校区和培养资源，再按分数位置判断。';
  }

  const hasSpecial = types.length > 0;
  return {
    hasSpecial,
    priority,
    types: unique(types),
    primaryType: types[0] || '',
    reminder,
    checks: unique(checks).slice(0, 5),
    parentNote,
    riskTags: unique(riskTags).slice(0, 5),
    evidenceText: hasSpecial ? `特殊项目线索：${unique(types).join(' / ')}` : ''
  };
}
