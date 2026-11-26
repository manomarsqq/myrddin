import Ember from 'ember';
import moment from 'moment';
import { bbcodeToHtml } from '../../utils/bbcode';
import { forumBBCode, ao3Html, workSkinCss, xfPreviewCss, DEFAULT_THEME, THEMES } from '../../utils/forum-format';

var PREVIEW_STYLE_ID = 'ao3-work-skin-preview';

function toArray(list) {
  if (!list) { return []; }
  return list.toArray ? list.toArray() : list;
}

function plainUser(user) {
  if (!user || !user.get('id')) { return null; }
  return {
    id: user.get('id'),
    name: user.get('name'),
    tags: toArray(user.get('tags')).map(function(tag) {
      return { id: tag.get('id'), name: tag.get('name') };
    })
  };
}

function forumDate(value) {
  if (!value) { return ''; }
  var date = moment(value, 'MM/DD/YYYY');
  return date.isValid() ? date.format('MMM D, YYYY') : value;
}

function plainPost(post) {
  if (!post) { return { user: null, date: '', content: '' }; }
  return {
    user: plainUser(post.get('user')),
    date: forumDate(post.get('postedOn')),
    content: post.get('content') || ''
  };
}

// AO3 prefixes every work skin selector with #workskin; do the same so the
// preview behaves like the archive.
export function scopeCss(css, scope) {
  return css.replace(/(^|\})(\s*)([^{}]+)\{/g, function(match, close, space, selectors) {
    var scoped = selectors.split(',').map(function(sel) {
      return scope + ' ' + sel.trim();
    }).join(', ');
    return close + space + scoped + ' {';
  });
}

export default Ember.Component.extend({
  classNames: ['interlude-output'],
  doc: null,
  showOutput: true,
  copied: null,

  format: Ember.computed.alias('doc.outputFormat'),
  isAo3: Ember.computed.equal('doc.outputFormat', 'ao3'),

  theme: Ember.computed('doc.forumTheme', function() {
    var theme = this.get('doc.forumTheme');
    return THEMES[theme] ? theme : DEFAULT_THEME;
  }),

  snapshot: Ember.computed('doc.outputSignature', function() {
    var doc = this.get('doc');
    if (!doc) { return null; }
    // Ember 1.x only starts watching a computed property's dependencies once
    // it has been read, so read the signature here or edits never show up.
    this.get('doc.outputSignature');
    return {
      title: doc.get('title'),
      forumName: doc.get('forumName'),
      postsPerPage: doc.get('postsPerPage'),
      perspective: plainUser(doc.get('user')),
      threads: toArray(doc.get('threads')).map(function(thread) {
        return {
          name: thread.get('name'),
          location: thread.get('location'),
          startPage: thread.get('startPage'),
          endPage: thread.get('endPage'),
          op: plainPost(thread.get('firstPost')),
          replies: toArray(thread.get('posts')).map(plainPost)
        };
      })
    };
  }),

  outputText: Ember.computed('snapshot', 'format', 'doc.bbLayout', 'doc.avatarStyle', function() {
    var snapshot = this.get('snapshot');
    if (!snapshot) { return ''; }
    var avatars = this.get('doc.avatarStyle');
    if (this.get('format') === 'ao3') {
      return ao3Html(snapshot, { bbToHtml: bbcodeToHtml, avatars: avatars });
    }
    return forumBBCode(snapshot, { layout: this.get('doc.bbLayout'), avatars: avatars });
  }),

  previewHtml: Ember.computed('outputText', 'format', function() {
    var text = this.get('outputText');
    var html = this.get('format') === 'ao3' ? text : bbcodeToHtml(text, 'xf');
    return Ember.String.htmlSafe(html);
  }),

  workSkin: Ember.computed('theme', function() {
    return workSkinCss(this.get('theme'));
  }),

  // Both previews' theme colours: the AO3 work skin (scoped the way AO3 scopes
  // it) and the XenForo preview palette.
  previewCss: Ember.computed('workSkin', 'theme', function() {
    return scopeCss(this.get('workSkin'), '.ao3-preview #workskin') + '\n' + xfPreviewCss(this.get('theme'));
  }),

  updatePreviewSkin: Ember.on('didInsertElement', Ember.observer('previewCss', function() {
    var style = document.getElementById(PREVIEW_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = PREVIEW_STYLE_ID;
      document.getElementsByTagName('head')[0].appendChild(style);
    }
    style.textContent = this.get('previewCss');
  })),

  removePreviewSkin: Ember.on('willDestroyElement', function() {
    var style = document.getElementById(PREVIEW_STYLE_ID);
    if (style) {
      style.parentNode.removeChild(style);
    }
  }),

  selectElement: function(id) {
    var el = document.getElementById(id);
    if (!el || !window.getSelection) { return false; }
    var range = document.createRange();
    range.selectNodeContents(el);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  },

  actions: {
    copyText: function(id) {
      if (!this.selectElement(id)) { return; }
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      if (ok) {
        this.set('copied', id);
        Ember.run.later(this, function() {
          if (!this.get('isDestroyed') && this.get('copied') === id) {
            this.set('copied', null);
          }
        }, 1500);
      }
    }
  },

  copiedSkin: Ember.computed.equal('copied', 'interludeWorkSkin'),
  copiedText: Ember.computed.equal('copied', 'interludeTextContent')
});
