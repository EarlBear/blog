// rehype-table-scroll — wrap every content <table> in a horizontally scrollable div, so a table
// wider than a phone scrolls INSIDE the article instead of pushing the whole page sideways.
//
// WHY A PLUGIN AND NOT CSS ON THE POST. A markdown table (`| a | b |`) emits a bare <table> with
// nowhere to hang an overflow container — you cannot wrap it from markdown without abandoning the
// table syntax and hand-writing HTML. So the fix has to be structural, and it has to be automatic:
// the failure mode here is per-post and silent. /blog/life-without-earlbear/ shipped to the public
// site overflowing 202px at 375px, and one of the three causes was exactly this — an ordinary
// markdown table (`| Change | Build time |`) reaching 419px in a 359px column. Nothing warned,
// because a page that scrolls sideways still renders every word correctly on a desktop.
//
// Note the post ALSO hand-wrapped its RACI table in a .raci-scroll div and that one was fine —
// which is the whole argument for doing this centrally. The author who knew to reach for a wrapper
// reached for it once and missed the plain table three sections earlier.
//
// Tables already inside a scroll container are left alone (see SCROLL_PARENT_RE) so the hand-rolled
// wrappers that predate this plugin don't end up double-wrapped.

const SCROLL_PARENT_RE = /(^|-)scroll(-|$)/;

function classList(node) {
  const c = node?.properties?.className;
  return Array.isArray(c) ? c : typeof c === 'string' ? c.split(/\s+/) : [];
}

/** Is this node already a scroll container? Then its table is someone's deliberate handling. */
function isScrollWrapper(node) {
  return node?.type === 'element' && classList(node).some((c) => SCROLL_PARENT_RE.test(c));
}

export function rehypeTableScroll() {
  return (tree) => {
    const visit = (node, parentIsScroll) => {
      if (!node || !Array.isArray(node.children)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child?.type !== 'element') continue;

        if (child.tagName === 'table' && !parentIsScroll) {
          // Replace the table IN PLACE with div.table-scroll > table, preserving position so
          // surrounding prose order is untouched. The wrapper is tabbable (tabindex=0) and
          // labelled, because a scroll region that only a mouse can reach is an a11y regression
          // dressed up as a fix — keyboard users need to be able to focus and arrow it.
          node.children[i] = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              tabIndex: 0,
              role: 'region',
              'aria-label': 'Table, scrollable horizontally',
            },
            children: [child],
          };
          // Don't descend into the table — nested tables are not a thing we author.
          continue;
        }

        visit(child, isScrollWrapper(child));
      }
    };

    visit(tree, false);
  };
}
