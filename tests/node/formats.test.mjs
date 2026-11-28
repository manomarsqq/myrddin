// Tests for the framework-free output formats. Run with: node --test tests/node
import test from 'node:test';
import assert from 'node:assert/strict';
import { bbcodeToHtml, quoteAuthor } from '../../app/utils/bbcode.js';
import {
  forumBBCode, ao3Html, workSkinCss, xfPreviewCss, threadLayout, pageList, numToWord, THEMES, avatarUrl,
  pmParticipants, pmHeadline, classicPageList, glyphs, avatarIndex
} from '../../app/utils/forum-format.js';

var bagrat = { id: '1', name: 'Bagrat', tags: [{ id: '1', name: 'Veteran Member' }, { id: '18', name: 'Moderator' }] };
var tin = { id: '2', name: 'Tin_Mother', tags: [] };

function snapshot(replyCount, extra) {
  var replies = [];
  for (var i = 0; i < replyCount; i++) {
    replies.push({ user: i % 2 ? bagrat : tin, date: 'Jan 2, 2011', content: 'Reply ' + (i + 1) });
  }
  return Object.assign({
    title: 'Test',
    forumName: 'Parahumans Online',
    postsPerPage: 10,
    perspective: tin,
    threads: [{
      name: 'Endbringer Thread',
      location: 'Places ► America ► Brockton Bay',
      startPage: 1,
      endPage: 1,
      op: { user: bagrat, date: 'Jan 1, 2011', content: 'First post\n\n[b]bold[/b]' },
      replies: replies
    }]
  }, extra || {});
}

// --- BBCode parser --------------------------------------------------------

test('basic inline tags', function () {
  assert.equal(bbcodeToHtml('[b]a[/b] [i]b[/i] [u]c[/u] [s]d[/s]', 'xf'),
    '<strong>a</strong> <em>b</em> <u>c</u> <s>d</s>');
});

test('escapes HTML and keeps unknown tags literal', function () {
  assert.equal(bbcodeToHtml('<script>[foo]x[/foo]', 'xf'), '&lt;script&gt;[foo]x[/foo]');
});

test('unclosed and stray tags stay literal', function () {
  assert.equal(bbcodeToHtml('[b]open', 'xf'), '[b]open');
  assert.equal(bbcodeToHtml('close[/b]', 'xf'), 'close[/b]');
});

test('newlines become <br /> and blocks eat the adjacent newline', function () {
  assert.equal(bbcodeToHtml('a\nb', 'xf'), 'a<br />b');
  assert.equal(bbcodeToHtml('a\n[quote]q[/quote]\nb', 'xf'),
    'a<blockquote class="bb-quote"><div class="bb-quote-body">q</div></blockquote>b');
});

test('quote author parsing', function () {
  assert.equal(quoteAuthor('"Bagrat, post: 123, member: 4"'), 'Bagrat');
  assert.equal(quoteAuthor('Bagrat'), 'Bagrat');
  assert.match(bbcodeToHtml('[quote="Bagrat, post: 1"]hi[/quote]', 'xf'), /Bagrat said:/);
});

test('color and font: inline style in xf, dropped in ao3', function () {
  assert.equal(bbcodeToHtml('[color=red]x[/color]', 'xf'), '<span style="color: red">x</span>');
  assert.equal(bbcodeToHtml('[color=red]x[/color]', 'ao3'), '<p>x</p>');
  assert.equal(bbcodeToHtml('[color=red;background:url(x)]x[/color]', 'xf'), 'x');
});

test('ao3 mode never emits style attributes', function () {
  var html = bbcodeToHtml('[color=#f00][font=Arial][size=5]x[/size][/font][/color] [center]c[/center]', 'ao3');
  assert.doesNotMatch(html, /style=/);
  assert.match(html, /fm-size-5/);
  assert.match(html, /fm-align-center/);
});

test('urls are validated', function () {
  assert.equal(bbcodeToHtml('[url=https://a.b/c]x[/url]', 'xf'), '<a href="https://a.b/c">x</a>');
  assert.equal(bbcodeToHtml('[url=javascript:alert(1)]x[/url]', 'xf'), 'x');
  assert.equal(bbcodeToHtml('[img]javascript:x[/img]', 'xf'), 'javascript:x');
});

test('code and plain keep their contents raw', function () {
  assert.match(bbcodeToHtml('[code][b]x[/b][/code]', 'xf'), /<pre>\[b\]x\[\/b\]<\/pre>/);
  assert.equal(bbcodeToHtml('[plain][b]x[/b][/plain]', 'xf'), '[b]x[/b]');
});

test('lists', function () {
  assert.equal(bbcodeToHtml('[list]\n[*]a\n[*]b\n[/list]', 'xf'), '<ul class="bb-list"><li>a</li><li>b</li></ul>');
  assert.match(bbcodeToHtml('[list=1][*]a[/list]', 'xf'), /^<ol/);
});

test('tables ignore whitespace between rows and cells', function () {
  assert.equal(bbcodeToHtml('[TABLE]\n[TR]\n[TD]a\nb[/TD]\n[TH]c[/TH]\n[/TR]\n[/TABLE]', 'xf'),
    '<table class="bb-table"><tbody><tr><td>a<br />b</td><th>c</th></tr></tbody></table>');
});

test('ao3 mode splits paragraphs', function () {
  assert.equal(bbcodeToHtml('one\ntwo\n\nthree', 'ao3'), '<p>one<br />two</p>\n<p>three</p>');
});

test('spoilers', function () {
  assert.match(bbcodeToHtml('[spoiler=Big reveal]x[/spoiler]', 'xf'), /<details class="bb-spoiler"><summary class="bb-spoiler-head">Spoiler: Big reveal/);
  assert.match(bbcodeToHtml('[spoiler]x[/spoiler]', 'ao3'), /fm-spoiler-head">Spoiler</);
});

// --- Paging ---------------------------------------------------------------

test('page numbering matches the classic components', function () {
  // startPage 1: OP is post #1, so page 1 holds 9 replies.
  var layout = threadLayout(snapshot(12).threads[0], 10);
  assert.deepEqual(layout.pages.map(function (p) { return p.page; }), [1, 2]);
  assert.equal(layout.pages[0].posts.length, 9);
  assert.equal(layout.pages[0].posts[0].number, 2);
  assert.equal(layout.pages[1].posts[0].number, 11);
  assert.equal(layout.endPage, 2);

  // startPage 5: replies start at the top of page 5, numbered from #41.
  var thread = Object.assign({}, snapshot(3).threads[0], { startPage: 5, endPage: 9 });
  var later = threadLayout(thread, 10);
  assert.equal(later.pages[0].page, 5);
  assert.equal(later.pages[0].posts[0].number, 41);
  assert.equal(later.endPage, 9);
  assert.equal(later.opOnFirstPage, false);
});

test('page list collapses long ranges', function () {
  assert.deepEqual(pageList(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageList(10, 20), [1, '…', 8, 9, 10, 11, 12, '…', 20]);
  assert.deepEqual(pageList(1, 20), [1, 2, 3, '…', 20]);
});

test('numToWord', function () {
  assert.equal(numToWord(10), 'Ten');
  assert.equal(numToWord('25'), 'Twenty-five');
});

// --- Forum BBCode -----------------------------------------------------------

test('forum BBCode: balanced tags and expected pieces', function () {
  var out = forumBBCode(snapshot(12));
  ['TABLE', 'TR', 'TD', 'TH', 'SIZE', 'COLOR', 'B', 'CENTER', 'RIGHT', 'SPOILER', 'ICODE'].forEach(function (tag) {
    var opens = (out.match(new RegExp('\\[' + tag + '(=[^\\]]*)?\\]', 'g')) || []).length;
    var closes = (out.match(new RegExp('\\[\\/' + tag + '\\]', 'g')) || []).length;
    assert.equal(opens, closes, tag + ' balanced');
  });
  assert.match(out, /Welcome to the Parahumans Online message boards\./);
  assert.match(out, /Discussion in 'Brockton Bay' started by Bagrat, Jan 1, 2011/);
  assert.match(out, /Page 2 of 2/);
  assert.match(out, /#13\[/); // 12 replies + OP
  assert.match(out, /\[B\]Original Poster\[\/B\]/);
  assert.match(out, /\[COLOR=#d64545\]Moderator\[\/COLOR\]/);
});

test('forum BBCode renders through our own parser into tables', function () {
  var html = bbcodeToHtml(forumBBCode(snapshot(3)), 'xf');
  // Header table + one table for page 1 (OP and 3 replies share it).
  assert.equal((html.match(/<table/g) || []).length, 2);
  // Each post is a header-bar row plus a content row.
  assert.equal((html.match(/<tr>/g) || []).length, 2 + 4 * 2);
  assert.doesNotMatch(html, /\[\/?(TABLE|TR|TD|TH)\]/);
});

test('forum BBCode: one table per page, OP pinned separately after page 1', function () {
  var out = forumBBCode(snapshot(12));
  // header + page 1 (OP + 9 replies) + page 2 (3 replies)
  assert.equal((out.match(/\[TABLE\]/g) || []).length, 3);

  var later = snapshot(3);
  later.threads[0].startPage = 4;
  later.threads[0].endPage = 6;
  var laterOut = forumBBCode(later);
  // header + pinned OP + page 4
  assert.equal((laterOut.match(/\[TABLE\]/g) || []).length, 3);
  assert.match(laterOut, /#31\[/);
});

test('forum BBCode stacked layout', function () {
  var out = forumBBCode(snapshot(2), { layout: 'stacked' });
  assert.match(out, /\[TH\]\[LEFT\]\[IMG width="40px"\]https:\/\/api\.dicebear\.com/);
  var letters = forumBBCode(snapshot(2), { layout: 'stacked', avatars: 'letter' });
  assert.match(letters, /\[TH\]\[LEFT\]\[COLOR=#[0-9a-f]{6}\]■/);
  assert.doesNotMatch(letters, /\[IMG/);
});

// --- AO3 ------------------------------------------------------------------

test('AO3 html: no style attributes, no forbidden tags, balanced divs', function () {
  var html = ao3Html(snapshot(12, { threads: [Object.assign(snapshot(12).threads[0], {
    op: { user: bagrat, date: 'Jan 1, 2011', content: '[color=red]red[/color] [quote=Tin]q[/quote] <b>raw</b>' }
  })] }), { bbToHtml: bbcodeToHtml });
  assert.doesNotMatch(html, /style=/);
  assert.doesNotMatch(html, /<(script|style|details|summary|iframe)/);
  assert.equal((html.match(/<div/g) || []).length, (html.match(/<\/div>/g) || []).length);
  assert.match(html, /&lt;b&gt;raw&lt;\/b&gt;/);
  assert.ok(html.includes('<span class="fm-num"><span class="fm-g-1"></span><span class="fm-g-3"></span></span>'));
  assert.ok(html.includes('fm-bn-mod"><span class="fm-x">(</span>Moderator<span class="fm-x">)</span>'));
  assert.ok(html.includes('fm-bn-op"><span class="fm-x">(</span>Original Poster<span class="fm-x">)</span>'));
});

test('Classic page list, with the last page included', function () {
  assert.deepEqual(classicPageList(1, 2), [1, 2]);
  assert.deepEqual(classicPageList(2, 2), [1, 2]);
  assert.deepEqual(classicPageList(10, 20), [1, 2, 3, '...', 8, 9, 10, 11, 12, '...', 18, 19, 20]);
  assert.deepEqual(classicPageList(3, 4), [1, 2, 3, 4]);
});

test('glyphs spell text with empty spans the work skin fills in', function () {
  assert.equal(glyphs('Ab 1'), '<span class="fm-g-ua"></span><span class="fm-g-b"></span><span class="fm-g-sp"></span><span class="fm-g-1"></span>');
  assert.equal(glyphs('é'), '');
  var css = workSkinCss('midnight');
  ['fm-g-ua', 'fm-g-b', 'fm-g-sp', 'fm-g-1', 'fm-g-ap', 'fm-g-qm'].forEach(function (cls) {
    assert.ok(css.includes('.' + cls + ':before { content: "'), cls);
  });
});

test('AO3 html never puts a newline between inline elements', function () {
  var html = ao3Html(snapshot(3), { bbToHtml: bbcodeToHtml });
  html.split('\n').forEach(function (line) {
    assert.match(line, /^<\/?(div|p|ul|h3|blockquote|table|dl|dd)\b/, 'line starts with a block tag: ' + line);
  });
});

test('work skin CSS uses only AO3-friendly constructs', function () {
  Object.keys(THEMES).forEach(function (name) {
    var css = workSkinCss(name);
    assert.doesNotMatch(css, /@media|@import|var\(|url\(|position:|!important/);
    assert.match(css, /\.fm-post \{/);
    // AO3 only keeps `content` when it's a single quoted string.
    (css.match(/(?<![-\w])content:[^;]*;/g) || []).forEach(function (decl) {
      assert.match(decl, /^content: "[^"]*";$/, decl);
    });
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  });
});

test('work skin survives css_parser, which AO3 uses to read it', function () {
  Object.keys(THEMES).forEach(function (name) {
    var css = workSkinCss(name);
    // css_parser splits a rule's body on ";" and treats a piece with a "(" but
    // no ")" after it as an unfinished url(...), so the declaration vanishes
    // and AO3 says "There don't seem to be any rules for ...".
    (css.match(/\{[^}]*\}/g) || []).forEach(function (body) {
      body.slice(1, -1).split(';').forEach(function (decl) {
        var open = decl.indexOf('(');
        assert.ok(open === -1 || decl.indexOf(')', open) !== -1, name + ': unmatched "(" in: ' + decl.trim());
      });
    });
    assert.ok(css.includes('.fm-g-lp:before { content: "\\28"; }'));
    assert.ok(css.includes('.fm-g-rp:before { content: "\\29"; }'));
    assert.ok(css.includes('.fm-g-am:before { content: "\\26"; }'));
    // Nothing AO3 might HTML-escape, inside or outside a string.
    assert.doesNotMatch(css.replace(/ > /g, ' '), /[&<>']/);
  });
});

// --- Forum BBCode polish (from a real XenForo test post) -------------------

test('sidebar posts get a header bar with date and post number', function () {
  var out = forumBBCode(snapshot(1));
  assert.match(out, /\[TR\]\n\[TH\]\[SIZE=2\]Jan 2, 2011\[\/SIZE\]\[\/TH\]\n\[TH\]\[RIGHT\]\[SIZE=2\]#2\[\/SIZE\]\[\/RIGHT\]\[\/TH\]/);
  assert.match(out, /\[IMG width="64px"\]https:\/\/api\.dicebear\.com\/9\.x\/initials\/png\?seed=Bagrat/);
});

test('names: plain for members, red for staff, struck grey for banned', function () {
  var banned = { id: '9', name: 'Troll', tags: [{ id: '17', name: 'Banned' }] };
  var snap = snapshot(1);
  snap.threads[0].replies[0].user = banned;
  var out = forumBBCode(snap);
  assert.match(out, /\[B\]\[COLOR=#d64545\]Bagrat\[\/COLOR\]\[\/B\]/); // Bagrat has a Moderator tag
  assert.match(out, /\[B\]\[COLOR=#8a8a8a\]\[S\]Troll\[\/S\]\[\/COLOR\]\[\/B\]/);
  assert.match(out, /\[COLOR=#8c8c8c\]Veteran Member\[\/COLOR\]/);
});

test('thread titles use HEADING and threads are split with HR', function () {
  var snap = snapshot(1);
  snap.threads.push(Object.assign({}, snap.threads[0], { name: 'Second thread' }));
  var out = forumBBCode(snap);
  assert.match(out, /\[HEADING=2\]Endbringer Thread\[\/HEADING\]/);
  assert.equal((out.match(/\[HR\]\[\/HR\]/g) || []).length, 1);
});

test('avatar URLs are stable, encoded, and use the palette for initials', function () {
  assert.equal(avatarUrl('Bagrat', 'initials'), avatarUrl('Bagrat', 'initials'));
  assert.match(avatarUrl('A B&C', 'thumbs'), /seed=A%20B%26C/);
  assert.match(avatarUrl('Bagrat', 'initials'), /backgroundColor=[0-9a-f]{6}&?/);
  assert.equal(avatarUrl('Bagrat', 'letter'), null);
  assert.match(avatarUrl('Bagrat', 'nonsense'), /\/initials\//);
});

test('parser: IMG width attribute and [HR][/HR]', function () {
  assert.equal(bbcodeToHtml('[IMG width="64px"]https://a.b/c.png[/IMG]', 'xf'),
    '<img class="bb-img" src="https://a.b/c.png" alt="" style="width: 64px" />');
  assert.doesNotMatch(bbcodeToHtml('[IMG width="64px"]https://a.b/c.png[/IMG]', 'ao3'), /style=/);
  assert.equal(bbcodeToHtml('a[HR][/HR]b', 'xf'), 'a<hr class="bb-hr" />b');
});

test('AO3: every avatar style is a CSS letter, so nothing shows when the skin is hidden', function () {
  ['thumbs', 'identicon', 'initials', 'letter'].forEach(function (style) {
    var html = ao3Html(snapshot(1), { avatars: style });
    assert.doesNotMatch(html, /<img|dicebear/);
    assert.ok(html.includes('<span class="fm-avatar fm-av' + avatarIndex('Bagrat') + '"><span class="fm-g-ub"></span></span>'));
  });
});

test('every theme has every colour, and the preview CSS uses it', function () {
  var keys = Object.keys(THEMES.midnight);
  assert.ok(Object.keys(THEMES).length >= 8);
  assert.ok(THEMES.blackgreen, 'blackened green theme exists');
  Object.keys(THEMES).forEach(function (name) {
    assert.deepEqual(Object.keys(THEMES[name]).sort(), keys.slice().sort(), name);
    assert.match(xfPreviewCss(name), new RegExp('background: ' + THEMES[name].page));
  });
});

// --- Private messages ------------------------------------------------------

var weld = { id: '3', name: 'Weld', tags: [] };

function conversation(op, replies) {
  return {
    name: 'About last night',
    isPrivate: true,
    location: 'ignored ► here',
    startPage: 4,
    endPage: 9,
    op: { user: op, date: 'Feb 1, 2011', content: 'Hey.' },
    replies: (replies || []).map(function (user, i) {
      return { user: user, date: 'Feb 1, 2011', content: 'Message ' + (i + 2) };
    })
  };
}

test('PM participants: order of first message, then the inbox owner', function () {
  var pm = conversation(bagrat, [weld, bagrat, weld]);
  assert.deepEqual(pmParticipants(pm, tin).map(function (u) { return u.name; }), ['Bagrat', 'Weld', 'Tin_Mother']);
  assert.deepEqual(pmParticipants(conversation(tin, [bagrat]), tin).map(function (u) { return u.name; }), ['Tin_Mother', 'Bagrat']);
});

test('PM headline: from the sender, or to everyone else when the inbox owner wrote first', function () {
  assert.equal(pmHeadline(conversation(bagrat, [tin]), tin), 'from Bagrat');
  assert.equal(pmHeadline(conversation(tin, [bagrat, weld]), tin), 'to Bagrat, Weld');
  assert.equal(pmHeadline(conversation(tin, []), tin), 'from Tin_Mother');
  assert.equal(pmHeadline(conversation(null, []), tin), 'from Placeholder_User');
});

test('forum BBCode: a conversation is one numbered table with no pages and no OP tag', function () {
  var snap = snapshot(2);
  snap.threads.push(conversation(bagrat, [tin, bagrat]));
  var out = forumBBCode(snap);
  var pmPart = out.substring(out.indexOf('Inbox'));
  assert.ok(pmPart.includes('[HEADING=2]✉ About last night[/HEADING]'));
  assert.ok(pmPart.includes('Private conversation started by Bagrat, Feb 1, 2011  ·  Participants: Bagrat, Tin_Mother'));
  assert.equal(pmPart.split('[TABLE]').length - 1, 1);
  assert.ok(pmPart.includes('#3['));
  assert.doesNotMatch(pmPart, /Original Poster|Page \d+ of|ignored/);
  // The thread before it still has its OP tag, and threads are split by HR.
  assert.match(out.substring(0, out.indexOf('Inbox')), /Original Poster/);
  assert.ok(out.includes('[HR][/HR]\n\n[SIZE=2][COLOR=#8c8c8c]Inbox'));
});

test('forum BBCode conversation stays balanced and renders', function () {
  var snap = snapshot(0);
  snap.threads = [conversation(tin, [bagrat])];
  ['sidebar', 'stacked'].forEach(function (layout) {
    var out = forumBBCode(snap, { layout: layout });
    ['TABLE', 'TR', 'TD', 'TH', 'HEADING'].forEach(function (tag) {
      var open = out.split('[' + tag + ']').length + out.split('[' + tag + '=').length - 2;
      var close = out.split('[/' + tag + ']').length - 1;
      assert.equal(open, close, layout + ' ' + tag);
    });
    assert.match(bbcodeToHtml(out, 'xf'), /<table class="bb-table">/);
  });
});

// --- AO3 without the work skin -------------------------------------------
//
// Classic PHO, transcribed separately from the template in
// app/documents/view/template.hbs (the preview branch), as AO3 can take it:
// align="center" for the centred ■ lines and a <dd> per indented reply,
// since AO3 drops style attributes. Post text is rendered the way a
// forum renders the Classic BBCode.
function classicPageString(index, startPage, endPage, perPage) {
  // thread-page-footer's pageString, in its HTML (preview) form.
  var offset = startPage === 1 ? 1 : 0;
  var current = Math.floor((index + offset) / perPage + startPage);
  var s = '';
  var i;
  if (current - 1 > 5) {
    s += '<u>1</u>, <u>2</u>, <u>3</u> ... <u>' + (current - 2) + '</u>, <u>' + (current - 1) + '</u>, ' + current;
  } else {
    for (i = 1; i < current; i++) { s += '<u>' + i + '</u>, '; }
    s += current;
  }
  if (endPage - current > 5) {
    s += ', <u>' + (current + 1) + '</u>, <u>' + (current + 2) + '</u> ... <u>' + (endPage - 2) + '</u>, <u>' + (endPage - 1) + '</u>, <u>' + endPage + '</u>';
  } else {
    for (i = current + 1; i <= endPage; i++) { s += ', <u>' + i + '</u>'; }
  }
  return s;
}

function classicReference(snap) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var name = function (u) { return u ? u.name : 'Placeholder_User'; };
  var words = { 10: 'Ten', 15: 'Fifteen', 20: 'Twenty', 25: 'Twenty-five', 2: 'Two' };
  // The first paragraph of the post runs on in the same paragraph.
  var post = function (lead, content) {
    var body = bbcodeToHtml(content || '', 'ao3', { lineBreaks: true });
    var m = /^<p>([\s\S]*?)<\/p>\n?/.exec(body);
    return m ? '<p>' + lead + m[1] + '</p>\n' + body.slice(m[0].length) : '<p>' + lead.replace(/<br \/>$|\s$/, '') + '</p>\n' + body;
  };
  var tags = function (u, isOp) {
    return (isOp ? ' (Original Poster)' : '') + ((u && u.tags) || []).map(function (t) { return ' (' + esc(t.name) + ')'; }).join('');
  };
  var out = ['<p align="center">■</p>',
    '<p><strong>Welcome to the Parahumans Online message boards.</strong><br />' +
    'You are currently logged in, <u>' + esc(name(snap.perspective)) + '</u><br />You are viewing:<br />' +
    ['Threads you have replied to', 'AND Threads that have new replies', 'OR private message conversations with new replies',
      'Thread OP is displayed.', words[snap.postsPerPage] + ' posts per page', 'Last ten messages in private message history.',
      'Threads and private messages are ordered chronologically.'].map(function (l) { return '• ' + l; }).join('<br />') + '</p>',
    '<p align="center">■</p>'];
  snap.threads.forEach(function (thread) {
    var op = thread.op;
    if (thread.isPrivate) {
      out.push('<p><strong>♦ Private Message ' + esc(pmHeadline(thread, snap.perspective)) + '</strong><br /><strong>Subject:</strong> ' + esc(thread.name) + '</p>');
      [op].concat(thread.replies).forEach(function (p) {
        out.push(post('<strong>' + esc(name(p.user)) + ':</strong> ', p.content));
      });
    } else {
      out.push(post('<strong>♦ Topic: ' + esc(thread.name) + '</strong><br /><strong>In: ' +
        ['Boards'].concat(thread.location.split('►').map(function (s) { return s.trim(); })).map(esc).join(' ► ') + '</strong><br />' +
        '<strong>' + esc(name(op.user)) + ' </strong>' + tags(op.user, true) + '<br />Posted On ' + op.classicDate + ':<br />', op.content));
      var sp = thread.startPage, pp = snap.postsPerPage, n = thread.replies.length;
      thread.replies.forEach(function (p, i) {
        var offset = sp === 1 ? 1 : 0;
        if (i === 0 || (sp === 1 ? (i + 1) % pp === 0 : i % pp === 0)) {
          out.push('<p><strong>(Showing page ' + Math.floor((i + offset) / pp + sp) + ' of ' + thread.endPage + ')</strong></p>');
          out.push('<dl>');
        }
        out.push('<dd>');
        out.push(post('<strong>►' + esc(name(p.user)) + ' </strong>' + tags(p.user, p.user && op.user && p.user.id === op.user.id) +
          '<br />Replied On ' + p.classicDate + ':<br />', p.content));
        out.push('</dd>');
        if (i === n - 1 || (sp === 1 ? (i + 2) % pp === 0 : (i + 1) % pp === 0)) {
          out.push('</dl>');
          out.push('<p><strong>End of Page.&nbsp;&nbsp;&nbsp;' + classicPageString(i, sp, thread.endPage, pp) + '</strong></p>');
        }
      });
    }
    out.push('<p align="center">■</p>');
  });
  // Classes and wrapper divs don't show without the skin either.
  return hiddenView(out.join('\n'));
}

// What AO3 renders once the work skin is gone: text the skin hides is back,
// and spans, classes and wrapper divs make no difference.
function hiddenView(html) {
  var prev;
  do { prev = html; html = html.replace(/<span[^>]*><\/span>/g, ''); } while (html !== prev);
  html = html.replace(/<\/?span[^>]*>/g, '').replace(/ class="[^"]*"/g, '').replace(/<\/?div>/g, '');
  return normalizeHtml(html);
}

// Whitespace the browser collapses, and one block per line.
function normalizeHtml(html) {
  return html.replace(/[ \t]+/g, ' ')
    .replace(/\s*(<br \/>)\s*/g, '$1')
    .replace(/\s*(<\/?(?:p|blockquote|ul|ol|li|dl|dd|div|table|tr|td|th|pre|h\d)\b[^>]*>)\s*/g, '\n$1\n')
    .split('\n').map(function (l) { return l.trim(); }).filter(Boolean).join('\n');
}

function classicSnapshot() {
  var snap = snapshot(13, { postsPerPage: 10 });
  var t = snap.threads[0];
  t.endPage = 2;
  t.op.classicDate = 'Jan 1st 2011';
  t.op.content = 'First post\nsecond line\n\n[b]bold[/b] & <things>\n[quote="Tin"]Quoted[/quote]\nAfter the quote';
  t.replies.forEach(function (p) { p.classicDate = 'Jan 2nd 2011'; });
  t.replies[2].content = '[quote]Starts with a quote[/quote]\nThen text';
  t.replies[4].content = '';
  t.replies[5].content = 'A list:\n[list][*]one[*]two[/list]';
  snap.threads.push(conversation(bagrat, [tin]));
  snap.threads[1].replies[0].content = 'Two\n\nparagraphs';
  return snap;
}

test('AO3 with the creator\'s style hidden is exactly Classic PHO', function () {
  var snap = classicSnapshot();
  var got = hiddenView(ao3Html(snap, { bbToHtml: bbcodeToHtml })).split('\n');
  var want = classicReference(snap).split('\n');
  want.forEach(function (line, i) { assert.equal(got[i], line, 'line ' + (i + 1)); });
  assert.equal(got.length, want.length);
});

test('AO3 hidden view: a long thread starting past page 1, and another forum name', function () {
  var snap = snapshot(25, { postsPerPage: 10, forumName: 'Spacebattles' });
  var t = snap.threads[0];
  t.startPage = 7; t.endPage = 20;
  t.op.classicDate = 'Jan 1st 2011';
  t.replies.forEach(function (p) { p.classicDate = 'Jan 2nd 2011'; });
  var got = hiddenView(ao3Html(snap, { bbToHtml: bbcodeToHtml }));
  assert.equal(got, classicReference(snap));
  assert.ok(got.includes('End of Page.&nbsp;&nbsp;&nbsp;<u>1</u>, <u>2</u>, <u>3</u> ... <u>5</u>, <u>6</u>, 7, <u>8</u>, <u>9</u> ... <u>18</u>, <u>19</u>, <u>20</u>'));
  // The other forum name only shows with the skin.
  assert.ok(ao3Html(snap).includes('<span class="fm-x">Parahumans Online</span><span class="fm-fname"><span class="fm-g-us"></span>'));
});

// AO3 rewrites chapter HTML on save (lib/paragraph_maker.rb in otwarchive):
// text or inline tags directly inside a div or blockquote get a new <p>, and
// block tags inside a <p> split it. Either would change the hidden view, so
// the output must give it nothing to do.
var AO3_BLOCKS = /^(p|div|blockquote|ul|ol|li|table|thead|tbody|tr|td|th|pre|h[1-6]|hr|dl|dt|dd|details|summary|center)$/;
var AO3_CONTAINERS = /^(div|blockquote|ul|ol|table|thead|tbody|tr|dl|dd|details)$/;

function ao3Rewrites(html) {
  var stack = ['#root'];
  var problems = [];
  var re = /<(\/?)([a-z0-9]+)\b[^>]*?(\/?)>|([^<]+)/gi;
  var m;
  while ((m = re.exec(html))) {
    var parent = stack[stack.length - 1];
    if (m[4] !== undefined) {
      if (m[4].trim() && (AO3_CONTAINERS.test(parent) || parent === '#root')) { problems.push('text in <' + parent + '>: ' + m[4].trim()); }
      if (/\n/.test(m[4]) && !(AO3_CONTAINERS.test(parent) || parent === '#root' || parent === 'pre')) { problems.push('newline inside <' + parent + '>'); }
      continue;
    }
    var tag = m[2].toLowerCase();
    if (m[1]) { stack.pop(); continue; }
    var block = AO3_BLOCKS.test(tag);
    if (!block && (AO3_CONTAINERS.test(parent) || parent === '#root')) { problems.push('<' + tag + '> directly in <' + parent + '>'); }
    if (block && stack.some(function (t) { return t === 'p' || !AO3_BLOCKS.test(t) && t !== '#root'; })) {
      problems.push('<' + tag + '> inside <' + stack.join('>') + '>');
    }
    if (!m[3] && tag !== 'br' && tag !== 'img' && tag !== 'hr') { stack.push(tag); }
  }
  return problems;
}

test('AO3 has nothing to rewrite in the chapter HTML', function () {
  var snap = classicSnapshot();
  snap.threads[0].replies[6].content = '[spoiler=Wild]Hidden[/spoiler]\n[code]x = 1[/code]\n[table][tr][td]a[/td][/tr][/table]\n[heading=2]Head[/heading]\n[center]mid[/center]\n[indent]in[/indent]\n[hr][/hr]\nend';
  assert.deepEqual(ao3Rewrites(ao3Html(snap, { bbToHtml: bbcodeToHtml })), []);
  assert.deepEqual(ao3Rewrites('<div>loose</div><p><div>x</div></p>'), ['text in <div>: loose', '<div> inside <#root>p>', 'text in <div>: x']);
});
