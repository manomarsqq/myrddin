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
- Private message conversations (**Add Private Message**). They sit in the
  same list as threads, so they come out in the order you add them: a
  "♦ Private Message from …" block in Classic PHO and in AO3 with the skin
  hidden, an inbox conversation in Forum BBCode and styled AO3.
- Reorder posts by drag and drop.
- Post date based on previous posts.
- Support multiple pages.
- End page constrained with the start page and the number of posts in the thread.
- Colorize unique tags.
- Select the output text with one click for easy copying.
- Dark mode for the editor: the moon/sun button in the navbar. It follows your
  system setting until you pick one.
- Three output formats per interlude (see below): Classic PHO BBCode, Forum
  BBCode for SpaceBattles / Sufficient Velocity / Questionable Questing, and an
  AO3 forum layout (HTML + work skin).

###Output formats
Pick one under **Output Format** in the interlude's settings panel.

**Classic PHO.** The original plain BBCode layout.

**Forum BBCode (SB / SV / QQ).** XenForo 2 BBCode that lays the thread out like
a real forum. It uses only tags XenForo 2.2+ ships with (`TABLE`, `HEADING`,
`HR`, `IMG`, `SIZE`, `COLOR`, `ICODE`, `SPOILER`, `CENTER`, `LEFT`, `RIGHT`),
checked with a test post on a live XenForo forum:
- A forum header box with the welcome notice, and the "You are viewing" list
  folded into a spoiler.
- Breadcrumbs, the thread title as a real heading, and "Discussion in '…'
  started by …". Threads are separated by a rule.
- Page navigation with the page numbers as `[ICODE]` buttons.
- One table per page, so every post on that page lines up. Each post gets a
  shaded header bar.
  - *Sidebar*: the bar shows the date and post number. The avatar, username,
    Original Poster badge and user titles sit in a left column.
  - *Stacked*: the bar shows the avatar, username and titles, with the date and
    post number above the post. XenForo centres table cells vertically, so the
    sidebar column floats on long posts. Stacked avoids that and reads better
    on phones.
- Avatars: *Initials* (a coloured letter square like XenForo's defaults),
  *Identicon* or *Cartoon*. These are images from [DiceBear](https://www.dicebear.com/)
  and the same for a username every time. *Text* uses a big coloured letter
  and loads nothing.
- Usernames use the forum's normal colour, except staff (red) and banned users
  (grey, struck through). User titles are muted; Moderator, Verified and Banned
  titles keep their colours.

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
There are eight themes: Midnight, Graphite, Blackened Green, Ocean, Violet,
Crimson, Ember and Daylight. Each post has a narrow user column on the left,
on phones too (AO3 skins can't use media queries or grid).

With *Hide Creator's Style* turned on, and in AO3's downloads (which leave work
skins out), the chapter is Classic PHO. The chapter HTML is Classic's own
markup (the same paragraphs, `<br />` line breaks, bold and underline), and the
work skin rebuilds the forum from it:
- AO3 rewrites chapter HTML when you save it: text sitting straight in a
  `<div>` gets its own paragraph, which adds gaps Classic doesn't have. So
  every line is inside a `<p>` and AO3 has nothing to change.
- Classic-only text ("Posted On", "►", the brackets around user titles,
  "End of Page.") and its line breaks sit in `fm-x` spans and `fm-br` breaks
  that the skin hides.
- Classic indents the replies; on AO3 each reply is a `<dd>`, the one indent
  AO3 gives without a line beside it. It indents 3em (about 45px) where the
  Classic preview indents 30px, and that's the only visible difference.
- Forum-only text comes from the skin's `::before` rules, so it isn't there
  without the skin. AO3 only allows a fixed quoted string in `content`, so
  per-user text (avatar letters, post numbers, the forum name in the logo) is
  spelled out with empty spans, one class per character. One skin works for
  every interlude.
- AO3 avatars are always coloured letters. Image avatars would show up with
  the skin hidden, and AO3 skins can't load DiceBear's URLs.
- Private messages leave out per-message dates and user titles, which Classic
  doesn't print for them either.

The preview's **Hide creator's style** button shows what those readers see.

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
