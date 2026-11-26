# Mryddin

A PHO interlude generating wizard written with Ember.js!

[Check it out!](https://ujamer.github.io/myrddin/)

###Features:
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
- Colorize unique tags.
- Select the output text with one click for easy copying.
- Three output formats per interlude (see below): Classic PHO BBCode, Forum
  BBCode for SpaceBattles / Sufficient Velocity / Questionable Questing, and an
  AO3 forum layout (HTML + work skin).

###Output formats
Pick one under **Output Format** in the interlude's settings panel.

**Classic PHO.** The original plain BBCode layout.

**Forum BBCode (SB / SV / QQ).** XenForo 2 BBCode that lays the thread out like
a real forum. It uses only tags XenForo ships with (`TABLE`, `SIZE`, `COLOR`,
`ICODE`, `SPOILER`, `CENTER`, `RIGHT`):
- A forum header box with the welcome notice, and the "You are viewing" list
  folded into a spoiler.
- Breadcrumbs, the thread title, and "Discussion in '…' started by …".
- Page navigation with the page numbers as `[ICODE]` buttons.
- One table per page, so every post on that page lines up. *Sidebar* layout puts
  a big coloured letter avatar, the username, an Original Poster badge and the
  user's tags in a left column. *Stacked* layout puts them in a header row
  above the post, which reads better on phones.
- Post date and post number (#n) on every post. The numbers follow your start
  page and posts-per-page settings.

Switch the forum's post editor to BB code mode (the `[ ]` button) before
pasting. BBCode can't change the forum's own colours, so the theme setting only
changes the in-app preview. The preview is an approximation.

**AO3 Forum.** Makes the chapter look like a XenForo forum on AO3:
1. Copy the **work skin** into AO3 › Dashboard › Skins › My Work Skins › Create
   Work Skin. You only need one per theme.
2. On the work's edit page, choose that skin under *Associations › Select Work
   Skin*.
3. Switch the chapter text box to **HTML** and paste the **chapter text**.

You get a header bar with nav tabs, a notice box, breadcrumbs, page navigation,
avatars, staff/verified/banned banners, quotes, spoilers, lists and code blocks.
There are four themes: Midnight, Graphite, Ember and Daylight. AO3 strips
`style` attributes and doesn't allow media queries in work skins, so everything
is done with classes. The layout wraps with flexbox (allowed in skins since
2024): it shows a sidebar on desktop and the user strip above each post on
phones. With *Hide Creator's Style* turned on, it still reads as a plain
transcript.

Post bodies can use BBCode in all formats. The forum formats convert it.

###TODOs:
- BUGFIXES.
- Add a back to the top button on all posts to go to the head post.
- Add a link on the Responding user to scroll the output/preview to that post.
- Add a BBcode parser on the post content body in the Classic preview section
  (the Forum and AO3 formats already have one).
- Add a basic editor in the post content editor without impacting performance.
- Add Auto-resizing on the post content box.
- Make the post contents collapsible to make drag and drop more useful.
- Fix Current post date after reordering.
- Fix Later posts' dates after changing it in an earlier post.
- Support private messages.
- Performance tuning.
- Manage tags by documents.
- Add users and tags management page?
- Add acceptance and unit tests.
- Import/Export from gdrive/file so that edits on one device can be accessed from another. (Maaaaybe?)

###Building (2026)
The app is built with ember-cli 0.2.x, which does not run on modern Node. What
works:
1. Get a portable [Node 4.9.1](https://nodejs.org/dist/v4.9.1/) for running the
   build.
2. Install dependencies with a modern npm, pinned to the old package tree:
   `npm install --before=2016-06-01 --ignore-scripts --legacy-peer-deps`
   (change `git@github.com:` to `git+https://github.com/` for `ember-pikaday` if
   you have no GitHub SSH key).
3. Fetch node-sass's prebuilt binary with Node 4:
   `cd node_modules/node-sass && <node4>/node scripts/install.js`
4. Copy `node_modules/font-awesome` into
   `node_modules/ember-cli-font-awesome/node_modules/`, and `node_modules/ic-ajax`
   into `node_modules/ember-cli-ic-ajax/node_modules/`. Those addons expect
   npm 2's nested layout.
5. `npx bower install`, then `npx bower install jquery#1.11.3` (Ember 1.12
   rejects jQuery 1.12).
6. `<node4>/node node_modules/ember-cli/bin/ember build`

The forum/AO3 formatters (`app/utils/`) don't depend on Ember. You can test
them on any modern Node with `npm run test:formats`.
