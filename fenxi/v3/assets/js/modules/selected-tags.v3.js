(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]; });
  }
  window.LN_V3_SELECTED_TAGS = {
    render: function (items, options) {
      var onRemove = options && options.onRemove ? ' data-removable="1"' : '';
      if (!items || !items.length) return '<div class="selected-tags"><span class="selected-tag">尚未选择</span></div>';
      return '<div class="selected-tags">' + items.map(function (item) {
        return '<span class="selected-tag">' + escapeHtml(item.name || item) + (onRemove ? '<button type="button" aria-label="删除 ' + escapeHtml(item.name || item) + '" data-remove-tag="' + escapeHtml(item.id || item.name || item) + '">×</button>' : '') + '</span>';
      }).join('') + '</div>';
    }
  };
})();
