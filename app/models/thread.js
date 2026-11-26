import DS from 'ember-data';
import Ember from 'ember';

export default DS.Model.extend({
  name: DS.attr('string'),
  location: DS.attr('string'),
  startPage: DS.attr('number',{
    defaultValue: 1
  }),
  endPage: DS.attr('number',{
    defaultValue: 1
  }),
  doc: DS.belongsTo('document'),
  posts: DS.hasMany('post',{
    embedded: 'always',
    inverse: 'thread'
  }),

  firstPost: DS.belongsTo('headpost',{
    embedded: 'always'
  }),

  lastPost: Ember.computed('posts', 'firstPost', {
    get() {
      var replies = this.get('posts');
      if (replies.length === 0) {
        return this.get('firstPost');
      } else {
        return replies.get('lastObject');
      }
    }
  }),

  // See user.outputSignature.
  outputSignature: Ember.computed('name', 'location', 'startPage', 'endPage',
      'firstPost.outputSignature', 'posts.@each.outputSignature', function() {
    var firstPost = this.get('firstPost');
    var posts = (this.get('posts') || []).map(function(post) {
      return post.get('outputSignature');
    });
    return [this.get('name'), this.get('location'), this.get('startPage'), this.get('endPage'),
      firstPost ? firstPost.get('outputSignature') : ''].concat(posts).join('|');
  }),
});
