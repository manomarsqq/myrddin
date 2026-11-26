import DS from 'ember-data';
import Ember from 'ember';

export default DS.Model.extend({
  title: DS.attr('string'),
  user: DS.belongsTo('user'),
  threads: DS.hasMany('thread',{embedded: 'always'}),
  postsPerPage: DS.attr('number'),

  // 'classic' (the original PHO BBCode), 'forum' (XenForo BBCode for
  // SpaceBattles/SV/QQ) or 'ao3' (HTML + work skin).
  outputFormat: DS.attr('string', { defaultValue: 'classic' }),
  forumName: DS.attr('string', { defaultValue: 'Parahumans Online' }),
  forumTheme: DS.attr('string', { defaultValue: 'midnight' }),
  bbLayout: DS.attr('string', { defaultValue: 'sidebar' }),

  isClassicFormat: Ember.computed('outputFormat', function() {
    var format = this.get('outputFormat');
    return !format || format === 'classic';
  }),

  // See user.outputSignature.
  outputSignature: Ember.computed('title', 'postsPerPage', 'forumName', 'user.outputSignature',
      'threads.@each.outputSignature', function() {
    var user = this.get('user');
    var threads = (this.get('threads') || []).map(function(thread) {
      return thread.get('outputSignature');
    });
    return [this.get('title'), this.get('postsPerPage'), this.get('forumName'),
      user ? user.get('outputSignature') : ''].concat(threads).join('|');
  })
});
