import Ember from 'ember';

var STORAGE_KEY = 'myrddin-dark-mode';

function readSaved() {
  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'on') { return true; }
    if (saved === 'off') { return false; }
  } catch (e) {
    // Storage blocked: fall through to the system setting.
  }
  return null;
}

// Navbar button that switches Myrddin's editor between light and dark.
// Until you click it, it follows the system's light/dark setting.
export default Ember.Component.extend({
  tagName: 'div',
  classNames: ['navbar-header', 'pull-right', 'dark-mode-toggle'],
  dark: false,

  setup: Ember.on('init', function() {
    var saved = readSaved();
    var systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.set('dark', saved === null ? systemDark : saved);
  }),

  applyTheme: Ember.on('didInsertElement', Ember.observer('dark', function() {
    Ember.$('body').toggleClass('theme-dark', !!this.get('dark'));
  })),

  actions: {
    toggle: function() {
      this.toggleProperty('dark');
      try {
        window.localStorage.setItem(STORAGE_KEY, this.get('dark') ? 'on' : 'off');
      } catch (e) {
        // Storage blocked: the choice lasts for this visit only.
      }
    }
  }
});
