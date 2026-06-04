export const ADMISSION_CHARTER_CHECK_KB = {
  version: 'v3985-admission-charter-check',
  sourceLevel: 'A',
  sourceName: '阳光高考招生章程 / 学校本科招生网',
  generalCheckItems: ['学费','校区','培养模式','中外合作是否必须出国','外语语种限制','单科成绩要求','体检限制','专业分流规则','转专业政策','毕业证和学位证','高收费/中外/校企/联合培养/定向/预科/专项/试验班/本博'],
  projectTypes: {
    sinoForeign: { label: '中外合作', mustCheck: ['学费','外方院校','是否必须出国','授课语言','毕业证/学位证','转专业政策','校区'] },
    highFee: { label: '高收费', mustCheck: ['学费','是否与普通专业同院系培养','转专业政策','住宿和校区'] },
    targeted: { label: '定向', mustCheck: ['定向地区','服务年限','违约责任','体检/政审/户籍条件'] },
    publicTeacher: { label: '公费师范', mustCheck: ['履约地区','服务年限','违约责任','教师资格与就业安排'] },
    experimentalClass: { label: '试验班', mustCheck: ['专业分流规则','分流时间','可选专业范围','淘汰/退出机制'] }
  },
  aiBoundary: [
    '可以提示需要核验哪些项目，但不能代替招生章程作结论。',
    '中外、高收费、定向、专项、预科、试验班、本博等条目必须提示人工复核。'
  ]
};
