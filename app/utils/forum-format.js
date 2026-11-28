// Generates forum-style interlude output from a plain snapshot of a document.
// No Ember dependency, so it can be tested directly with Node.
//
// Snapshot shape:
// {
//   title, forumName, postsPerPage,
//   perspective: user|null,
//   threads: [{ name, location, startPage, endPage, isPrivate, op: post, replies: [post] }]
// }
// A thread with isPrivate set is a private message conversation: name is its
// subject, op is the first message, and location and pages are ignored.
// user = { id, name, tags: [{ id, name }] }
// post = { user: user|null, date: 'Jan 1, 2011', content: 'raw BBCode' }

export var DEFAULT_FORUM_NAME = 'Parahumans Online';
export var PLACEHOLDER_USER = 'Placeholder_User';

// Colors chosen to stay readable on both dark and light XenForo styles.
export var BB_PALETTE = ['#e0533d', '#e68a1e', '#c9a227', '#4caf50', '#1fa59a',
  '#3a8fd6', '#7a6ff0', '#c55bd1', '#e04f8b', '#8d9aa6'];
var BB_MUTED = '#8c8c8c';

// One entry per theme. The AO3 work skin and the in-app forum preview are both
// generated from these, so a new theme only needs adding here.
export var THEMES = {
  midnight: {
    name: 'Midnight',
    label: 'Midnight (dark navy)',
    page: '#161b22', block: '#1d232c', user: '#20272f', header: '#10151c', headerText: '#e8edf3',
    border: '#2f3946', text: '#d6dbe1', muted: '#8a95a3', accent: '#6aa6e8', accentText: '#0d1117',
    notice: '#1f2a38', quote: '#232b36', tab: '#1b2532'
  },
  graphite: {
    name: 'Graphite',
    label: 'Graphite (dark grey)',
    page: '#1b1b1b', block: '#242424', user: '#2a2a2a', header: '#141414', headerText: '#f0f0f0',
    border: '#3a3a3a', text: '#dddddd', muted: '#929292', accent: '#e0a040', accentText: '#1b1b1b',
    notice: '#2d2a24', quote: '#2c2c2c', tab: '#222222'
  },
  blackgreen: {
    name: 'Blackened Green',
    label: 'Blackened Green (near-black with green)',
    page: '#0c110d', block: '#131a15', user: '#172019', header: '#070b08', headerText: '#e2f2e6',
    border: '#233229', text: '#d4e4d8', muted: '#7e9484', accent: '#4cc76f', accentText: '#07110a',
    notice: '#15241a', quote: '#18231b', tab: '#0f1711'
  },
  ocean: {
    name: 'Ocean',
    label: 'Ocean (dark teal)',
    page: '#0f1a1c', block: '#142225', user: '#182a2d', header: '#0a1214', headerText: '#e0f2f3',
    border: '#24393d', text: '#d3e6e8', muted: '#7f9a9e', accent: '#2ec4c4', accentText: '#071213',
    notice: '#15292c', quote: '#182c2f', tab: '#0f1d20'
  },
  violet: {
    name: 'Violet',
    label: 'Violet (dark purple)',
    page: '#17141f', block: '#1e1a29', user: '#231e30', header: '#100d17', headerText: '#ece6f7',
    border: '#342c47', text: '#dcd5ea', muted: '#958ba8', accent: '#a37cf0', accentText: '#120e1a',
    notice: '#241d36', quote: '#251f33', tab: '#1a1524'
  },
  crimson: {
    name: 'Crimson',
    label: 'Crimson (dark red)',
    page: '#1a1214', block: '#221719', user: '#281b1e', header: '#120c0d', headerText: '#f3e4e6',
    border: '#3b2629', text: '#e6d6d8', muted: '#a08a8e', accent: '#e0485a', accentText: '#ffffff',
    notice: '#2c1a1d', quote: '#2a1c1f', tab: '#1c1214'
  },
  ember: {
    name: 'Ember',
    label: 'Ember (dark warm)',
    page: '#1c1814', block: '#25201b', user: '#2a241e', header: '#14110e', headerText: '#f1e7da',
    border: '#3d342b', text: '#e3dace', muted: '#9c8f80', accent: '#de8a3a', accentText: '#1c1814',
    notice: '#30271e', quote: '#2d2620', tab: '#211c17'
  },
  daylight: {
    name: 'Daylight',
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

// Everyone in a private conversation, in the order they first wrote, then
// the inbox owner if they haven't written yet.
export function pmParticipants(thread, perspective) {
  var people = [];
  var add = function (user) {
    if (!user) { return; }
    for (var i = 0; i < people.length; i++) {
      if (sameUser(people[i], user)) { return; }
    }
    people.push(user);
  };
  add(thread.op && thread.op.user);
  (thread.replies || []).forEach(function (post) { add(post.user); });
  add(perspective);
  return people;
}

// "from Bagrat", or "to Bagrat, Weld" when the inbox owner started it.
export function pmHeadline(thread, perspective) {
  var opener = thread.op && thread.op.user;
  if (opener && sameUser(opener, perspective)) {
    var others = pmParticipants(thread, null).filter(function (user) {
      return !sameUser(user, perspective);
    });
    if (others.length) {
      return 'to ' + others.map(userName).join(', ');
    }
  }
  return 'from ' + userName(opener);
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
// Avatars. "initials" matches XenForo's default letter avatars; on the forum
// it's a DiceBear image, on AO3 the work skin draws the same block in CSS.

export var AVATAR_STYLES = [
  { key: 'initials', name: 'Initials', label: 'A coloured square with the first letter, like XenForo\'s default avatars.' },
  { key: 'identicon', name: 'Identicon', label: 'A generated geometric pattern, different for every username.' },
  { key: 'thumbs', name: 'Cartoon', label: 'A generated cartoon face, different for every username.' },
  { key: 'letter', name: 'Text', label: 'A big coloured letter. No images, nothing loaded from other sites.' }
];
export var DEFAULT_AVATAR_STYLE = 'initials';

function avatarStyle(style) {
  for (var i = 0; i < AVATAR_STYLES.length; i++) {
    if (AVATAR_STYLES[i].key === style) { return style; }
  }
  return DEFAULT_AVATAR_STYLE;
}

// A stable avatar image URL for a username, or null for the text style.
export function avatarUrl(name, style) {
  style = avatarStyle(style);
  if (style === 'letter') { return null; }
  var url = 'https://api.dicebear.com/9.x/' + style + '/png?seed=' + encodeURIComponent(name) + '&size=128';
  if (style === 'initials') {
    url += '&chars=1&textColor=ffffff&backgroundColor=' + BB_PALETTE[avatarIndex(name)].substring(1);
  }
  return url;
}

// Staff and banned users get their names coloured, like forum user groups.
function userKind(user) {
  var kind = null;
  ((user && user.tags) || []).forEach(function (tag) {
    var k = bannerKind(tag.name);
    if (k === 'banned' || (k === 'mod' && kind !== 'banned')) { kind = k; }
  });
  return kind;
}

// ---------------------------------------------------------------------------
// Forum BBCode (SpaceBattles / Sufficient Velocity / Questionable Questing).
// Uses BBCode that ships with XenForo 2.2+: TABLE, HEADING, HR, IMG width,
// SIZE, COLOR, ICODE, SPOILER, CENTER, LEFT, RIGHT. Things learned from a test
// post on a real XenForo forum:
//   - tables are full width, and short tables split their columns evenly, so
//     each page's posts share one table to keep the user column narrow
//   - [TH] cells are shaded and centred, which makes a good per-post header bar
//   - table cells are vertically centred, and BBCode can't change that
//   - [BGCOLOR] doesn't exist, so coloured avatars have to be images

var NBSP = '\u00a0';

function bbMuted(text, size) {
  return '[SIZE=' + (size || 2) + '][COLOR=' + BB_MUTED + ']' + text + '[/COLOR][/SIZE]';
}

function bbButton(label) {
  return '[ICODE]' + NBSP + label + NBSP + '[/ICODE]';
}

function bbPageNav(page, total) {
  var parts = [];
  if (page > 1) { parts.push(bbButton('‹ Prev')); }
  pageList(page, total).forEach(function (p) {
    if (p === '…') {
      parts.push('…');
    } else if (p === page) {
      parts.push('[B][COLOR=' + BB_PALETTE[5] + ']' + NBSP + p + NBSP + '[/COLOR][/B]');
    } else {
      parts.push(bbButton(p));
    }
  });
  if (page < total) { parts.push(bbButton('Next ›')); }
  return '[RIGHT][COLOR=' + BB_MUTED + ']Page ' + page + ' of ' + total + '[/COLOR]   [SIZE=4]' + parts.join(' ') + '[/SIZE][/RIGHT]';
}

function bbName(user) {
  var name = userName(user);
  var kind = userKind(user);
  if (kind === 'banned') { return '[COLOR=#8a8a8a][S]' + name + '[/S][/COLOR]'; }
  if (kind === 'mod') { return '[COLOR=#d64545]' + name + '[/COLOR]'; }
  return name;
}

function bbAvatar(name, style, px) {
  var url = avatarUrl(name, style);
  if (url) {
    return '[IMG width="' + px + 'px"]' + url + '[/IMG]';
  }
  var color = BB_PALETTE[avatarIndex(name)];
  return px > 48 ? '[SIZE=7][COLOR=' + color + '][B]' + initial(name) + '[/B][/COLOR][/SIZE]'
                 : '[COLOR=' + color + ']■[/COLOR]';
}

// User titles under the name: Original Poster in bold, staff/verified/banned
// in their banner colour, everything else muted.
function bbTags(user, op) {
  var tags = [];
  if (op) {
    tags.push('[B]Original Poster[/B]');
  }
  ((user && user.tags) || []).forEach(function (tag) {
    if (bannerKind(tag.name)) {
      tags.push('[B][COLOR=' + bannerColor(tag.name) + ']' + tag.name + '[/COLOR][/B]');
    } else {
      tags.push('[COLOR=' + BB_MUTED + ']' + tag.name + '[/COLOR]');
    }
  });
  return tags;
}

// The rows for one post. Posts on the same page share one [TABLE] so the
// columns stay the same width all the way down, like a real thread.
function bbPostRows(entry, thread, options) {
  var post = entry.post;
  var name = userName(post.user);
  var isOp = !thread.isPrivate && sameUser(post.user, thread.op && thread.op.user);
  var content = String(post.content || '').replace(/\s+$/, '');
  var tags = bbTags(post.user, isOp);
  var out = [];

  if (options.layout === 'stacked') {
    // Header bar: avatar, name and titles. Content below.
    out.push('[TR]');
    out.push('[TH][LEFT]' + bbAvatar(name, options.avatars, 40) + ' [B]' + bbName(post.user) + '[/B]' +
      (tags.length ? '   [SIZE=2]' + tags.join('  ·  ') + '[/SIZE]' : '') + '[/LEFT][/TH]');
    out.push('[/TR]');
    out.push('[TR]');
    out.push('[TD]' + bbMuted((post.date || '') + '  ·  #' + entry.number) + '\n\n' + content + '[/TD]');
    out.push('[/TR]');
  } else {
    // Header bar: date and post number. Then user column + content.
    out.push('[TR]');
    out.push('[TH][SIZE=2]' + (post.date || '') + '[/SIZE][/TH]');
    out.push('[TH][RIGHT][SIZE=2]#' + entry.number + '[/SIZE][/RIGHT][/TH]');
    out.push('[/TR]');
    out.push('[TR]');
    out.push('[TD][CENTER]' + bbAvatar(name, options.avatars, 64) + '\n' +
      '[B]' + bbName(post.user) + '[/B]' +
      (tags.length ? '\n[SIZE=2]' + tags.join('\n') + '[/SIZE]' : '') + '[/CENTER][/TD]');
    out.push('[TD]' + content + '[/TD]');
    out.push('[/TR]');
  }
  return out;
}

function bbPostTable(entries, thread, options) {
  var rows = [];
  entries.forEach(function (entry) {
    rows.push.apply(rows, bbPostRows(entry, thread, options));
  });
  return ['[TABLE]'].concat(rows, ['[/TABLE]']).join('\n');
}

// Every message of a conversation in one table, numbered from 1, with no
// pages: XenForo conversations rarely run past one page.
function conversationEntries(thread) {
  return [thread.op || {}].concat(thread.replies || []).map(function (post, i) {
    return { post: post, number: i + 1 };
  });
}

function bbConversation(thread, snapshot, opts) {
  var opener = thread.op && thread.op.user;
  var people = pmParticipants(thread, snapshot.perspective).map(userName);
  return [
    bbMuted('Inbox ► Conversations'),
    '[HEADING=2]✉ ' + (thread.name || '') + '[/HEADING]',
    bbMuted('Private conversation started by ' + userName(opener) + ', ' + ((thread.op && thread.op.date) || '') +
      '  ·  Participants: ' + people.join(', ')),
    bbPostTable(conversationEntries(thread), thread, opts)
  ];
}

export function forumBBCode(snapshot, options) {
  options = options || {};
  var opts = {
    layout: options.layout === 'stacked' ? 'stacked' : 'sidebar',
    avatars: avatarStyle(options.avatars)
  };
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

  (snapshot.threads || []).forEach(function (thread, threadIndex) {
    var info = threadLayout(thread, snapshot.postsPerPage);
    var parts = locationParts(thread.location);
    var opName = userName(thread.op && thread.op.user);
    var opEntry = { post: thread.op || {}, number: 1 };

    if (threadIndex > 0) {
      out.push('[HR][/HR]');
    }
    out.push('');
    if (thread.isPrivate) {
      out.push.apply(out, bbConversation(thread, snapshot, opts));
      return;
    }
    out.push(bbMuted('Forums ► Boards' + (parts.length ? ' ► ' + parts.join(' ► ') : '')));
    out.push('[HEADING=2]' + (thread.name || '') + '[/HEADING]');
    out.push(bbMuted('Discussion' + (parts.length ? " in '" + parts[parts.length - 1] + "'" : '') +
      ' started by ' + opName + ', ' + ((thread.op && thread.op.date) || '')));

    if (info.opOnFirstPage) {
      // The OP is the first post of page 1.
      out.push(bbPageNav(1, info.endPage));
      var firstPage = info.pages.length && info.pages[0].page === 1 ? info.pages[0].posts : [];
      out.push(bbPostTable([opEntry].concat(firstPage), thread, opts));
    } else {
      out.push(bbPostTable([opEntry], thread, opts));
    }

    info.pages.forEach(function (page, i) {
      if (info.opOnFirstPage && i === 0) { return; }
      out.push(bbPageNav(page.page, info.endPage));
      out.push(bbPostTable(page.posts, thread, opts));
    });

    var lastPage = info.pages.length ? info.pages[info.pages.length - 1].page : info.startPage;
    out.push(bbPageNav(lastPage, info.endPage));
  });

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// AO3 chapter HTML + work skin.
//
// The HTML is the Classic PHO transcript, line for line, so a reader with
// "Hide Creator's Style" on, or anyone reading an AO3 download (downloads
// leave work skins out), sees the classic layout. The work skin then rebuilds
// the forum from that same markup:
//   - `fm-x` spans hold classic-only text ("Posted On", "►", brackets) and the
//     skin hides them
//   - forum-only text comes from the skin's ::before rules, so it isn't there
//     without the skin. AO3 only allows a fixed string in `content` (no
//     attr(), no counter()), so per-user text such as avatar letters, post
//     numbers and the forum name is spelled out with empty spans, one class
//     per character (see glyphs()). That keeps one skin good for any interlude.
//   - wrapper divs and spans with no text of their own are invisible unstyled
//
// AO3 rules this respects: no `style` attributes (`align` is allowed, and is
// how the ■ lines are centred), no media queries (the layout wraps with
// flexbox), each block element on its own line and no newlines between
// inline elements, so AO3's paragraph pass doesn't add stray <br /> tags.

var GLYPH_PUNCT = {
  ' ': 'sp', '_': 'us', '-': 'hy', '.': 'dt', '\'': 'ap', '!': 'ex', '?': 'qm', '&': 'am',
  ':': 'co', ',': 'cm', '(': 'lp', ')': 'rp', '#': 'hs', '@': 'at', '/': 'sl', '+': 'pl'
};

// Lower-case class names only, in case anything on the way normalises case.
function glyphClass(ch) {
  if (/[a-z0-9]/.test(ch)) { return 'fm-g-' + ch; }
  if (/[A-Z]/.test(ch)) { return 'fm-g-u' + ch.toLowerCase(); }
  return GLYPH_PUNCT[ch] ? 'fm-g-' + GLYPH_PUNCT[ch] : null;
}

// Text that only the work skin shows. Characters without a glyph are dropped.
export function glyphs(text) {
  return String(text === null || text === undefined ? '' : text).split('').map(function (ch) {
    var cls = glyphClass(ch);
    return cls ? '<span class="' + cls + '"></span>' : '';
  }).join('');
}

// Classic-only text, hidden by the work skin. `html` must already be escaped.
function classicOnly(html) {
  return '<span class="fm-x">' + html + '</span>';
}

// Mirrors the thread-page-footer component: "1, 2, 3 ... 6, 7, 8 ... 18, 19, 20".
export function classicPageList(page, total) {
  var items = [];
  var i;
  if (page - 1 > 5) {
    items.push(1, 2, 3, '...', page - 2, page - 1, page);
  } else {
    for (i = 1; i <= page; i++) { items.push(i); }
  }
  if (total - page > 5) {
    items.push(page + 1, page + 2, '...', total - 2, total - 1, total);
  } else {
    for (i = page + 1; i <= total; i++) { items.push(i); }
  }
  return items;
}

function htmlPageHead(page, total) {
  return '<p class="fm-pagehead"><strong>' + classicOnly('(Showing ') +
    '<span class="fm-pagelabel">page ' + page + ' of ' + total + '</span>' + classicOnly(')') + '</strong></p>';
}

function htmlPageEnd(page, total) {
  var parts = [];
  var items = classicPageList(page, total);
  items.forEach(function (item, i) {
    if (item === '...') {
      parts.push('<span class="fm-pg-gap"> ... </span>');
      return;
    }
    if (i > 0 && items[i - 1] !== '...') {
      parts.push(classicOnly(', '));
    }
    parts.push(item === page ? '<span class="fm-pg fm-pg-on">' + item + '</span>' : '<u class="fm-pg">' + item + '</u>');
  });
  return '<p class="fm-pagenav"><strong>' + classicOnly('End of Page.&nbsp;&nbsp;&nbsp;') +
    (page > 1 ? '<span class="fm-pg fm-prev"></span>' : '') + parts.join('') +
    (page < total ? '<span class="fm-pg fm-next"></span>' : '') + '</strong></p>';
}

function htmlBanners(user, isOp) {
  var banners = [];
  if (isOp) {
    banners.push('<span class="fm-banner fm-bn-op">' + classicOnly('(') + 'Original Poster' + classicOnly(')') + '</span>');
  }
  ((user && user.tags) || []).forEach(function (tag) {
    var kind = bannerKind(tag.name);
    var cls = kind ? 'fm-bn-' + kind : 'fm-bn' + (hashString(tag.name) % BB_PALETTE.length);
    banners.push('<span class="fm-banner ' + cls + '">' + classicOnly('(') + escapeHtml(tag.name) + classicOnly(')') + '</span>');
  });
  return banners;
}

// One post. Unstyled it reads like Classic PHO:
//   ►Bagrat (Original Poster) (Veteran Member)
//   Replied On Jan 2nd 2011:
//   ...content...
// Private messages read "Bagrat:" followed by the message.
function htmlPost(post, o, bbToHtml) {
  var name = userName(post.user);
  var nameHtml = '<strong class="fm-name">' + (o.reply ? classicOnly('►') : '') + escapeHtml(name) +
    (o.pm ? classicOnly(':') : '') + '</strong>';
  var ident = [nameHtml].concat(o.pm ? [] : htmlBanners(post.user, o.isOp)).join(' ');
  var date = o.pm ? '' : classicOnly(o.label + ' ') +
    '<span class="fm-date">' + escapeHtml(post.classicDate || post.date || '') + '</span>' + classicOnly(':');
  var body = bbToHtml ? bbToHtml(post.content || '', 'ao3') : escapeHtml(post.content || '');

  return [
    '<div class="fm-post">',
    '<div class="fm-user"><span class="fm-avatar fm-av' + avatarIndex(name) + '">' + glyphs(initial(name)) + '</span>' +
      '<span class="fm-ident">' + ident + '</span></div>',
    '<div class="fm-main">',
    '<div class="fm-attr">' + date + '<span class="fm-num">' + glyphs(o.number) + '</span></div>',
    '<div class="fm-body">',
    body,
    '</div>',
    '<div class="fm-actions"></div>',
    '</div>',
    '</div>'
  ].filter(function (line) { return line !== ''; }).join('\n');
}

function htmlThread(thread, snapshot, bbToHtml) {
  var info = threadLayout(thread, snapshot.postsPerPage);
  var op = thread.op || {};
  var crumbs = ['Boards'].concat(locationParts(thread.location)).map(escapeHtml).join('<span class="fm-sep"> ► </span>');
  var out = [];

  out.push('<div class="fm-thread">');
  out.push('<div class="fm-thead">');
  out.push('<div class="fm-title"><strong>' + classicOnly('♦&nbsp; Topic: ') + escapeHtml(thread.name || '') + '</strong></div>');
  out.push('<div class="fm-crumbs"><strong>' + classicOnly('In:&nbsp; ') + crumbs + '</strong></div>');
  out.push('</div>');
  out.push(htmlPost(op, { isOp: !!op.user, label: 'Posted On', number: 1 }, bbToHtml));

  info.pages.forEach(function (page) {
    out.push(htmlPageHead(page.page, info.endPage));
    out.push('<blockquote class="fm-replies">');
    page.posts.forEach(function (entry) {
      out.push(htmlPost(entry.post, {
        reply: true,
        isOp: sameUser(entry.post.user, op.user),
        label: 'Replied On',
        number: entry.number
      }, bbToHtml));
    });
    out.push('</blockquote>');
    out.push(htmlPageEnd(page.page, info.endPage));
  });

  out.push('<p class="fm-sq" align="center">■</p>');
  out.push('</div>');
  return out.join('\n');
}

function htmlConversation(thread, snapshot, bbToHtml) {
  var out = [];
  out.push('<div class="fm-thread fm-pm">');
  out.push('<div class="fm-thead">');
  out.push('<div class="fm-pmfrom"><strong>' + classicOnly('♦&nbsp; ') + 'Private Message ' +
    escapeHtml(pmHeadline(thread, snapshot.perspective)) + '</strong></div>');
  out.push('<div class="fm-title">' + classicOnly('<strong>Subject:</strong> ') + '<span class="fm-pm-tag"></span>' +
    escapeHtml(thread.name || '') + '</div>');
  out.push('</div>');
  conversationEntries(thread).forEach(function (entry) {
    out.push(htmlPost(entry.post, { pm: true, number: entry.number }, bbToHtml));
  });
  out.push('<p class="fm-sq" align="center">■</p>');
  out.push('</div>');
  return out.join('\n');
}

export function ao3Html(snapshot, options) {
  options = options || {};
  var bbToHtml = options.bbToHtml;
  var forumName = snapshot.forumName || DEFAULT_FORUM_NAME;
  var out = [];

  out.push('<div class="fm-forum">');
  out.push('<div class="fm-header"><span class="fm-logo">' + glyphs(forumName) + '</span>' +
    '<span class="fm-navrow"><span class="fm-tab fm-tab-on fm-tab-forums"></span><span class="fm-tab fm-tab-new"></span>' +
    '<span class="fm-tab fm-tab-members"></span></span></div>');
  out.push('<p class="fm-sq" align="center">■</p>');
  out.push('<div class="fm-notice">');
  out.push('<div class="fm-welcome"><strong>Welcome to the ' + escapeHtml(forumName) + ' message boards.</strong></div>');
  out.push('<div>You are currently logged in, <u>' + escapeHtml(userName(snapshot.perspective)) + '</u></div>');
  out.push('<div class="fm-x">You are viewing:</div>');
  out.push('<div class="fm-viewing">');
  viewingLines(snapshot).forEach(function (line) {
    out.push('<div class="fm-vl">' + classicOnly('•&nbsp; ') + escapeHtml(line) + '</div>');
  });
  out.push('</div>');
  out.push('</div>');
  out.push('<p class="fm-sq" align="center">■</p>');

  (snapshot.threads || []).forEach(function (thread) {
    out.push(thread.isPrivate ? htmlConversation(thread, snapshot, bbToHtml) : htmlThread(thread, snapshot, bbToHtml));
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
  // Classic-only text and the ■ separators.
  rule('.fm-x, .fm-sq', ['display: none']);

  rule('.fm-header', ['display: block', 'background: ' + t.header, 'color: ' + t.headerText, 'border-bottom: 3px solid ' + t.accent,
    'border-radius: 4px 4px 0 0']);
  rule('.fm-logo', ['display: block', 'padding: 0.6em 0.9em 0.3em', 'font-size: 1.6em', 'font-weight: bold', 'letter-spacing: 0.02em']);
  rule('.fm-navrow', ['display: flex', 'flex-wrap: wrap', 'padding: 0 0.6em', 'background: ' + t.tab]);
  rule('.fm-tab', ['padding: 0.45em 0.8em', 'font-size: 0.9em', 'color: ' + t.headerText]);
  rule('.fm-tab-on', ['background: ' + t.accent, 'color: ' + t.accentText, 'font-weight: bold']);
  rule('.fm-tab-forums:before', ['content: "Forums"']);
  rule('.fm-tab-new:before', ['content: "What’s new"']);
  rule('.fm-tab-members:before', ['content: "Members"']);

  rule('.fm-notice', ['margin: 0.75em', 'padding: 0.6em 0.9em', 'background: ' + t.notice, 'border: 1px solid ' + t.border,
    'border-left: 4px solid ' + t.accent, 'border-radius: 3px']);
  rule('.fm-viewing', ['margin-top: 0.3em', 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-vl', ['display: inline', 'margin: 0 0.9em 0 0']);

  rule('.fm-thread', ['margin: 1.25em 0.75em 0.75em']);
  rule('.fm-thead', ['display: flex', 'flex-direction: column', 'margin-bottom: 0.6em']);
  rule('.fm-crumbs, .fm-pmfrom', ['order: -1', 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-crumbs strong, .fm-pmfrom strong', ['font-weight: normal']);
  rule('.fm-crumbs:before', ['content: "Forums ► "']);
  rule('.fm-pmfrom:before', ['content: "Inbox ► "']);
  rule('.fm-title', ['margin: 0.2em 0 0', 'font-size: 1.45em', 'line-height: 1.3', 'color: ' + t.text]);
  rule('.fm-title strong', ['font-weight: normal']);
  rule('.fm-pm-tag:before', ['content: "Private"']);
  rule('.fm-pm-tag', ['display: inline-block', 'margin-right: 0.4em', 'padding: 0.1em 0.45em', 'vertical-align: middle',
    'font-size: 0.55em', 'font-weight: bold', 'letter-spacing: 0.05em', 'text-transform: uppercase',
    'background: ' + t.accent, 'color: ' + t.accentText, 'border-radius: 3px']);
  rule('.fm-pm .fm-post', ['border-left: 3px solid ' + t.accent]);

  // AO3 indents blockquotes; the replies shouldn't be.
  rule('.fm-replies', ['margin: 0', 'padding: 0', 'border: none', 'font-family: ' + sans, 'font-size: 1em']);

  rule('.fm-forum .fm-pagehead, .fm-forum .fm-pagenav', ['margin: 0.6em 0', 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-pagehead strong, .fm-pagenav strong', ['font-weight: normal']);
  rule('.fm-pagelabel', ['display: inline-block']);
  rule('.fm-pagelabel:first-letter', ['text-transform: uppercase']);
  rule('.fm-pagenav', ['text-align: right']);
  rule('.fm-pg', ['display: inline-block', 'min-width: 1.2em', 'margin: 0 0 0.25em 0.2em', 'padding: 0.15em 0.5em',
    'text-align: center', 'text-decoration: none', 'background: ' + t.block, 'border: 1px solid ' + t.border,
    'border-radius: 3px', 'color: ' + t.accent]);
  rule('.fm-pg-on', ['background: ' + t.accent, 'border-color: ' + t.accent, 'color: ' + t.accentText, 'font-weight: bold']);
  rule('.fm-pg-gap', ['margin: 0 0.2em', 'color: ' + t.muted]);
  rule('.fm-prev:before', ['content: "‹ Prev"']);
  rule('.fm-next:before', ['content: "Next ›"']);

  rule('.fm-post', ['display: flex', 'flex-wrap: wrap', 'margin: 0 0 0.6em', 'background: ' + t.block,
    'border: 1px solid ' + t.border, 'border-radius: 3px']);
  // min-width: 0 lets a long username wrap instead of widening this one
  // post's column, so every post's user column lines up.
  rule('.fm-user', ['display: flex', 'flex-wrap: wrap', 'flex: 1 0 8.5em', 'min-width: 0', 'justify-content: center', 'align-items: center',
    'align-content: flex-start', 'padding: 0.75em 0.5em', 'background: ' + t.user, 'border-right: 1px solid ' + t.border,
    'text-align: center']);
  rule('.fm-avatar', ['display: block', 'flex: 0 0 auto', 'width: 2.3em', 'height: 2.3em', 'margin: 0.1em 0.3em 0.3em', 'line-height: 2.3em',
    'font-size: 1.9em', 'font-weight: bold', 'text-align: center', 'color: #ffffff', 'border-radius: 4px']);
  rule('.fm-ident', ['display: block', 'flex: 0 1 auto', 'min-width: 0', 'max-width: 100%', 'padding: 0 0.3em']);
  rule('.fm-name', ['display: block', 'font-weight: bold', 'font-size: 1.05em', 'color: ' + t.accent, 'word-wrap: break-word']);
  rule('.fm-banner', ['display: block', 'margin: 0.25em auto 0', 'padding: 0.1em 0.5em', 'font-size: 0.72em', 'font-weight: bold',
    'line-height: 1.5', 'color: #ffffff', 'border-radius: 3px']);
  rule('.fm-main', ['display: flex', 'flex-direction: column', 'flex: 999 1 22em', 'min-width: 0', 'padding: 0.6em 0.9em']);
  rule('.fm-attr', ['display: flex', 'justify-content: space-between', 'padding-bottom: 0.4em', 'margin-bottom: 0.6em',
    'border-bottom: 1px solid ' + t.border, 'font-size: 0.8em', 'color: ' + t.muted]);
  rule('.fm-num', ['margin-left: auto']);
  rule('.fm-num:before', ['content: "#"']);
  rule('.fm-body', ['flex: 1 0 auto', 'word-wrap: break-word']);
  rule('.fm-actions', ['margin-top: 0.6em', 'font-size: 0.75em', 'color: ' + t.muted, 'text-align: right', 'word-spacing: 1em']);
  rule('.fm-actions:before', ['content: "Report Like Quote Reply"']);

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

  // Glyphs: the characters glyphs() spells out with empty spans. AO3 reads the
  // skin with css_parser, which takes a lone "(" for the start of a url(...)
  // and swallows the declaration, so brackets go in as CSS escapes: "\28"
  // still shows as "(". So do the characters AO3 may HTML-escape on the way
  // in (it turns "&gt;" back into ">"), and anything else that could trip it.
  var glyphRule = function (cls, ch) {
    var text = /[(){};"'&<>\\]/.test(ch) ? '\\' + ch.charCodeAt(0).toString(16) : ch;
    rules.push('.' + cls + ':before { content: "' + text + '"; }');
  };
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (ch) {
    glyphRule('fm-g-' + ch, ch);
    glyphRule('fm-g-u' + ch, ch.toUpperCase());
  });
  '0123456789'.split('').forEach(function (ch) { glyphRule('fm-g-' + ch, ch); });
  Object.keys(GLYPH_PUNCT).forEach(function (ch) { glyphRule('fm-g-' + GLYPH_PUNCT[ch], ch); });

  return rules.join('\n\n') + '\n';
}

// Colours for the in-app XenForo preview (`.xf-preview`, `bb-` classes). The
// layout lives in app.scss; this only paints it in the chosen theme. Forum
// BBCode can't change the forum's own colours, so this is preview-only.
export function xfPreviewCss(themeName) {
  var t = THEMES[themeName] || THEMES[DEFAULT_THEME];
  var p = '.xf-preview';
  var rules = [];
  var rule = function (selectors, body) {
    rules.push(selectors.map(function (s) { return p + s; }).join(', ') + ' { ' + body.join('; ') + '; }');
  };
  rule([''], ['background: ' + t.page, 'color: ' + t.text]);
  rule([' a', ' .bb-mention'], ['color: ' + t.accent]);
  rule([' .bb-table'], ['background: ' + t.block]);
  rule([' .bb-table td', ' .bb-table th'], ['border-color: ' + t.border]);
  rule([' .bb-table th'], ['background: ' + t.quote]);
  rule([' .bb-quote', ' .bb-spoiler-body', ' .bb-code'], ['background: ' + t.quote, 'border-color: ' + t.border]);
  rule([' .bb-quote'], ['border-left-color: ' + t.accent]);
  rule([' .bb-quote-head'], ['color: ' + t.accent]);
  rule([' .bb-spoiler-head'], ['background: ' + t.quote, 'color: ' + t.text, 'border: 1px solid ' + t.border]);
  rule([' .bb-icode'], ['background: ' + t.quote, 'border-color: ' + t.border, 'color: ' + t.text]);
  rule([' .bb-code pre'], ['background: ' + t.block, 'color: ' + t.text, 'border-color: ' + t.border]);
  rule([' .bb-code-head'], ['color: ' + t.muted]);
  rule([' .bb-hr'], ['border-color: ' + t.border]);
  rule([' .bb-ispoiler'], ['background: ' + t.text, 'color: ' + t.text]);
  rule([' .bb-ispoiler:hover'], ['background: transparent']);
  return rules.join('\n') + '\n';
}
