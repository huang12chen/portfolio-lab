# Fictional Demos and Public Releases

[简体中文](zh-CN/demo-projects.md)

Read this when the user has authorized a fictional teaching portfolio, an interactive demonstration, or a distributable sample. It supplements the ordinary evidence-based portfolio workflow; it does not require every portfolio to become a demo package or bilingual site.

## Keep real-person and fictional modes distinct

For a real person, retain supported employment, contribution, work, and outcomes. Missing material is a gap, not permission to invent a career.

When fiction has been explicitly authorized, proceed within that scope without another routine approval gate. Label the persona, employment, business metrics, research, and customer or employer material that are invented. Treat simulated research as scenario assumptions rather than interviews or observed customer behavior. Put an overall disclosure where readers can find it and specific labels near ambiguous evidence. Do not transfer fictional statements into a real résumé, personal site, or factual case study.

A working demo can be real implementation work while its brand, data, and scenario remain fictional. Describe both accurately.

## Reuse an existing site in a separate copy

When a mature personal site is the starting point, preserve the original site and media in a backup and verify the expected files or checksums before adapting a separate copy. Reuse useful generic layout, tokens, controls, and motion selectively; replace the personal content with the authorized example.

Keep private authoring evidence separate from the distributable project. A public copy must not inherit personal data, unpublished media, credentials, account or site identifiers, analytics identities, deployment targets, or the original repository history. If a new public repository is requested, initialize it from the intended public files rather than copying the original `.git`. Preserve the original audience and hosting configuration; a demo build does not authorize replacing a personal site or publishing externally.

## Make the interaction inspectable

Choose a real browser prototype when an interaction helps readers evaluate the work. Make the primary operation actually work: editable inputs change output, filters change the corresponding cards, charts, and rows, and resets and local downloads perform their named actions.

Explain the capability boundary near the demo:

| Implementation | What to make clear |
| --- | --- |
| Local template | Output follows local rules or templates; no external model call is implied |
| Simulated dataset or scenario | Data is synthetic, with units, period, calculation, and forecast assumptions; no live account or observed business outcome is implied |
| Real service integration | State which service is actually connected and which authorized end-to-end operations were verified; configuration or a mock is not a completed live run |

Do not add fake model progress, fabricated research findings, or decorative results that appear to prove success. Synchronous local generation can finish immediately. Show loading, stopping, or cancellation only when actual work has the corresponding state. Use semantic, touch-usable controls and textual summaries for charts; do not turn undeduplicated event or account totals into unique people.

## Keep displayed and exported drafts aligned

When an input that determines a result changes, mark the existing result as a previous draft. Disable copying or downloading that stale result until it is rebuilt or intentionally restored. Do not silently export a default or earlier draft while displaying a newer one.

Tie display, copy, and download to the same current result. Repeated initialization must not add duplicate handlers. After cleanup and remount of a retained DOM node, preserve the current draft and dirty state consistently, or visibly reset both the controls and result. An older asynchronous clipboard or generation completion must not overwrite a newer mount's state.

Test that lifecycle against the actual copied or downloaded draft and the stale-result state, not merely listener counts. Report the tested scope.

## Adapt language and region where relevant

Choose languages and markets for the task; do not make English and Chinese compulsory for every project. When adding a locale, cover meaningful body copy, navigation, ARIA and control labels, status and error messages, date formatting, currency units, and the downloadable result as relevant.

Keep the current case and meaningful anchor when switching languages if an equivalent exists. Give a clear fallback for unavailable content rather than silently sending readers to an unrelated page. Distinguish interface language from market or currency; using one display currency for simulated regions must not imply a real exchange-rate conversion. Check long labels, mixed scripts, keyboard access, and route history in the selected locales.

## Prepare a maintainable public example

For an authorized open-source release, provide:

- Asset sources and applicable licenses or attribution, including transformed stock media. A downloadable image or copied component is not automatically licensed for redistribution.
- An English entry point for international users and instructions in the other languages relevant to the release. Describe installation, operation, limitations, and maintenance using portable paths.
- Screenshots captured from the actual running example, with the represented view or state identified. Keep browser evidence separate from unit or static checks; never use a fabricated screenshot as runtime proof.
- Deployment instructions matching the real output and chosen hosting route. Report local operation, a prepared package, and successful publication as different outcomes.
- An understandable example whose content, routes, assets, and demo logic can be changed without personal information or private authoring files.

Confirm public package contents before distribution. Add new rules only for demonstrated issues or a concrete release need; one sample's palette, persona, case count, industry, or technology choice does not define every portfolio.
