// A small BBCode -> HTML converter. It has no Ember dependency so it can be
// tested directly with Node.
//
// Two modes:
//   'xf'  - for the in-app forum preview. Classes are prefixed `bb-` and inline
//           styles are allowed (colors, fonts), roughly matching how XenForo 2
//           (SpaceBattles / Sufficient Velocity / Questionable Questing) renders.
//   'ao3' - for AO3 chapter HTML. AO3 strips `style` attributes, so everything is
//           expressed with `fm-` classes that the generated work skin defines.
//           Colors and fonts can't survive and are dropped (the text is kept).

var BLOCK_TAGS = {
  quote: true, spoiler: true, center: true, left: true, right: true,
  justify: true, indent: true, list: true, table: true, tr: true, td: true,
  th: true, code: true, php: true, html: true, heading: true, hr: true, media: true
};

var RAW_TAGS = { code: true, php: true, html: true, icode: true, plain: true };

var KNOWN_TAGS = {
  b: true, i: true, u: true, s: true, strike: true, color: true, size: true,
  font: true, url: true, email: true, img: true, center: true, left: true,
  right: true, justify: true, indent: true, quote: true, spoiler: true,
  ispoiler: true, code: true, php: true, html: true, icode: true, plain: true,
  list: true, '*': true, table: true, tr: true, td: true, th: true,
  heading: true, hr: true, user: true, media: true, sub: true, sup: true
};

var VOID_TAGS = { hr: true };

export function escapeHtml(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripQuotes(value) {
  value = (value || '').trim();
  if (value.length > 1 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0]) {
    value = value.substring(1, value.length - 1);
  }
  return value;
}

function safeUrl(url) {
  url = stripQuotes(url).trim();
  if (/^(https?:)?\/\//i.test(url)) {
    return url;
  }
  if (/^www\./i.test(url)) {
    return 'http://' + url;
  }
  return null;
}

function safeColor(color) {
  color = stripQuotes(color).trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) || /^[a-z]{3,20}$/i.test(color) ||
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) {
    return color;
  }
  return null;
}

function safeFont(font) {
  font = stripQuotes(font).trim();
  if (/^[a-z0-9 \-]{1,40}$/i.test(font)) {
    return font;
  }
  return null;
}

// XenForo accepts [SIZE=1]..[SIZE=7] and pixel sizes; map everything to 1-7.
function sizeLevel(value) {
  value = stripQuotes(value).toLowerCase();
  var px = /^(\d+)px$/.exec(value);
  if (px) {
    var n = parseInt(px[1], 10);
    var steps = [0, 10, 12, 15, 18, 22, 26, 32];
    for (var i = 1; i < steps.length; i++) {
      if (n <= steps[i]) { return i; }
    }
    return 7;
  }
  var level = parseInt(value, 10);
  if (isNaN(level)) { return 3; }
  return Math.max(1, Math.min(7, level));
}

// Pulls the name out of XenForo quote options such as
// `"Bagrat, post: 1234, member: 56"` or `Bagrat`.
export function quoteAuthor(option) {
  var value = stripQuotes(option || '');
  value = value.replace(/,\s*(post|member|convMessage|attach)\s*:.*$/i, '');
  return value.trim();
}

// ---------------------------------------------------------------------------
// Parsing

function parseAttrs(text) {
  var attrs = {};
  var re = /([a-z]+)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/gi;
  var m;
  while ((m = re.exec(text || '')) !== null) {
    attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
  }
  return attrs;
}

function tokenize(text) {
  var tokens = [];
  // [tag], [tag=option] or XenForo's attribute form, [IMG width="64px"].
  var re = /\[(\/?)([a-z]+|\*)(?:=([^\]\n]*)|\s+([a-z]+=[^\]\n]*))?\]/gi;
  var last = 0;
  var match;

  while ((match = re.exec(text)) !== null) {
    var name = match[2].toLowerCase();
    if (!KNOWN_TAGS[name]) {
      continue;
    }
    if (match.index > last) {
      tokens.push({ type: 'text', text: text.substring(last, match.index) });
    }

    if (!match[1] && RAW_TAGS[name]) {
      // Raw tags swallow everything up to their closing tag.
      var closeRe = new RegExp('\\[\\/' + name + '\\]', 'i');
      var rest = text.substring(re.lastIndex);
      var close = closeRe.exec(rest);
      if (close) {
        tokens.push({ type: 'raw', name: name, option: match[3], text: rest.substring(0, close.index), source: match[0] });
        re.lastIndex = re.lastIndex + close.index + close[0].length;
        last = re.lastIndex;
        continue;
      }
    }

    tokens.push({
      type: match[1] ? 'close' : 'open',
      name: name,
      option: match[3],
      attrs: parseAttrs(match[4]),
      source: match[0]
    });
    last = re.lastIndex;
  }

  if (last < text.length) {
    tokens.push({ type: 'text', text: text.substring(last) });
  }
  return tokens;
}

function parse(text) {
  var root = { name: 'root', children: [] };
  var stack = [root];
  var tokens = tokenize(text);

  var top = function () { return stack[stack.length - 1]; };
  var inStack = function (name) {
    for (var i = stack.length - 1; i > 0; i--) {
      if (stack[i].name === name) { return i; }
    }
    return -1;
  };

  tokens.forEach(function (token) {
    if (token.type === 'text') {
      top().children.push({ name: '#text', text: token.text });
    } else if (token.type === 'raw') {
      top().children.push({ name: token.name, option: token.option, raw: token.text, children: [] });
    } else if (token.type === 'open') {
      if (token.name === '*') {
        // List items only mean something inside a list.
        var listIndex = inStack('list');
        if (listIndex === -1) {
          top().children.push({ name: '#text', text: token.source });
          return;
        }
        while (stack.length - 1 > listIndex) { stack.pop(); }
        var item = { name: '*', children: [], source: token.source };
        top().children.push(item);
        stack.push(item);
        return;
      }
      var node = { name: token.name, option: token.option, attrs: token.attrs, children: [], source: token.source };
      top().children.push(node);
      if (!VOID_TAGS[token.name]) {
        stack.push(node);
      }
    } else if (token.type === 'close') {
      if (VOID_TAGS[token.name]) {
        return; // [HR][/HR]: the closing tag means nothing.
      }
      var index = inStack(token.name);
      if (index === -1) {
        top().children.push({ name: '#text', text: token.source });
        return;
      }
      while (stack.length > index) {
        var popped = stack.pop();
        popped.closed = popped.name === token.name || popped.name === '*';
      }
    }
  });

  // Anything left open was never closed: turn it back into literal text.
  var unwrapUnclosed = function (node) {
    var out = [];
    node.children.forEach(function (child) {
      if (child.children) {
        child.children = unwrapUnclosed(child);
      }
      if (child.name !== '#text' && child.name !== '*' && !child.raw && child.closed === false && !VOID_TAGS[child.name]) {
        out.push({ name: '#text', text: child.source });
        out.push.apply(out, child.children);
      } else if (child.name !== '#text' && child.name !== '*' && child.closed === undefined && !child.raw && !VOID_TAGS[child.name]) {
        // Opened but the closing tag never arrived.
        out.push({ name: '#text', text: child.source });
        out.push.apply(out, child.children);
      } else {
        out.push(child);
      }
    });
    return out;
  };
  root.children = unwrapUnclosed(root);
  return root;
}

// ---------------------------------------------------------------------------
// Rendering

function isBlock(node) {
  return node.name !== '#text' && BLOCK_TAGS[node.name];
}

// XenForo eats a single newline right after an opening block tag, right before
// a closing block tag and right after a closing block tag. Do the same so the
// preview matches the forum.
function trimBlockNewlines(children) {
  var out = children.map(function (c) { return c.name === '#text' ? { name: '#text', text: c.text } : c; });
  for (var i = 0; i < out.length; i++) {
    var node = out[i];
    if (node.name !== '#text') { continue; }
    if (i > 0 && isBlock(out[i - 1])) {
      node.text = node.text.replace(/^\r?\n/, '');
    }
    if (i < out.length - 1 && isBlock(out[i + 1])) {
      node.text = node.text.replace(/\r?\n$/, '');
    }
  }
  if (out.length && out[0].name === '#text') {
    out[0].text = out[0].text.replace(/^\r?\n/, '');
  }
  if (out.length && out[out.length - 1].name === '#text') {
    out[out.length - 1].text = out[out.length - 1].text.replace(/\r?\n$/, '');
  }
  return out;
}

function textToHtml(text) {
  return escapeHtml(text).replace(/\r?\n/g, '<br />');
}

function plainText(node) {
  if (node.name === '#text') { return node.text; }
  if (node.raw !== undefined) { return node.raw; }
  return (node.children || []).map(plainText).join('');
}

function Renderer(mode, options) {
  this.mode = mode === 'ao3' ? 'ao3' : 'xf';
  this.p = this.mode === 'ao3' ? 'fm-' : 'bb-';
  this.options = options || {};
}

Renderer.prototype.cls = function (name) {
  var p = this.p;
  return name.split(' ').map(function (n) { return p + n; }).join(' ');
};

// Renders a list of nodes. With `paragraphs` on, runs of inline content are
// split on blank lines into <p> elements (used for AO3, where loose text and
// <br /> runs look wrong inside the archive's typography).
Renderer.prototype.children = function (children, paragraphs) {
  var self = this;
  children = trimBlockNewlines(children);

  if (!paragraphs) {
    return children.map(function (child) { return self.node(child); }).join('');
  }

  var out = [];
  var buffer = [];
  var lineBreaks = this.options.lineBreaks;
  var flush = function () {
    var html = buffer.join('');
    buffer = [];
    // `lineBreaks`: one <p> per run, blank lines kept as <br /><br />, the way
    // Classic PHO prints a post.
    if (lineBreaks) {
      if (html.replace(/<br \/>|\s|&nbsp;/g, '') !== '') {
        out.push('<p>' + html + '</p>');
      }
      return;
    }
    html.split(/(?:<br \/>\s*){2,}/).forEach(function (para) {
      para = para.replace(/^(?:<br \/>)+|(?:<br \/>)+$/g, '');
      if (para.replace(/\s|&nbsp;/g, '') !== '') {
        out.push('<p>' + para + '</p>');
      }
    });
  };

  children.forEach(function (child) {
    if (isBlock(child)) {
      flush();
      out.push(self.node(child));
    } else {
      buffer.push(self.node(child));
    }
  });
  flush();
  return out.join('\n');
};

Renderer.prototype.wrapBlock = function (tag, attrs, inner) {
  return '<' + tag + attrs + '>' + inner + '</' + tag + '>';
};

Renderer.prototype.node = function (node) {
  var self = this;
  var ao3 = this.mode === 'ao3';
  var opt = node.option;
  var inner = function (paragraphs) { return self.children(node.children || [], paragraphs); };

  switch (node.name) {
    case '#text':
      return textToHtml(node.text);
    case 'b':
      return '<strong>' + inner() + '</strong>';
    case 'i':
      return '<em>' + inner() + '</em>';
    case 'u':
      return '<u>' + inner() + '</u>';
    case 's':
    case 'strike':
      return '<s>' + inner() + '</s>';
    case 'sub':
      return '<sub>' + inner() + '</sub>';
    case 'sup':
      return '<sup>' + inner() + '</sup>';
    case 'color': {
      var color = safeColor(opt);
      if (!color || ao3) { return inner(); }
      return '<span style="color: ' + escapeHtml(color) + '">' + inner() + '</span>';
    }
    case 'font': {
      var font = safeFont(opt);
      if (!font || ao3) { return inner(); }
      return '<span style="font-family: \'' + escapeHtml(font) + '\'">' + inner() + '</span>';
    }
    case 'size':
      return '<span class="' + this.cls('size-' + sizeLevel(opt)) + '">' + inner() + '</span>';
    case 'url':
    case 'email': {
      var target = opt !== undefined ? opt : plainText(node);
      var href = node.name === 'email' ? ('mailto:' + stripQuotes(target).trim()) : safeUrl(target);
      if (!href || (node.name === 'email' && !/^mailto:[^\s@]+@[^\s@]+$/.test(href))) {
        return inner();
      }
      return '<a href="' + escapeHtml(href) + '">' + inner() + '</a>';
    }
    case 'img': {
      var src = safeUrl(plainText(node));
      if (!src) { return textToHtml(plainText(node)); }
      var width = /^(\d{1,4})(px)?$/i.exec(String((node.attrs || {}).width || '').trim());
      var size = width && !ao3 ? ' style="width: ' + width[1] + 'px"' : '';
      return '<img class="' + this.cls('img') + '" src="' + escapeHtml(src) + '" alt=""' + size + ' />';
    }
    case 'media': {
      var id = plainText(node).trim();
      var site = stripQuotes(opt || '').toLowerCase();
      var link = site === 'youtube' ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) : null;
      var label = '▶ ' + (site ? site : 'media') + ': ' + escapeHtml(id);
      return '<div class="' + this.cls('media') + '">' + (link ? '<a href="' + escapeHtml(link) + '">' + label + '</a>' : label) + '</div>';
    }
    case 'center':
    case 'left':
    case 'right':
    case 'justify': {
      var align = node.name === 'justify' ? '' : ' align="' + node.name + '"';
      return this.wrapBlock('div', ' class="' + this.cls('align-' + node.name) + '"' + align, inner(ao3));
    }
    case 'indent': {
      var level = Math.max(1, Math.min(3, parseInt(stripQuotes(opt || '1'), 10) || 1));
      return this.wrapBlock('div', ' class="' + this.cls('indent ' + 'indent-' + level) + '"', inner(ao3));
    }
    case 'quote': {
      var author = quoteAuthor(opt);
      // AO3 wraps text that sits straight in a <div> in a new <p>, so on AO3 the
      // one-line headers are paragraphs to begin with.
      var headTag = ao3 ? 'p' : 'div';
      var head = author ? '<' + headTag + ' class="' + this.cls('quote-head') + '">' + escapeHtml(author) + ' said:</' + headTag + '>' : '';
      return '<blockquote class="' + this.cls('quote') + '">' + head +
        '<div class="' + this.cls('quote-body') + '">' + inner(ao3) + '</div></blockquote>';
    }
    case 'spoiler': {
      var title = stripQuotes(opt || '');
      var label2 = 'Spoiler' + (title ? ': ' + escapeHtml(title) : '');
      if (ao3) {
        return '<div class="fm-spoiler"><p class="fm-spoiler-head">' + label2 + '</p>' +
          '<div class="fm-spoiler-body">' + inner(true) + '</div></div>';
      }
      return '<details class="bb-spoiler"><summary class="bb-spoiler-head">' + label2 + '</summary>' +
        '<div class="bb-spoiler-body">' + inner() + '</div></details>';
    }
    case 'ispoiler':
      return '<span class="' + this.cls('ispoiler') + '">' + inner() + '</span>';
    case 'code':
    case 'php':
    case 'html': {
      var codeText = node.raw !== undefined ? node.raw : plainText(node);
      codeText = codeText.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      var codeHeadTag = ao3 ? 'p' : 'div';
      var codeHead = '<' + codeHeadTag + ' class="' + this.cls('code-head') + '">' + (node.name === 'code' ? 'Code' : node.name.toUpperCase()) + ':</' + codeHeadTag + '>';
      return '<div class="' + this.cls('code') + '">' + codeHead + '<pre>' + escapeHtml(codeText) + '</pre></div>';
    }
    case 'icode':
      return '<code class="' + this.cls('icode') + '">' + escapeHtml(node.raw !== undefined ? node.raw : plainText(node)) + '</code>';
    case 'plain':
      return textToHtml(node.raw !== undefined ? node.raw : plainText(node));
    case 'list': {
      var ordered = opt !== undefined && /^\s*["']?[1aAiI]/.test(opt);
      var items = (node.children || []).filter(function (c) { return c.name === '*'; });
      var tag = ordered ? 'ol' : 'ul';
      return '<' + tag + ' class="' + this.cls('list') + '">' + items.map(function (item) {
        return '<li>' + self.children(item.children).replace(/(<br \/>)+$/, '') + '</li>';
      }).join('') + '</' + tag + '>';
    }
    case '*':
      return inner();
    case 'table':
    case 'tr': {
      // Only rows/cells mean anything here; whitespace between them is ignored.
      var wanted = node.name === 'table' ? 'tr' : null;
      var kids = (node.children || []).filter(function (c) {
        if (c.name === '#text') { return c.text.trim() !== ''; }
        return wanted ? c.name === wanted : (c.name === 'td' || c.name === 'th');
      });
      var rendered = kids.map(function (c) { return c.name === '#text' ? '' : self.node(c); }).join('');
      if (node.name === 'table') {
        return '<table class="' + this.cls('table') + '"><tbody>' + rendered + '</tbody></table>';
      }
      return '<tr>' + rendered + '</tr>';
    }
    case 'td':
    case 'th':
      return '<' + node.name + '>' + inner() + '</' + node.name + '>';
    case 'heading': {
      var hl = Math.max(1, Math.min(3, parseInt(stripQuotes(opt || '1'), 10) || 1));
      var htag = 'h' + (hl + 2);
      return '<' + htag + ' class="' + this.cls('heading heading-' + hl) + '">' + inner() + '</' + htag + '>';
    }
    case 'hr':
      return '<hr class="' + this.cls('hr') + '" />';
    case 'user':
      return '<strong class="' + this.cls('mention') + '">' + inner() + '</strong>';
    default:
      return inner();
  }
};

export function bbcodeToHtml(text, mode, options) {
  if (text === null || text === undefined || text === '') {
    return '';
  }
  var renderer = new Renderer(mode, options);
  return renderer.children(parse(String(text)).children, mode === 'ao3');
}

export default bbcodeToHtml;
