define(function() {
'use strict';
var spv = require('spv');
var prefixValue = function(source) {
  if (!source) {
    return 'unk--'
  }

  var main_part = source[0]
  if (main_part == 'nest') {
    return ''
  }

  return main_part + '--'
}

return function(name, Constr, source) {
  var Result = spv.inh(Constr, {
    skip_code_path: true
  }, {
    hierarchy_name_source: source || null,
    hierarchy_name: prefixValue(source) + name
  })
  return Result
}
})
