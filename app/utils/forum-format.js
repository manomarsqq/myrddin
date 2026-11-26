// Generates forum-style interlude output from a plain snapshot of a document.
// No Ember dependency, so it can be tested directly with Node.
//
// Snapshot shape:
// {
//   title, forumName, postsPerPage,
//   perspective: user|null,
//   threads: [{ name, location, startPage, endPage, op: post, replies: [post] }]
// }
// user = { id, name, tags: [{ id, name }] }
// post = { user: user|null, date: 'Jan 1, 2011', content: 'raw BBCode' }

export var DEFAULT_FORUM_NAME = 'Parahumans Online';
export var PLACEHOLDER_USER = 'Placeholder_User';

// Colors chosen to stay readable on both dark and light XenForo styles.
export var BB_PALETTE = ['#e0533d', '#e68a1e', '#c9a227', '#4caf50', '#1fa59a',
  '#3a8fd6', '#7a6ff0', '#c55bd1', '#e04f8b', '#8d9aa6'];
var BB_MUTED = '#8c8c8c';

export var THEMES = {
  midnight: {
    label: 'Midnight (dark navy)',
    page: '#161b22', block: '#1d232c', user: '#20272f', header: '#10151c', headerText: '#e8edf3',
    border: '#2f3946', text: '#d6dbe1', muted: '#8a95a3', accent: '#6aa6e8', accentText: '#0d1117',
    notice: '#1f2a38', quote: '#232b36', tab: '#1b2532'
  },
  graphite: {
    label: 'Graphite (dark grey)',
    page: '#1b1b1b', block: '#242424', user: '#2a2a2a', header: '#141414', headerText: '#f0f0f0',
    border: '#3a3a3a', text: '#dddddd', muted: '#929292', accent: '#e0a040', accentText: '#1b1b1b',
    notice: '#2d2a24', quote: '#2c2c2c', tab: '#222222'
  },
  ember: {
    label: 'Ember (dark warm)',
    page: '#1c1814', block: '#25201b', user: '#2a241e', header: '#14110e', headerText: '#f1e7da',
    border: '#3d342b', text: '#e3dace', muted: '#9c8f80', accent: '#de8a3a', accentText: '#1c1814',
    notice: '#30271e', quote: '#2d2620', tab: '#211c17'
  },
  daylight: {
    label: 'Daylight (light blue)',
    page: '#f3f5f8', block: '#ffffff', user: '#f5f8fc', header: '#185886', headerText: '#ffffff',
    border: '#d8dee8', text: '#141414', muted: '#7d8693', accent: '#2577b1', accentText: '#ffffff',
    notice: '#eef4fa', quote: '#f5f7fa', tab: '#2d6a96'
  }
};

export var DEFAULT_THEME = 'midnight';

// ---------------------------------------------------------------------------
// Helpers

export function hashString(str) {
  var h = 0;
  str = String(str || '');
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escapeHtml(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function numToWord(num) {
  num = parseInt(num, 10);
  var a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (isNaN(num) || num < 1 || num > 99) { return String(num); }
  var word = num < 20 ? a[num] : b[Math.floor(num / 10)] + (num % 10 ? '-' + a[num % 10] : '');
  return word.charAt(0).toUpperCase() + word.substring(1);
}

function userName(user) {
  return user && user.name ? user.name : PLACEHOLDER_USER;
}

function sameUser(a, b) {
  if (!a || !b) { return false; }
  if (a.id !== undefined && b.id !== undefined) { return a.id === b.id; }
  return a.name === b.name;
}

function initial(name) {
  var match = /[A-Za-z0-9]/.exec(name || '');
  return match ? match[0].toUpperCase() : '?';
}

export function avatarIndex(name) {
  return hashString(name) % BB_PALETTE.length;
}

// Some PHO tags deserve a special banner color, like XenForo staff banners.
export function bannerKind(tagName) {
  var name = String(tagName || '');
  if (/banned/i.test(name)) { return 'banned'; }
  if (/moderator|admin/i.test(name)) { return 'mod'; }
  if (/verified/i.test(name)) { return 'verified'; }
  return null;
}

function bannerColor(tagName) {
  var kind = bannerKind(tagName);
  if (kind === 'banned') { return '#8a8a8a'; }
  if (kind === 'mod') { return '#d64545'; }
  if (kind === 'verified') { return '#3a8fd6'; }
  return BB_PALETTE[hashString(tagName) % BB_PALETTE.length];
}

function locationParts(location) {
  return String(location || '').split('►').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
}

// ---------------------------------------------------------------------------
// Paging. Mirrors the rules in the thread-page-header/footer components: when
// the thread starts on page 1 the OP takes the first slot of that page.

export function threadLayout(thread, postsPerPage) {
  var ppp = Math.max(1, parseInt(postsPerPage, 10) || 10);
  var startPage = Math.max(1, parseInt(thread.startPage, 10) || 1);
  var offset = startPage === 1 ? 1 : 0;
  var replies = thread.replies || [];

  var lastPage = replies.length ?
    Math.floor((replies.length - 1 + offset) / ppp + startPage) : startPage;
  var endPage = Math.max(parseInt(thread.endPage, 10) || 1, lastPage, startPage);

  var pages = [];
  var current = null;
  replies.forEach(function (post, index) {
    var page = Math.floor((index + offset) / ppp + startPage);
    if (!current || current.page !== page) {
      current = { page: page, posts: [] };
      pages.push(current);
    }
    current.posts.push({ post: post, number: (startPage - 1) * ppp + index + 1 + offset });
  });

  return { startPage: startPage, endPage: endPage, pages: pages, opOnFirstPage: startPage === 1 };
}

// XenForo-style page list: 1 … 4 5 [6] 7 8 … 20
export function pageList(current, total) {
  var pages = [];
  var addRange = function (from, to) {
    for (var i = from; i <= to; i++) { pages.push(i); }
  };
  if (total <= 9) {
    addRange(1, total);
    return pages;
  }
  var from = Math.max(2, current - 2);
  var to = Math.min(total - 1, current + 2);
  pages.push(1);
  if (from > 2) { pages.push('…'); }
  addRange(from, to);
  if (to < total - 1) { pages.push('…'); }
  pages.push(total);
  return pages;
}

var VIEWING_LINES = [
  'Threads you have replied to',
  'AND Threads that have new replies',
  'OR private message conversations with new replies',
  'Thread OP is displayed.',
  null, // posts per page, filled in
  'Last ten messages in private message history.',
  'Threads and private messages are ordered chronologically.'
];

function viewingLines(snapshot) {
  return VIEWING_LINES.map(function (line) {
    return line === null ? numToWord(snapshot.postsPerPage) + ' posts per page' : line;
  });
}

// ---------------------------------------------------------------------------
// Forum BBCode (SpaceBattles / Sufficient Velocity / Questionable Questing).
// Uses only BBCode that ships with XenForo 2.1+: TABLE, SIZE, COLOR, ICODE,
// SPOILER, CENTER, RIGHT.

function bbMuted(text, size) {
  return '[SIZE=' + (size || 2) + '][COLOR=' + BB_MUTED + ']' + text + '[/COLOR][/SIZE]';
}

function bbPageNav(page, total) {
  var parts = [];
  if (page > 1) { parts.push('[ICODE]‹ Prev[/ICODE]'); }
  pageList(page, total).forEach(function (p) {
    if (p === '…') {
      parts.push('…');
    } else if (p === page) {
      parts.push('[B][COLOR=' + BB_PALETTE[5] + ']' + p + '[/COLOR][/B]');
    } else {
      parts.push('[ICODE]' + p + '[/ICODE]');
    }
  });
  if (page < total) { parts.push('[ICODE]Next ›[/ICODE]'); }
  return '[RIGHT][SIZE=2][COLOR=' + BB_MUTED + ']Page ' + page + ' of ' + total + '[/COLOR]   ' + parts.join(' ') + '[/SIZE][/RIGHT]';
}

function bbTags(user, op, separator) {
  var lines = [];
  if (op) {
    lines.push('[B]Original Poster[/B]');
  }
  ((user && user.tags) || []).forEach(function (tag) {
    lines.push('[COLOR=' + bannerColor(tag.name) + ']' + tag.name + '[/COLOR]');
  });
  return lines.join(separator);
}

// The rows for one post. Posts on the same page share one [TABLE] so they all
// line up at the same width, like a real thread.
function bbPostRows(entry, thread, layout) {
  var post = entry.post;
  var name = userName(post.user);
  var color = BB_PALETTE[avatarIndex(name)];
  var isOp = sameUser(post.user, thread.op && thread.op.user);
  var meta = bbMuted((post.date || '') + '  ·  #' + entry.number);
  var content = String(post.content || '').replace(/\s+$/, '');
  var tags = bbTags(post.user, isOp, layout === 'stacked' ? '  ·  ' : '\n');
  var out = [];

  if (layout === 'stacked') {
    out.push('[TR]');
    out.push('[TH][COLOR=' + color + ']■[/COLOR] [COLOR=' + color + ']' + name + '[/COLOR]' +
      (tags ? '  [SIZE=2]' + tags + '[/SIZE]' : '') + '[/TH]');
    out.push('[/TR]');
    out.push('[TR]');
    out.push('[TD]' + meta + '\n\n' + content + '[/TD]');
    out.push('[/TR]');
  } else {
    out.push('[TR]');
    out.push('[TD][CENTER][SIZE=7][COLOR=' + color + '][B]' + initial(name) + '[/B][/COLOR][/SIZE]\n' +
      '[B][COLOR=' + color + ']' + name + '[/COLOR][/B]' +
      (tags ? '\n[SIZE=1]' + tags + '[/SIZE]' : '') + '[/CENTER][/TD]');
    out.push('[TD]' + meta + '\n\n' + content + '[/TD]');
    out.push('[/TR]');
  }
  return out;
}

function bbPostTable(entries, thread, layout) {
  var rows = [];
  entries.forEach(function (entry) {
    rows.push.apply(rows, bbPostRows(entry, thread, layout));
  });
  return ['[TABLE]'].concat(rows, ['[/TABLE]']).join('\n');
}

export function forumBBCode(snapshot, options) {
  options = options || {};
  var layout = options.layout === 'stacked' ? 'stacked' : 'sidebar';
  var forumName = snapshot.forumName || DEFAULT_FORUM_NAME;
  var out = [];

  out.push('[TABLE]');
  out.push('[TR]');
  out.push('[TH][SIZE=5]' + forumName + '[/SIZE][/TH]');
  out.push('[/TR]');
  out.push('[TR]');
  out.push('[TD][B]Welcome to the ' + forumName + ' message boards.[/B]\n' +
    'You are currently logged in, [U]' + userName(snapshot.perspective) + '[/U]\n' +
    '[SPOILER="You are viewing"]\n' +
    viewingLines(snapshot).map(function (l) { return '• ' + l; }).join('\n') +
    '\n[/SPOILER][/TD]');
  out.push('[/TR]');
  out.push('[/TABLE]');

  (snapshot.threads || []).forEach(function (thread) {
    var info = threadLayout(thread, snapshot.postsPerPage);
    var parts = locationParts(thread.location);
    var opName = userName(thread.op && thread.op.user);
    var opEntry = { post: thread.op || {}, number: 1 };

    out.push('');
    out.push(bbMuted('Forums ► Boards' + (parts.length ? ' ► ' + parts.join(' ► ') : '')));
    out.push('[SIZE=5][B]' + (thread.name || '') + '[/B][/SIZE]');
    out.push(bbMuted('Discussion' + (parts.length ? " in '" + parts[parts.length - 1] + "'" : '') +
      ' started by ' + opName + ', ' + ((thread.op && thread.op.date) || '')));

    if (info.opOnFirstPage) {
      // The OP is the first post of page 1.
      out.push(bbPageNav(1, info.endPage));
      var firstPage = info.pages.length && info.pages[0].page === 1 ? info.pages[0].posts : [];
      out.push(bbPostTable([opEntry].concat(firstPage), thread, layout));
    } else {
      out.push(bbPostTable([opEntry], thread, layout));
    }

    info.pages.forEach(function (page, i) {
      if (info.opOnFirstPage && i === 0) { return; }
      out.push(bbPageNav(page.page, info.endPage));
      out.push(bbPostTable(page.posts, thread, layout));
    });

    var lastPage = info.pages.length ? info.pages[info.pages.length - 1].page : info.startPage;
    out.push(bbPageNav(lastPage, info.endPage));
  });

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// AO3 chapter HTML + work skin.
//
// AO3 rules this respects: no `style` attributes (all looks come from `fm-`
// classes in the work skin), no media queries (the layout wraps with flexbox
// instead, which AO3 has allowed since 2024), each block element on its own
// line and no newlines between inline elements so AO3's paragraph pass
// doesn't add stray <br /> tags. With "Hide Creator's Style" on, the markup
// still reads as a plain transcript.

function htmlPageNav(page, total) {
  var parts = ['<span class="fm-pagelabel">Page ' + page + ' of ' + total + '</span>'];
  if (page > 1) { parts.push('<span class="fm-pg">‹ Prev</span>'); }
  pageList(page, total).forEach(function (p) {
    if (p === '…') {
      parts.push('<span class="fm-pg-gap">…</span>');
    } else {
      parts.push('<span class="fm-pg' + (p === page ? ' fm-pg-on' : '') + '">' + p + '</span>');
    }
  });
  if (page < total) { parts.push('<span class="fm-pg">Next ›</span>'); }
  return '<div class="fm-pagenav">' + parts.join(' ') + '</div>';
}

function htmlPost(entry, thread, bbToHtml) {
  var post = entry.post;
  var name = userName(post.user);
  var isOp = sameUser(post.user, thread.op && thread.op.user);
  var lines = [];
  var banners = [];

  if (isOp) {
    banners.push('<div class="fm-banner fm-bn-op">Original Poster</div>');
  }
  ((post.user && post.user.tags) || []).forEach(function (tag) {
    var kind = bannerKind(tag.name);
    var cls = kind ? 'fm-bn-' + kind : 'fm-bn' + (hashString(tag.name) % BB_PALETTE.length);
    banners.push('<div class="fm-banner ' + cls + '">' + escapeHtml(tag.name) + '</div>');
  });

  var body = bbToHtml ? bbToHtml(post.content || '', 'ao3') : escapeHtml(post.content || '');
  if (!body) {
    body = '<p>&nbsp;</p>';
  }

  lines.push('<div class="fm-post">');
  lines.push('<div class="fm-user">');
  lines.push('<div class="fm-avatar fm-av' + avatarIndex(name) + '">' + escapeHtml(initial(name)) + '</div>');
  lines.push('<div class="fm-ident">');
  lines.push('<div class="fm-name">' + escapeHtml(name) + '</div>');
  lines.push.apply(lines, banners);
  lines.push('</div>');
  lines.push('</div>');
  lines.push('<div class="fm-main">');
  lines.push('<div class="fm-attr"><span class="fm-date">' + escapeHtml(post.date || '') + '</span> <span class="fm-num">#' + entry.number + '</span></div>');
  lines.push('<div class="fm-body">');
  lines.push(body);
  lines.push('</div>');
  lines.push('<div class="fm-actions"><span>Report</span> <span>Like</span> <span>Quote</span> <span>Reply</span></div>');
  lines.push('</div>');
  lines.push('</div>');
  return lines.join('\n');
}

export function ao3Html(snapshot, options) {
  options = options || {};
  var bbToHtml = options.bbToHtml;
  var forumName = snapshot.forumName || DEFAULT_FORUM_NAME;
  var out = [];

  out.push('<div class="fm-forum">');
  out.push('<div class="fm-header">');
  out.push('<div class="fm-logo">' + escapeHtml(forumName) + '</div>');
  out.push('<div class="fm-navrow"><span class="fm-tab fm-tab-on">Forums</span> <span class="fm-tab">What\'s new</span> <span class="fm-tab">Members</span> <span class="fm-tab fm-tab-user">' + escapeHtml(userName(snapshot.perspective)) + '</span></div>');
  out.push('</div>');

  out.push('<div class="fm-notice">');
  out.push('<p><strong>Welcome to the ' + escapeHtml(forumName) + ' message boards.</strong><br />You are currently logged in, <u>' + escapeHtml(userName(snapshot.perspective)) + '</u></p>');
  out.push('<ul class="fm-viewing">' + viewingLines(snapshot).map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>');
  out.push('</div>');

  (snapshot.threads || []).forEach(function (thread) {
    var info = threadLayout(thread, snapshot.postsPerPage);
    var parts = locationParts(thread.location);
    var opName = userName(thread.op && thread.op.user);
    var crumbs = ['Forums', 'Boards'].concat(parts).map(escapeHtml).join(' <span class="fm-sep">›</span> ');

    out.push('<div class="fm-thread">');
    out.push('<div class="fm-crumbs">' + crumbs + '</div>');
    out.push('<h3 class="fm-title">' + escapeHtml(thread.name || '') + '</h3>');
    out.push('<div class="fm-meta">Discussion' + (parts.length ? ' in ‘' + escapeHtml(parts[parts.length - 1]) + '’' : '') +
      ' started by <strong>' + escapeHtml(opName) + '</strong>, ' + escapeHtml((thread.op && thread.op.date) || '') + '</div>');

    if (info.opOnFirstPage) {
      out.push(htmlPageNav(1, info.endPage));
    }
    out.push(htmlPost({ post: thread.op || {}, number: 1 }, thread, bbToHtml));

    info.pages.forEach(function (page, i) {
      if (!(info.opOnFirstPage && i === 0)) {
        out.push(htmlPageNav(page.page, info.endPage));
      }
      page.posts.forEach(function (entry) {
        out.push(htmlPost(entry, thread, bbToHtml));
      });
    });

    var lastPage = info.pages.length ? info.pages[info.pages.length - 1].page : info.startPage;
    out.push(htmlPageNav(lastPage, info.endPage));
    out.push('</div>');
  });

  out.push('</div>');
  return out.join('\n');
}

// The work skin. Paste it into AO3 > Skins > Create Work Skin, then pick that
// skin on the work. AO3 prefixes every selector with #workskin by itself.
export function workSkinCss(themeName) {
  var t = THEMES[themeName] || THEMES[DEFAULT_THEME];
  var sans = '"Segoe UI", "Helvetica Neue", Roboto, Arial, sans-serif';
  var rules = [];
  var rule = function (selector, body) {
    rules.push(selector + ' {\n  ' + body.join(';\n  ') + ';\n}');
  };

  rule('.fm-forum', ['margin: 1.5em 0', 'padding: 0 0 0.75em', 'background: ' + t.page, 'color: ' + t.text,
    'font-family: ' + sans, 'font-size: 0.95em', 'line-height: 1.5', 'border: 1px solid ' + t.border, 'border-radius: 4px']);
  rule('.fm-forum p', ['margin: 0 0 0.75em']);
  rule('.fm-forum a', ['color: ' + t.accent]);

  rule('.fm-header', ['background: ' + t.header, 'color: ' + t.headerText, 'border-bottom: 3px solid ' + t.accent, 'border-radius: 4px 4px 0 0']);
  rule('.fm-logo', ['padding: 0.6em 0.9em 0.3em', 'font-size: 1.6em', 'font-weight: bold', 'letter-spacing: 0.02em']);
  rule('.fm-navrow', ['display: flex', 'flex-wrap: wrap', 'padding: 0 0.6em', 'background: ' + t.tab]);
  rule('.fm-tab', ['padding: 0.45em 0.8em', 'font-size: 0.9em', 'color: ' + t.headerText]);
  rule('.fm-tab-on', ['background: ' + t.accent, 'color: ' + t.accentText, 'font-weight: bold']);
  rule('.fm-tab-user', ['margin-left: auto', 'font-weight: bold']);

  rule('.fm-notice', ['margin: 0.75em', 'padding: 0.6em 0.9em', 'background: ' + t.notice, 'border: 1px solid ' + t.border,
    'border-left: 4px solid ' + t.accent, 'border-radius: 3px']);
  rule('.fm-notice p', ['margin: 0 0 0.3em']);
  rule('.fm-viewing', ['margin: 0', 'padding: 0', 'list-style: none', 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-viewing li', ['display: inline', 'margin: 0 0.9em 0 0']);

  rule('.fm-thread', ['margin: 1.25em 0.75em 0.75em']);
  rule('.fm-crumbs', ['font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-sep', ['padding: 0 0.25em']);
  rule('.fm-title', ['margin: 0.2em 0 0.1em', 'padding: 0', 'border: none', 'font-family: ' + sans,
    'font-size: 1.45em', 'font-weight: normal', 'color: ' + t.text, 'text-align: left']);
  rule('.fm-meta', ['margin-bottom: 0.6em', 'font-size: 0.8em', 'color: ' + t.muted]);

  rule('.fm-pagenav', ['margin: 0.6em 0', 'text-align: right', 'font-size: 0.8em']);
  rule('.fm-pagelabel', ['margin-right: 0.6em', 'color: ' + t.muted]);
  rule('.fm-pg', ['display: inline-block', 'min-width: 1.2em', 'margin: 0 0 0.25em 0.2em', 'padding: 0.15em 0.5em',
    'text-align: center', 'background: ' + t.block, 'border: 1px solid ' + t.border, 'border-radius: 3px', 'color: ' + t.accent]);
  rule('.fm-pg-on', ['background: ' + t.accent, 'border-color: ' + t.accent, 'color: ' + t.accentText, 'font-weight: bold']);
  rule('.fm-pg-gap', ['margin: 0 0.2em', 'color: ' + t.muted]);

  rule('.fm-post', ['display: flex', 'flex-wrap: wrap', 'margin: 0 0 0.6em', 'background: ' + t.block,
    'border: 1px solid ' + t.border, 'border-radius: 3px']);
  // min-width: 0 lets a long username wrap instead of widening this one
  // post's column, so every post's user column lines up.
  rule('.fm-user', ['display: flex', 'flex-wrap: wrap', 'flex: 1 0 8.5em', 'min-width: 0', 'justify-content: center', 'align-items: center',
    'align-content: flex-start', 'padding: 0.75em 0.5em', 'background: ' + t.user, 'border-right: 1px solid ' + t.border,
    'text-align: center']);
  rule('.fm-avatar', ['flex: 0 0 auto', 'width: 2.3em', 'height: 2.3em', 'margin: 0.1em 0.3em 0.3em', 'line-height: 2.3em',
    'font-size: 1.9em', 'font-weight: bold', 'text-align: center', 'color: #ffffff', 'border-radius: 4px']);
  rule('.fm-ident', ['flex: 0 1 auto', 'min-width: 0', 'max-width: 100%', 'padding: 0 0.3em']);
  rule('.fm-name', ['font-weight: bold', 'font-size: 1.05em', 'color: ' + t.accent, 'word-wrap: break-word']);
  rule('.fm-banner', ['margin: 0.25em auto 0', 'padding: 0.1em 0.5em', 'font-size: 0.72em', 'font-weight: bold',
    'line-height: 1.5', 'color: #ffffff', 'border-radius: 3px']);
  rule('.fm-main', ['display: flex', 'flex-direction: column', 'flex: 999 1 22em', 'min-width: 0', 'padding: 0.6em 0.9em']);
  rule('.fm-attr', ['display: flex', 'justify-content: space-between', 'padding-bottom: 0.4em', 'margin-bottom: 0.6em',
    'border-bottom: 1px solid ' + t.border, 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-body', ['flex: 1 0 auto', 'word-wrap: break-word']);
  rule('.fm-actions', ['margin-top: 0.6em', 'font-size: 0.75em', 'color: ' + t.muted, 'text-align: right']);
  rule('.fm-actions span', ['margin-left: 1em']);

  BB_PALETTE.forEach(function (color, i) {
    rule('.fm-av' + i + ', .fm-bn' + i, ['background: ' + color]);
  });
  rule('.fm-bn-op', ['background: ' + t.accent, 'color: ' + t.accentText]);
  rule('.fm-bn-mod', ['background: #d64545']);
  rule('.fm-bn-verified', ['background: #3a8fd6']);
  rule('.fm-bn-banned', ['background: #8a8a8a', 'text-decoration: line-through']);

  // BBCode used inside post bodies.
  rule('.fm-quote', ['margin: 0.5em 0 0.9em', 'padding: 0', 'background: ' + t.quote, 'border: 1px solid ' + t.border,
    'border-left: 3px solid ' + t.accent, 'font-family: ' + sans]);
  rule('.fm-quote-head', ['padding: 0.35em 0.7em', 'font-size: 0.85em', 'font-weight: bold', 'color: ' + t.accent]);
  rule('.fm-quote-body', ['padding: 0.35em 0.7em 0.1em']);
  rule('.fm-spoiler', ['margin: 0.5em 0 0.9em', 'border: 1px solid ' + t.border, 'border-radius: 3px']);
  rule('.fm-spoiler-head', ['padding: 0.3em 0.7em', 'font-size: 0.85em', 'font-weight: bold', 'background: ' + t.quote,
    'border-bottom: 1px solid ' + t.border]);
  rule('.fm-spoiler-body', ['padding: 0.5em 0.7em 0.1em']);
  rule('.fm-ispoiler', ['padding: 0 0.2em', 'background: ' + t.quote, 'border-bottom: 1px dotted ' + t.muted]);
  rule('.fm-code', ['margin: 0.5em 0 0.9em', 'border: 1px solid ' + t.border, 'background: ' + t.quote]);
  rule('.fm-code-head', ['padding: 0.3em 0.7em', 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-code pre', ['margin: 0', 'padding: 0.5em 0.7em', 'white-space: pre-wrap', 'font-family: Consolas, Menlo, monospace',
    'color: ' + t.text, 'background: transparent', 'border: none']);
  rule('.fm-icode', ['padding: 0 0.3em', 'color: ' + t.text, 'background: ' + t.quote, 'border: 1px solid ' + t.border, 'border-radius: 3px',
    'font-family: Consolas, Menlo, monospace']);
  rule('.fm-align-center', ['text-align: center']);
  rule('.fm-align-right', ['text-align: right']);
  rule('.fm-align-left', ['text-align: left']);
  rule('.fm-align-justify', ['text-align: justify']);
  rule('.fm-indent-1', ['margin-left: 2em']);
  rule('.fm-indent-2', ['margin-left: 4em']);
  rule('.fm-indent-3', ['margin-left: 6em']);
  rule('.fm-table', ['margin: 0.5em 0 0.9em', 'border-collapse: collapse', 'width: auto']);
  rule('.fm-table td, .fm-table th', ['padding: 0.3em 0.6em', 'border: 1px solid ' + t.border, 'vertical-align: top']);
  rule('.fm-table th', ['background: ' + t.quote, 'font-weight: bold']);
  rule('.fm-heading', ['margin: 0.6em 0 0.4em', 'font-family: ' + sans, 'color: ' + t.text]);
  rule('.fm-img', ['max-width: 100%', 'height: auto']);
  rule('.fm-hr', ['border: none', 'border-top: 1px solid ' + t.border, 'margin: 0.8em 0']);
  rule('.fm-media', ['margin: 0.5em 0', 'font-size: 0.9em']);
  rule('.fm-mention', ['color: ' + t.accent]);
  [0.65, 0.8, 1, 1.15, 1.4, 1.7, 2.1].forEach(function (size, i) {
    rule('.fm-size-' + (i + 1), ['font-size: ' + size + 'em']);
  });

  return rules.join('\n\n') + '\n';
}
