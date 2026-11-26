import DS from 'ember-data';
import Ember from 'ember';

export default DS.Model.extend({
  user: DS.belongsTo('user'),
  thread: DS.belongsTo('thread'),
  postedOn: DS.attr('string'),
  content: DS.attr('string'),

  // See user.outputSignature.
  outputSignature: Ember.computed('content', 'postedOn', 'user.outputSignature', function() {
    var user = this.get('user');
    return [this.get('content'), this.get('postedOn'), user ? user.get('outputSignature') : ''].join('|');
  })
});
