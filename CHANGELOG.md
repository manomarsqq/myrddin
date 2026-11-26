# Myrddin Changelog

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
