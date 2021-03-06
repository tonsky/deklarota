define(require => {
  const BrowseMap = require('js/libs/BrowseMap')
  const _updateRel = require('_updateRel')
  const animateMapChanges = require('js/libs/provoda/dcl/probe/animateMapChanges')

  function initBrowsing(app, states) {
    const map = BrowseMap.hookRoot(app, app.start_page, states)
    app.map = map

    initMapTree(app, app.start_page)

    const bwlev = BrowseMap.showInterest(map, [])
    BrowseMap.changeBridge(bwlev)

    return map
  }


  function initMapTree(app, start_page) {
  // app.useInterface('navi', needs_url_history && navi);
    _updateRel(app, 'navigation', [])
    _updateRel(app, 'start_page', start_page)

    app.map
      .on('bridge-changed', bwlev => {
        animateMapChanges(app, bwlev)
      }, app.getContextOptsI())

    return app.map
  }

  return initBrowsing
})
