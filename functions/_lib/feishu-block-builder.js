function normalizeStyle(style = {}) {
  const out = {};
  const allowed = ['bold', 'italic', 'strikethrough', 'underline', 'inline_code', 'text_color', 'background_color', 'link', 'comment_ids'];
  for (const key of allowed) {
    const value = style[key];
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}

export function textRun(content, style = {}) {
  return {
    text_run: {
      content: String(content == null ? '' : content),
      text_element_style: normalizeStyle(style)
    }
  };
}

function normalizeRuns(runs = []) {
  const list = Array.isArray(runs) ? runs : [{ content: String(runs || '') }];
  const elements = list
    .map(run => {
      if (typeof run === 'string') return textRun(run);
      return textRun(run.content, run.style || {});
    })
    .filter(el => el.text_run.content !== '');
  return elements.length ? elements : [textRun('')];
}

function richTextBlock(key, blockType, content, style = {}) {
  return {
    block_type: blockType,
    [key]: {
      elements: [textRun(content, style)]
    }
  };
}

function richRunsBlock(key, blockType, runs = []) {
  return {
    block_type: blockType,
    [key]: {
      elements: normalizeRuns(runs)
    }
  };
}

export function textBlock(content) {
  return richTextBlock('text', 2, content);
}

export function styledTextBlock(content, style = {}) {
  return richTextBlock('text', 2, content, style);
}

export function textRunsBlock(runs = []) {
  return richRunsBlock('text', 2, runs);
}

export function heading1(content, style = {}) {
  return richTextBlock('heading1', 3, content, style);
}

export function heading2(content, style = {}) {
  return richTextBlock('heading2', 4, content, style);
}

export function heading3(content, style = {}) {
  return richTextBlock('heading3', 5, content, style);
}

export function heading2Runs(runs = []) {
  return richRunsBlock('heading2', 4, runs);
}

export function heading3Runs(runs = []) {
  return richRunsBlock('heading3', 5, runs);
}

export function bulletBlock(content, style = {}) {
  return richTextBlock('bullet', 12, content, style);
}

export function bulletRunsBlock(runs = []) {
  return richRunsBlock('bullet', 12, runs);
}

export function orderedBlock(content, style = {}) {
  return richTextBlock('ordered', 13, content, style);
}

export function orderedRunsBlock(runs = []) {
  return richRunsBlock('ordered', 13, runs);
}

export function dividerBlock() {
  return { block_type: 22, divider: {} };
}

export function reportToFallbackBlocks(report) {
  const blocks = [];
  const lines = String(report.markdown || '').split('\n');

  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    if (s === '---') {
      blocks.push(dividerBlock());
      continue;
    }
    if (s.startsWith('### ')) {
      blocks.push(heading3(s.replace(/^###\s+/, '')));
      continue;
    }
    if (s.startsWith('## ')) {
      blocks.push(heading2(s.replace(/^##\s+/, '')));
      continue;
    }
    if (s.startsWith('# ')) {
      blocks.push(heading1(s.replace(/^#\s+/, '')));
      continue;
    }
    if (/^\d+\.\s+/.test(s)) {
      blocks.push(orderedBlock(s.replace(/^\d+\.\s+/, '')));
      continue;
    }
    if (s.startsWith('- ')) {
      blocks.push(bulletBlock(s.replace(/^-\s+/, '')));
      continue;
    }
    blocks.push(textBlock(s));
  }

  return blocks.slice(0, 120);
}
