// Tests for the framework-free output formats. Run with: node --test tests/node
import test from 'node:test';
import assert from 'node:assert/strict';
import { bbcodeToHtml, quoteAuthor } from '../../app/utils/bbcode.js';
import {
  forumBBCode, ao3Html, workSkinCss, threadLayout, pageList, numToWord, THEMES
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
  assert.equal((html.match(/<tr>/g) || []).length, 2 + 4);
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
  assert.match(out, /\[TH\]\[COLOR=#[0-9a-f]{6}\]■/);
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
  assert.match(html, /<span class="fm-num">#13<\/span>/);
  assert.match(html, /fm-bn-mod">Moderator/);
  assert.match(html, /fm-bn-op">Original Poster/);
});

test('AO3 html never puts a newline between inline elements', function () {
  var html = ao3Html(snapshot(3), { bbToHtml: bbcodeToHtml });
  html.split('\n').forEach(function (line) {
    assert.match(line, /^<\/?(div|p|ul|h3|blockquote|table)\b/, 'line starts with a block tag: ' + line);
  });
});

test('work skin CSS uses only AO3-friendly constructs', function () {
  Object.keys(THEMES).forEach(function (name) {
    var css = workSkinCss(name);
    assert.doesNotMatch(css, /@media|@import|var\(|url\(|position:|!important/);
    assert.match(css, /\.fm-post \{/);
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  });
});
