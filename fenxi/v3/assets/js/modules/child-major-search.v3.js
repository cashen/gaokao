(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]; });
  }
  window.LN_V3_CHILD_SEARCH = {
    renderResults: function (keyword) {
      var results = window.LN_V3_CHILD_GROUPS.search(keyword);
      if (!String(keyword || '').trim()) return '';
      if (!results.length) return '<div class="notice-box">暂时没找到明确方向。可以换个关键词，比如“电气、动物医学、计算机、法学”。</div>';
      return '<div class="child-search-results">' + results.map(function (item) {
        return [
          '<div class="search-hit">',
          '<div><strong>', escapeHtml(item.group.name), '</strong><br><small>', escapeHtml(item.majors.join('、')), '</small></div>',
          '<button type="button" data-search-pick="', escapeHtml(item.group.id), '">选这个方向</button>',
          '</div>'
        ].join('');
      }).join('') + '</div>';
    }
  };
})();
