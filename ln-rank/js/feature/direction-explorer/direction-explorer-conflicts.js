export const DIRECTION_CONFLICT_RULES = [
  {
    id: 'computer_vs_coding_reject', directions: ['computer_data'], rejectTags: ['reject_coding'],
    message: '孩子对电脑 / 数据有线索，但不接受长时间写代码。建议先区分“喜欢用电脑”和“接受编程训练”。',
    action: '先看信息管理、数据应用、数字媒体等方向，再确认是否接受真实编程课程。'
  },
  {
    id: 'electric_vs_math_physics', directions: ['electrical_auto','electronic_comm','machinery_smart'], rejectTags: ['reject_math_physics'],
    message: '孩子对电气、电子或工程设备有线索，但不接受较多数学和物理。',
    action: '先看课程强度和实验/项目训练，再决定是否放大这类方向。'
  },
  {
    id: 'medical_vs_medical_scene', directions: ['medical_pharm','rehab_care'], rejectTags: ['reject_medical_scene'],
    message: '孩子对医学健康有线索，但不接受医院、康复、护理或药品相关场景。',
    action: '医学相关方向不能只看名称，需要先核验体检、实习环境和真实岗位。'
  },
  {
    id: 'rule_text_vs_memory_reject', directions: ['law_public','teacher_edu'], rejectTags: ['reject_memory'],
    message: '家庭或孩子对规则、教育、公共方向有线索，但孩子不接受大量阅读、背记或写材料。',
    action: '稳定诉求不能替代学习方式，先确认课程和考试路径。'
  },
  {
    id: 'design_vs_drawing_reject', directions: ['design_media','civil_project','machinery_smart'], rejectTags: ['reject_drawing'],
    message: '孩子对设计、工程或制造有线索，但不接受画图、制图或建模。',
    action: '先看是否有工程制图、建模、作品训练，再决定是否放进查询。'
  },
  {
    id: 'service_vs_communication_reject', directions: ['teacher_edu','rehab_care','law_public'], rejectTags: ['reject_communication'],
    message: '方向里包含表达、教育、服务或沟通场景，但孩子不接受频繁沟通。',
    action: '先确认岗位场景，不要只按“稳定”理解这些方向。'
  },
  {
    id: 'experiment_vs_lab_reject', directions: ['material_bio_food','medical_pharm'], rejectTags: ['reject_lab'],
    message: '孩子对实验、材料、生物、药学或医技有线索，但不接受实验环境。',
    action: '先看实验课程、实习环境和安全规范，再决定是否继续看。'
  },
  {
    id: 'engineering_vs_site_reject', directions: ['civil_project','machinery_smart','electrical_auto'], rejectTags: ['reject_site'],
    message: '工程、设备或现场类方向与孩子“不接受现场环境”的选择存在冲突。',
    action: '先核验校区、实习、现场工作比例和岗位路径。'
  }
];

export function findDirectionConflicts({ activeDirectionIds = [], tags = [] } = {}) {
  const directionSet = new Set(activeDirectionIds);
  const tagSet = new Set(tags);
  return DIRECTION_CONFLICT_RULES.filter(rule =>
    (rule.directions || []).some(id => directionSet.has(id)) &&
    (rule.rejectTags || []).some(tag => tagSet.has(tag))
  );
}
