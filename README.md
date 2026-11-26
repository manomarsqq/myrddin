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

###Building and deploying (2026)
The app is built with ember-cli 0.2.x, which doesn't run on modern Node.
`scripts/build-legacy.sh` handles that. It installs the 2016 package tree with
a modern npm, swaps in 2015 releases of the plugins that broke later, restores
the nested layout two addons expect, pins jQuery to 1.11.3 for Ember 1.12, and
then builds with Node 4.

**Automatic:** `.github/workflows/deploy.yml` runs the formatter tests and the
build on every push and pull request. A push to `master` also publishes `dist/`
to the `gh-pages` branch. For the site to go live, turn on GitHub Pages once
under *Settings › Pages* with the source set to *Deploy from a branch*,
`gh-pages`, `/ (root)`.

**By hand** (Linux, macOS or Git Bash on Windows), with a modern Node on `PATH`
and a portable [Node 4.9.1](https://nodejs.org/dist/v4.9.1/):

    NODE4=/path/to/node-v4.9.1/bin/node bash scripts/build-legacy.sh production

Use `development` instead of `production` for an unminified build. The output
goes to `dist/`.

The forum/AO3 formatters (`app/utils/`) don't depend on Ember. You can test
them on any modern Node with `npm run test:formats`.
