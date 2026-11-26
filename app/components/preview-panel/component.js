import Ember from 'ember';

export default Ember.Component.extend({
	classNameBindings: ['showPanel:preview-panel-show'],
	showPanel: null,
	format: null,

	heading: Ember.computed('format', 'showOutput', function() {
		var output = this.get('showOutput');
		switch (this.get('format')) {
			case 'forum':
				return output ? 'Forum BBCode Output' : 'Forum Preview (approximate)';
			case 'ao3':
				return output ? 'AO3 Work Skin + HTML' : 'AO3 Preview';
			default:
				return output ? 'BBCode Output' : 'Forum Preview';
		}
	})
});
