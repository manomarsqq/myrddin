import Ember from "ember";

// {{if (eq-str a b) 'active'}} - true when both values match as strings.
export function eqStr(params) {
  var a = params[0], b = params[1];
  return String(a === undefined || a === null ? '' : a) === String(b === undefined || b === null ? '' : b);
}

export default Ember.HTMLBars.makeBoundHelper(eqStr);
