function textRun(content, style = {}) {
  return {
    text_run: {
      content: String(content || ""),
      text_element_style: style
    }
  };
}

function richTextBlock(key, blockType, content, style = {}) {
  return {
    block_type: blockType,
    [key]: {
      elements: [textRun(content, style)]
    }
  };
}

export function textBlock(content) {
  return richTextBlock("text", 2, content);
}

export function heading1(content) {
  return richTextBlock("heading1", 3, content);
}

export function heading2(content) {
  return richTextBlock("heading2", 4, content);
}

export function heading3(content) {
  return richTextBlock("heading3", 5, content);
}

export function bulletBlock(content) {
  return richTextBlock("bullet", 12, content);
}

export function orderedBlock(content) {
  return richTextBlock("ordered", 13, content);
}

export function dividerBlock() {
  return { block_type: 22, divider: {} };
}

export function reportToFallbackBlocks(report) {
  const blocks = [];
  const lines = String(report.markdown || "").split("\n");

  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    if (s === "---") {
      blocks.push(dividerBlock());
      continue;
    }
    if (s.startsWith("### ")) {
      blocks.push(heading3(s.replace(/^###\s+/, "")));
      continue;
    }
    if (s.startsWith("## ")) {
      blocks.push(heading2(s.replace(/^##\s+/, "")));
      continue;
    }
    if (s.startsWith("# ")) {
      blocks.push(heading1(s.replace(/^#\s+/, "")));
      continue;
    }
    if (/^\d+\.\s+/.test(s)) {
      blocks.push(orderedBlock(s.replace(/^\d+\.\s+/, "")));
      continue;
    }
    if (s.startsWith("- ")) {
      blocks.push(bulletBlock(s.replace(/^-\s+/, "")));
      continue;
    }
    blocks.push(textBlock(s));
  }

  return blocks.slice(0, 120);
}
