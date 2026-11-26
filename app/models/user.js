import DS from 'ember-data';
import Ember from 'ember';

export default DS.Model.extend({
  name: DS.attr('string'),
  docs: DS.hasMany('document'),
  posts: DS.hasMany('post'),
  threads: DS.hasMany('headpost'),
  tags: DS.hasMany('tag'),

  // Changes whenever anything that shows up in the forum/AO3 output changes.
  // Used by the interlude-output component to know when to regenerate.
  outputSignature: Ember.computed('name', 'tags.@each.name', function() {
    var tags = (this.get('tags') || []).map(function(tag) {
      return tag.get('id') + ':' + tag.get('name');
    });
    return [this.get('id'), this.get('name')].concat(tags).join('|');
  })
});
