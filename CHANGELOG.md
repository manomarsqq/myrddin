# Myrddin Changelog

### Myrddin 0.5.1
- Fix AO3 refusing to save the work skin ("There don't seem to be any rules
  for .fm-g-lp:before"). AO3's CSS parser reads a lone "(" as the start of a
  url(), so brackets and a few other characters in the skin are now written as
  CSS escapes. Copy the work skin again and save it.

### Myrddin 0.5.0
- Private message conversations: **Add Private Message** under the threads.
  A conversation has a subject, a first message and replies, each with its own
  sender and date. Classic PHO prints "♦ Private Message from …" (or "to …"
  when the interlude user wrote first) with one line per message. Forum BBCode
  and AO3 show it as an inbox conversation: subject, who started it, the
  participants, and the messages in one block with no pages.
- AO3 Forum output is now the Classic PHO transcript underneath. With *Hide
  Creator's Style* on, or in AO3's downloads, it reads exactly like Classic
  PHO; the work skin turns it into the forum. Paste the new work skin into AO3
  again. On AO3, avatars are always coloured letters, dates use the Classic
  format ("Apr 3rd 2011"), and the "Discussion in … started by …" line is gone.
- The AO3 preview has a **Hide creator's style** button.
- Classic PHO's "End of Page." list now includes the last page when you're on
  the page before it (it used to stop one short).

### Myrddin 0.4.0
- Forum BBCode reworked after a test post on a live XenForo forum: a shaded
  header bar on every post, image avatars, thread titles as `[HEADING]`, a
  rule between threads, plain usernames (red for staff, struck grey for
  banned), muted user titles and bigger page buttons.
- New Avatars setting: Initials, Identicon, Cartoon (DiceBear images) or Text.
- Four new themes: Blackened Green, Ocean, Violet and Crimson. The work skin
  and the forum preview now share one theme list.
- The forum preview now matches XenForo: full-width tables, centred header
  cells, vertically centred cells.
- Dark mode for the editor, with a toggle in the navbar.

### Myrddin 0.3.0
- New per-interlude **Output Format** setting: Classic PHO, Forum BBCode, AO3 Forum.
- Forum BBCode: XenForo 2 (SpaceBattles / SV / QQ) BBCode laid out as a forum
  thread, with table-based posts, avatars, user banners, post numbers, page
  navigation, and Sidebar or Stacked layout.
- AO3 Forum: chapter HTML plus a generated work skin (Midnight, Graphite, Ember
  and Daylight themes) that renders the interlude as a XenForo-style forum on
  AO3. It wraps to a mobile layout without media queries.
- BBCode in post bodies is rendered in the Forum and AO3 previews and in the
  AO3 output.
- Configurable forum name. Copy buttons for the output.
- Node unit tests for the formatters (`npm run test:formats`).
- `scripts/build-legacy.sh` builds the 2015 toolchain on modern machines, and a
  GitHub Actions workflow builds every push and deploys `master` to GitHub Pages.

### Mryddin 0.2.0
- Move the Output/Preview selector into the nav bar, so that they are more accessible.
- Add a select all button in the navbar to select everything in the output.
- Move the Preview panel toggle out of the collapse so that it's still visible on mobile devices.

### Myrddin 0.1.1
- Fixes a bug where clicking on the clear icon causes the search suggestion box
  to be removed.
- Implemented colored tags.

### Myrddin 0.1.0
- Contains 72 default users from Worm canon.
- Contains 20 default tags.
- Search users by user name and tags.
- Add/Remove new tags to users globally
- Output/Preview basic layout of the interlude.
- Automatically saves onto the local device as you edit.
- Support multiple threads.
- Reorder posts by drag and drop.
- Post date based on previous posts.
- Support multiple pages.
- End page constrained with the start page and the number of posts in the thread.
