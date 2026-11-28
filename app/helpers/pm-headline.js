import Ember from "ember";
import { pmHeadline } from '../utils/forum-format';

function plainUser(user) {
  if (!user || !user.get('id')) { return null; }
  return { id: user.get('id'), name: user.get('name') };
}

// {{pm-headline thread perspectiveUser thread.outputSignature}} gives
// "from Bagrat" or "to Bagrat, Weld". The signature is only there so the
// helper re-runs when a message's author changes.
export function pmHeadlineHelper(params) {
  var thread = params[0];
  if (!thread) { return ''; }
  var firstPost = thread.get('firstPost');
  var replies = thread.get('posts');
  return pmHeadline({
    op: { user: plainUser(firstPost && firstPost.get('user')) },
    replies: (replies ? replies.toArray() : []).map(function(post) {
      return { user: plainUser(post.get('user')) };
    })
  }, plainUser(params[1]));
}

export default Ember.HTMLBars.makeBoundHelper(pmHeadlineHelper);
